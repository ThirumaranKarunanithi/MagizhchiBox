package com.magizhchi.box.desktop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.magizhchi.box.desktop.MainApp;
import com.magizhchi.box.desktop.service.ApiService;
import com.magizhchi.box.desktop.service.AuthStore;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.layout.VBox;

import java.util.UUID;

public class LoginController {

    @FXML private TextField     emailField;
    @FXML private PasswordField passwordField;
    @FXML private Button        loginButton;
    @FXML private Label         errorLabel;
    @FXML private VBox          root;
    @FXML private ProgressIndicator spinner;

    private final AuthStore  store  = MainApp.getAuthStore();
    private final ApiService api    = new ApiService(store);

    @FXML
    private void initialize() {
        errorLabel.setVisible(false);
        spinner.setVisible(false);

        // Allow Enter key to trigger login
        passwordField.setOnAction(e -> handleLogin());
    }

    @FXML
    private void handleLogin() {
        String email    = emailField.getText().trim();
        String password = passwordField.getText();

        if (email.isEmpty() || password.isEmpty()) {
            showError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        Thread.ofVirtual().start(() -> {
            try {
                String deviceId = store.getDeviceId() != null
                        ? store.getDeviceId()
                        : UUID.randomUUID().toString();

                JsonNode resp = api.login(email, password, deviceId);

                String token     = resp.path("token").asText("");
                String userName  = resp.path("user").path("name").asText(email);
                String userEmail = resp.path("user").path("email").asText(email);

                store.saveAuth(token, deviceId, userName, userEmail);

                Platform.runLater(() -> {
                    setLoading(false);
                    try {
                        MainApp.showHome();
                    } catch (Exception ex) {
                        showError("Failed to open home screen: " + ex.getMessage());
                    }
                });
            } catch (Exception ex) {
                Platform.runLater(() -> {
                    setLoading(false);
                    showError(ex.getMessage() != null ? ex.getMessage() : "Login failed.");
                });
            }
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void setLoading(boolean loading) {
        loginButton.setDisable(loading);
        spinner.setVisible(loading);
        errorLabel.setVisible(false);
    }

    private void showError(String msg) {
        errorLabel.setText(msg);
        errorLabel.setVisible(true);
    }
}
