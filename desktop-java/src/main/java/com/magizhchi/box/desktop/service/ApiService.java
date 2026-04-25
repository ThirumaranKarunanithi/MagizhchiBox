package com.magizhchi.box.desktop.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import okhttp3.*;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * All HTTP calls to the Magizhchi Box backend API.
 */
public class ApiService {

    private final AuthStore store;
    private final ObjectMapper mapper = new ObjectMapper();
    private final OkHttpClient client;

    public ApiService(AuthStore store) {
        this.store  = store;
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/login
     * Returns the full auth response JSON node.
     */
    public JsonNode login(String email, String password, String deviceId) throws IOException {
        ObjectNode body = mapper.createObjectNode();
        body.put("email",      email);
        body.put("password",   password);
        body.put("deviceId",   deviceId);
        body.put("deviceName", System.getProperty("os.name") + " — Desktop");
        body.put("deviceType", "Desktop");

        Request req = new Request.Builder()
                .url(api("/auth/login"))
                .post(jsonBody(body))
                .build();

        return execute(req);
    }

    // ── Folders ───────────────────────────────────────────────────────────────

    /**
     * POST /api/folders — creates a cloud folder.
     * Returns the created folder JSON (with "id" field).
     */
    public JsonNode createFolder(String name, String parentId) throws IOException {
        ObjectNode body = mapper.createObjectNode();
        body.put("name", name);
        if (parentId != null) body.put("parentId", Long.parseLong(parentId));

        Request req = new Request.Builder()
                .url(api("/folders"))
                .post(jsonBody(body))
                .header("Authorization", "Bearer " + store.getToken())
                .header("X-Device-ID",   store.getDeviceId())
                .build();

        return execute(req);
    }

    // ── Files ─────────────────────────────────────────────────────────────────

    /**
     * POST /api/files/upload — multipart upload.
     * @param file         local file to upload
     * @param folderId     cloud folder id (null = root)
     * @param relativePath path relative to sync root for mirroring
     */
    public JsonNode uploadFile(File file, String folderId, String relativePath) throws IOException {
        MultipartBody.Builder multipart = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(
                        "file",
                        file.getName(),
                        RequestBody.create(file, MediaType.parse("application/octet-stream"))
                );

        if (folderId != null)     multipart.addFormDataPart("folderId",     folderId);
        if (relativePath != null) multipart.addFormDataPart("relativePath", relativePath);

        // Use a client with no read/write timeout for large file uploads
        OkHttpClient uploadClient = client.newBuilder()
                .readTimeout(0,  TimeUnit.MILLISECONDS)
                .writeTimeout(0, TimeUnit.MILLISECONDS)
                .build();

        Request req = new Request.Builder()
                .url(api("/files/upload"))
                .post(multipart.build())
                .header("Authorization", "Bearer " + store.getToken())
                .header("X-Device-ID",   store.getDeviceId())
                .build();

        try (Response resp = uploadClient.newCall(req).execute()) {
            String bodyStr = resp.body() != null ? resp.body().string() : "{}";
            if (!resp.isSuccessful()) {
                JsonNode err = mapper.readTree(bodyStr);
                throw new IOException(err.path("message").asText("Upload failed: HTTP " + resp.code()));
            }
            return mapper.readTree(bodyStr);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String api(String path) {
        return store.getApiBase() + "/api" + path;
    }

    private RequestBody jsonBody(Object obj) throws IOException {
        return RequestBody.create(
                mapper.writeValueAsBytes(obj),
                MediaType.parse("application/json; charset=utf-8")
        );
    }

    private JsonNode execute(Request req) throws IOException {
        try (Response resp = client.newCall(req).execute()) {
            String bodyStr = resp.body() != null ? resp.body().string() : "{}";
            JsonNode json  = mapper.readTree(bodyStr);
            if (!resp.isSuccessful()) {
                throw new IOException(json.path("message").asText("Request failed: HTTP " + resp.code()));
            }
            return json;
        }
    }
}
