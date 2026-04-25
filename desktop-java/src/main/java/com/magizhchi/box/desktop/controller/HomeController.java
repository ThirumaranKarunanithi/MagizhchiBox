package com.magizhchi.box.desktop.controller;

import com.magizhchi.box.desktop.MainApp;
import com.magizhchi.box.desktop.service.ApiService;
import com.magizhchi.box.desktop.service.AuthStore;
import com.magizhchi.box.desktop.service.SyncEngine;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.stage.DirectoryChooser;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;

public class HomeController {

    // ── Status bar ─────────────────────────────────────────────────────────────
    @FXML private Circle  statusDot;
    @FXML private Label   statusLabel;

    // ── Folder bar ─────────────────────────────────────────────────────────────
    @FXML private Label  folderPathLabel;
    @FXML private Button changeFolderButton;

    // ── Stats ──────────────────────────────────────────────────────────────────
    @FXML private Label syncedCount;
    @FXML private Label pendingCount;
    @FXML private Label errorsCount;

    // ── Controls ───────────────────────────────────────────────────────────────
    @FXML private Button pauseResumeButton;
    @FXML private Button logoutButton;

    // ── Activity log ───────────────────────────────────────────────────────────
    @FXML private ListView<String> activityList;

    // ── User info ──────────────────────────────────────────────────────────────
    @FXML private Label userNameLabel;
    @FXML private Label userEmailLabel;

    private final AuthStore  store = MainApp.getAuthStore();
    private final ApiService api   = new ApiService(store);

    private SyncEngine syncEngine;
    private boolean    isPaused = false;

    private final ObservableList<String> logLines = FXCollections.observableArrayList();

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    @FXML
    private void initialize() {
        activityList.setItems(logLines);

        userNameLabel.setText(store.getUserName() != null ? store.getUserName() : "");
        userEmailLabel.setText(store.getUserEmail() != null ? store.getUserEmail() : "");

        String syncFolder = store.getSyncFolder();
        if (syncFolder != null) {
            folderPathLabel.setText(syncFolder);
            startSyncEngine(Path.of(syncFolder));
        } else {
            setStatus(SyncEngine.StatusType.IDLE, "Choose a folder to start syncing");
            folderPathLabel.setText("No folder selected");
        }
    }

    // ── Folder selection ───────────────────────────────────────────────────────

    @FXML
    private void handleChooseFolder() {
        DirectoryChooser chooser = new DirectoryChooser();
        chooser.setTitle("Select Magizhchi Box Sync Folder");

        String current = store.getSyncFolder();
        if (current != null) chooser.setInitialDirectory(new File(current));

        File chosen = chooser.showDialog(MainApp.getPrimaryStage());
        if (chosen == null) return;

        stopSyncEngine();

        store.setSyncFolder(chosen.getAbsolutePath());
        folderPathLabel.setText(chosen.getAbsolutePath());
        logLines.clear();

        startSyncEngine(chosen.toPath());
    }

    // ── Sync engine lifecycle ─────────────────────────────────────────────────

    private void startSyncEngine(Path root) {
        try {
            syncEngine = new SyncEngine(
                    api, root,
                    status -> Platform.runLater(() -> applyStatus(status)),
                    line  -> Platform.runLater(() -> appendLog(line))
            );
            syncEngine.start();
            pauseResumeButton.setDisable(false);
        } catch (IOException e) {
            setStatus(SyncEngine.StatusType.ERROR, "Cannot watch folder: " + e.getMessage());
            pauseResumeButton.setDisable(true);
        }
    }

    private void stopSyncEngine() {
        if (syncEngine != null) {
            syncEngine.stop();
            syncEngine = null;
        }
    }

    // ── Status display ─────────────────────────────────────────────────────────

    private void applyStatus(SyncEngine.SyncStatus s) {
        setStatus(s.type(), s.message());
        syncedCount.setText(String.valueOf(s.synced()));
        pendingCount.setText(String.valueOf(s.pending()));
        errorsCount.setText(String.valueOf(s.errors()));
    }

    private void setStatus(SyncEngine.StatusType type, String message) {
        statusLabel.setText(message);
        switch (type) {
            case SYNCING -> { statusDot.setFill(Color.web("#0EA5E9")); }
            case IDLE    -> { statusDot.setFill(Color.web("#22C55E")); }
            case PAUSED  -> { statusDot.setFill(Color.web("#F59E0B")); }
            case ERROR   -> { statusDot.setFill(Color.web("#EF4444")); }
        }
    }

    private void appendLog(String line) {
        logLines.add(0, line);          // newest at top
        if (logLines.size() > 200) logLines.remove(logLines.size() - 1);
    }

    // ── Controls ───────────────────────────────────────────────────────────────

    @FXML
    private void handlePauseResume() {
        if (syncEngine == null) return;
        if (isPaused) {
            syncEngine.resume();
            pauseResumeButton.setText("Pause");
            isPaused = false;
        } else {
            syncEngine.pause();
            pauseResumeButton.setText("Resume");
            isPaused = true;
        }
    }

    @FXML
    private void handleLogout() {
        stopSyncEngine();
        store.clearAuth();
        try {
            MainApp.showLogin();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ── Window close cleanup ──────────────────────────────────────────────────

    /**
     * Called by MainApp if it needs to clean up before exit.
     * Not wired automatically — kept for future use.
     */
    public void onShutdown() {
        stopSyncEngine();
    }
}
