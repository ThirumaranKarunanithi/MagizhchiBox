package com.magizhchi.box.desktop;

import com.magizhchi.box.desktop.service.AuthStore;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.stage.Stage;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.event.ActionListener;
import java.net.URL;
import java.util.Objects;

public class MainApp extends Application {

    private static Stage primaryStage;
    private static final AuthStore authStore = new AuthStore();
    private TrayIcon trayIcon;

    @Override
    public void start(Stage stage) throws Exception {
        primaryStage = stage;

        // Keep the JVM alive when the window is hidden (tray mode)
        Platform.setImplicitExit(false);

        // App icon
        URL iconUrl = getClass().getResource("/images/logo.png");
        if (iconUrl != null) {
            stage.getIcons().add(new Image(iconUrl.toExternalForm()));
        }

        stage.setTitle("Magizhchi Box");
        stage.setResizable(false);

        // Install system tray
        setupTray(stage);

        // Show login or home depending on saved session
        if (authStore.isLoggedIn() && authStore.getSyncFolder() != null) {
            showHome();
        } else {
            showLogin();
        }

        stage.show();
    }

    // ── Navigation helpers ─────────────────────────────────────────────────────

    public static void showLogin() throws Exception {
        loadScene("/fxml/Login.fxml", 420, 540);
    }

    public static void showHome() throws Exception {
        loadScene("/fxml/Home.fxml", 500, 640);
    }

    private static void loadScene(String fxml, double w, double h) throws Exception {
        FXMLLoader loader = new FXMLLoader(MainApp.class.getResource(fxml));
        Scene scene = new Scene(loader.load(), w, h);
        URL css = MainApp.class.getResource("/css/styles.css");
        if (css != null) scene.getStylesheets().add(css.toExternalForm());
        primaryStage.setScene(scene);
        primaryStage.setWidth(w);
        primaryStage.setHeight(h);
        primaryStage.centerOnScreen();
    }

    public static AuthStore getAuthStore() { return authStore; }
    public static Stage  getPrimaryStage() { return primaryStage; }

    // ── System tray ────────────────────────────────────────────────────────────

    private void setupTray(Stage stage) {
        if (!SystemTray.isSupported()) return;

        // Load a 16×16 AWT image for the tray
        java.awt.Image trayImg;
        try {
            URL url = getClass().getResource("/images/logo.png");
            trayImg = (url != null)
                    ? ImageIO.read(url).getScaledInstance(16, 16, java.awt.Image.SCALE_SMOOTH)
                    : new java.awt.image.BufferedImage(16, 16, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        } catch (Exception e) {
            trayImg = new java.awt.image.BufferedImage(16, 16, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        }

        PopupMenu menu = new PopupMenu();

        MenuItem openItem = new MenuItem("Open Magizhchi Box");
        ActionListener showWindow = ev -> Platform.runLater(() -> {
            stage.show();
            stage.toFront();
        });
        openItem.addActionListener(showWindow);

        MenuItem quitItem = new MenuItem("Quit");
        quitItem.addActionListener(ev -> {
            SystemTray.getSystemTray().remove(trayIcon);
            Platform.exit();
            System.exit(0);
        });

        menu.add(openItem);
        menu.addSeparator();
        menu.add(quitItem);

        trayIcon = new TrayIcon(trayImg, "Magizhchi Box", menu);
        trayIcon.setImageAutoSize(true);
        // Double-click → show window
        trayIcon.addActionListener(showWindow);

        try {
            SystemTray.getSystemTray().add(trayIcon);
        } catch (AWTException e) {
            System.err.println("Tray: " + e.getMessage());
        }

        // Closing window hides to tray instead of exiting
        stage.setOnCloseRequest(e -> {
            e.consume();
            stage.hide();
        });
    }

    // ── Entry point ────────────────────────────────────────────────────────────

    public static void main(String[] args) {
        // Required for java.awt on some platforms when JavaFX is present
        System.setProperty("java.awt.headless", "false");
        launch(args);
    }
}
