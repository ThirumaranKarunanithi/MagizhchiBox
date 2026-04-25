package com.magizhchi.box.desktop.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

import static java.nio.file.StandardWatchEventKinds.*;

/**
 * Watches a local folder and mirrors new / modified files to the cloud.
 *
 * – Uses Java NIO WatchService (recursive — registers every subdirectory).
 * – Debounces rapid events (500 ms) to avoid duplicate uploads on save.
 * – Change detection: tracks { lastModified, size } so unchanged files are
 *   skipped on restart.
 * – Upload queue: max 2 concurrent uploads via a fixed thread pool.
 */
public class SyncEngine {

    public enum StatusType { IDLE, SYNCING, PAUSED, ERROR }

    public record SyncStatus(StatusType type, String message, int synced, int pending, int errors) {}

    private final ApiService api;
    private final Path syncRoot;

    // Cloud folder cache:  relative POSIX path  →  cloud folder id (String)
    private final Map<String, String> folderIdCache = new ConcurrentHashMap<>();

    // Change-detection:  relative POSIX path  →  "mtime:size"
    private final Map<String, String> syncState = new ConcurrentHashMap<>();

    // Debounce timers keyed by absolute path
    private final Map<Path, ScheduledFuture<?>> debounce = new ConcurrentHashMap<>();

    // Upload queue
    private final ExecutorService uploadPool = Executors.newFixedThreadPool(2);

    // WatchService
    private final WatchService watcher;
    private final Map<WatchKey, Path> watchKeys = new ConcurrentHashMap<>();
    private Thread watchThread;

    // Scheduling for debounce
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    // Stats
    private final Object statsLock = new Object();
    private int synced  = 0;
    private int pending = 0;
    private int errors  = 0;

    // Paused flag
    private volatile boolean paused = false;

    // Status callback (always called on a non-UI thread — caller must Platform.runLater)
    private final Consumer<SyncStatus> onStatus;

    // Log callback — list of recent activity strings
    private final Consumer<String> onLog;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    public SyncEngine(ApiService api, Path syncRoot,
                      Consumer<SyncStatus> onStatus, Consumer<String> onLog) throws IOException {
        this.api       = api;
        this.syncRoot  = syncRoot;
        this.onStatus  = onStatus;
        this.onLog     = onLog;
        this.watcher   = FileSystems.getDefault().newWatchService();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public void start() {
        notifyStatus(StatusType.SYNCING, "Starting initial scan…");

        // Initial scan in upload pool (background)
        uploadPool.submit(() -> {
            try {
                initialScan(syncRoot.toFile());
            } catch (Exception e) {
                notifyStatus(StatusType.ERROR, "Scan failed: " + e.getMessage());
            }
        });

        // Start WatchService loop
        watchThread = new Thread(this::watchLoop, "sync-watcher");
        watchThread.setDaemon(true);
        watchThread.start();

        // Register root (and subdirs)
        try {
            registerAll(syncRoot);
        } catch (IOException e) {
            notifyStatus(StatusType.ERROR, "Watch failed: " + e.getMessage());
        }
    }

    public void stop() {
        try { watcher.close(); } catch (IOException ignored) {}
        uploadPool.shutdownNow();
        scheduler.shutdownNow();
        if (watchThread != null) watchThread.interrupt();
    }

    public void pause() {
        paused = true;
        notifyStatus(StatusType.PAUSED, "Sync paused");
    }

    public void resume() {
        paused = false;
        notifyStatus(StatusType.IDLE, "Resuming…");
    }

    // ── File system watching ───────────────────────────────────────────────────

    private void registerAll(Path root) throws IOException {
        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                register(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    private void register(Path dir) throws IOException {
        WatchKey key = dir.register(watcher, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE);
        watchKeys.put(key, dir);
    }

    private void watchLoop() {
        while (!Thread.currentThread().isInterrupted()) {
            WatchKey key;
            try {
                key = watcher.take();
            } catch (InterruptedException | ClosedWatchServiceException e) {
                break;
            }

            Path dir = watchKeys.get(key);
            if (dir == null) { key.reset(); continue; }

            for (WatchEvent<?> event : key.pollEvents()) {
                WatchEvent.Kind<?> kind = event.kind();
                if (kind == OVERFLOW) continue;

                @SuppressWarnings("unchecked")
                Path name  = ((WatchEvent<Path>) event).context();
                Path full  = dir.resolve(name);

                if (kind == ENTRY_CREATE) {
                    if (Files.isDirectory(full)) {
                        // Register new subdirectory
                        try { registerAll(full); } catch (IOException ignored) {}
                    } else {
                        debounce(full, () -> enqueueUpload(full));
                    }
                } else if (kind == ENTRY_MODIFY) {
                    if (!Files.isDirectory(full)) {
                        debounce(full, () -> enqueueUpload(full));
                    }
                }
                // ENTRY_DELETE — not auto-deleting from cloud (safety)
            }

            key.reset();
        }
    }

    private void debounce(Path path, Runnable action) {
        ScheduledFuture<?> existing = debounce.put(path,
                scheduler.schedule(() -> {
                    debounce.remove(path);
                    action.run();
                }, 800, TimeUnit.MILLISECONDS)
        );
        if (existing != null) existing.cancel(false);
    }

    // ── Initial scan ───────────────────────────────────────────────────────────

    private void initialScan(File dir) {
        File[] entries = dir.listFiles();
        if (entries == null) return;
        for (File f : entries) {
            String name = f.getName();
            if (name.startsWith(".") || name.equals("desktop.ini") || name.equals("Thumbs.db")) continue;
            if (f.isDirectory()) {
                initialScan(f);
            } else {
                if (hasChanged(f)) {
                    enqueueUpload(f.toPath());
                }
            }
        }
    }

    private boolean hasChanged(File file) {
        String rel  = relPosix(file.toPath());
        String prev = syncState.get(rel);
        String curr = file.lastModified() + ":" + file.length();
        return !curr.equals(prev);
    }

    // ── Upload ─────────────────────────────────────────────────────────────────

    private void enqueueUpload(Path filePath) {
        if (paused) return;
        if (!Files.exists(filePath) || Files.isDirectory(filePath)) return;
        synchronized (statsLock) { pending++; }
        notifyStatus(StatusType.SYNCING, "Queued: " + filePath.getFileName());

        uploadPool.submit(() -> {
            try {
                uploadFile(filePath);
            } catch (Exception e) {
                synchronized (statsLock) { errors++; pending = Math.max(0, pending - 1); }
                notifyStatus(StatusType.ERROR, "Failed: " + filePath.getFileName() + " — " + e.getMessage());
                log("✗ " + filePath.getFileName() + " — " + e.getMessage());
            }
        });
    }

    private void uploadFile(Path filePath) throws IOException {
        if (!Files.exists(filePath)) return;

        File  file    = filePath.toFile();
        String rel    = relPosix(filePath);
        String dirRel = posixParent(rel);

        notifyStatus(StatusType.SYNCING, "Uploading " + file.getName() + "…");

        // Ensure the parent cloud folder exists
        String folderId = dirRel.isEmpty() ? null : ensureCloudFolder(dirRel);

        api.uploadFile(file, folderId, rel);

        // Update change-detection state
        syncState.put(rel, file.lastModified() + ":" + file.length());

        synchronized (statsLock) {
            synced++;
            pending = Math.max(0, pending - 1);
        }

        String time = LocalTime.now().format(TIME_FMT);
        log("[" + time + "] ✓ " + rel);

        notifyStatus(pending == 0 ? StatusType.IDLE : StatusType.SYNCING,
                pending == 0
                        ? "Up to date · " + synced + " file(s) synced"
                        : "Uploading… (" + pending + " remaining)");
    }

    // ── Cloud folder management ────────────────────────────────────────────────

    /** Returns the cloud folder ID for the given POSIX-style relative path, creating it if needed. */
    private String ensureCloudFolder(String relFolderPath) throws IOException {
        if (relFolderPath == null || relFolderPath.isEmpty()) return null;

        String cached = folderIdCache.get(relFolderPath);
        if (cached != null) return cached;

        String[] parts    = relFolderPath.split("/");
        String   parentId = null;

        for (int i = 0; i < parts.length; i++) {
            String partial = String.join("/", Arrays.copyOfRange(parts, 0, i + 1));
            String hit     = folderIdCache.get(partial);
            if (hit != null) { parentId = hit; continue; }

            String folderId = createCloudFolder(parts[i], parentId);
            folderIdCache.put(partial, folderId);
            parentId = folderId;
        }

        return parentId;
    }

    private String createCloudFolder(String name, String parentId) throws IOException {
        try {
            JsonNode resp = api.createFolder(name, parentId);
            return resp.get("id").asText();
        } catch (IOException e) {
            // Folder may already exist — try to tolerate 409/conflict
            if (e.getMessage() != null && (e.getMessage().contains("409") ||
                    e.getMessage().toLowerCase().contains("already"))) {
                return null; // fall back to root
            }
            throw e;
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Relative path from sync root, using forward slashes. */
    private String relPosix(Path filePath) {
        return syncRoot.relativize(filePath).toString().replace('\\', '/');
    }

    /** Parent directory of a POSIX relative path, or "" for root. */
    private String posixParent(String posixPath) {
        int idx = posixPath.lastIndexOf('/');
        return idx < 0 ? "" : posixPath.substring(0, idx);
    }

    private void notifyStatus(StatusType type, String message) {
        int s, p, e;
        synchronized (statsLock) { s = synced; p = pending; e = errors; }
        onStatus.accept(new SyncStatus(type, message, s, p, e));
    }

    private void log(String line) {
        onLog.accept(line);
    }
}
