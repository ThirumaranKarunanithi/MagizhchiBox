package com.magizhchi.box.desktop.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Persists login credentials and sync preferences to
 * ~/.magizhchi-box/config.json
 */
public class AuthStore {

    private static final String CONFIG_DIR  = System.getProperty("user.home") + "/.magizhchi-box";
    private static final String CONFIG_FILE = CONFIG_DIR + "/config.json";

    private final ObjectMapper mapper = new ObjectMapper();
    private ObjectNode data;

    public AuthStore() {
        load();
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    public String getToken()    { return getString("token"); }
    public String getDeviceId() { return getString("deviceId"); }
    public String getUserName() { return getString("userName"); }
    public String getUserEmail(){ return getString("userEmail"); }

    public void saveAuth(String token, String deviceId, String userName, String userEmail) {
        data.put("token",      token);
        data.put("deviceId",   deviceId);
        data.put("userName",   userName);
        data.put("userEmail",  userEmail);
        save();
    }

    public void clearAuth() {
        data.remove("token");
        data.remove("deviceId");
        data.remove("userName");
        data.remove("userEmail");
        save();
    }

    public boolean isLoggedIn() {
        String t = getToken();
        return t != null && !t.isBlank();
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    public String getSyncFolder() { return getString("syncFolder"); }

    public void setSyncFolder(String path) {
        data.put("syncFolder", path);
        save();
    }

    public String getApiBase() {
        String base = getString("apiBase");
        return (base != null && !base.isBlank()) ? base : "https://box.magizhchi.software";
    }

    public void setApiBase(String url) {
        data.put("apiBase", url);
        save();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private String getString(String key) {
        return data.has(key) ? data.get(key).asText(null) : null;
    }

    private void load() {
        try {
            File f = new File(CONFIG_FILE);
            if (f.exists()) {
                data = (ObjectNode) mapper.readTree(f);
            } else {
                data = mapper.createObjectNode();
            }
        } catch (IOException e) {
            data = mapper.createObjectNode();
        }
    }

    private void save() {
        try {
            Files.createDirectories(Path.of(CONFIG_DIR));
            mapper.writerWithDefaultPrettyPrinter().writeValue(new File(CONFIG_FILE), data);
        } catch (IOException e) {
            System.err.println("AuthStore: failed to save config — " + e.getMessage());
        }
    }
}
