# Magizhchi Box — REST API Reference

Base URL: `http://localhost:8080/api`

All protected endpoints require:
- `Authorization: Bearer <jwt_token>`
- `X-Device-ID: <device_uuid>` (the same UUID stored in frontend localStorage)

---

## Authentication

### POST `/auth/signup`
Register a new user. Automatically creates the user folder on S3.

**Request body**
```json
{
  "name": "Thirumaran K",
  "email": "user@example.com",
  "password": "securePassword1",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": "MacBook Pro – Chrome",
  "deviceType": "Desktop"
}
```

**Response `201 Created`**
```json
{
  "token": "<jwt>",
  "userId": 1,
  "email": "user@example.com",
  "name": "Thirumaran K",
  "storageUsedBytes": 0,
  "storageQuotaBytes": 5368709120
}
```

---

### POST `/auth/login`
Authenticate an existing user and register/update their device.

**Request body** — same shape as signup (name optional)

**Response `200 OK`** — same shape as signup response

**Error `403 Forbidden`** — device limit (2) exceeded:
```json
{ "message": "Maximum device limit (2) reached. Please remove a device before logging in from this one." }
```

---

## Devices  *(protected)*

### GET `/devices`
List all devices (active and inactive) for the authenticated user.

**Response `200 OK`**
```json
[
  {
    "id": 1,
    "deviceId": "550e8400-...",
    "deviceName": "MacBook Pro – Chrome",
    "deviceType": "Desktop",
    "firstLoginAt": "2026-04-24T10:00:00",
    "lastLoginAt": "2026-04-24T18:30:00",
    "active": true
  }
]
```

---

### DELETE `/devices/{deviceId}`
Deactivate a device. The device can no longer use its token after this point.
The JWT filter checks `active = true` on every request.

**Response `204 No Content`**

---

## Files  *(protected)*

### POST `/files/upload`
Upload a file. `Content-Type: multipart/form-data`, field name `file`.

**Response `201 Created`**
```json
{
  "id": 7,
  "originalFileName": "report.pdf",
  "contentType": "application/pdf",
  "fileSizeBytes": 204800,
  "uploadedAt": "2026-04-24T12:00:00"
}
```

**Error `413 Payload Too Large`** — storage quota exceeded

---

### GET `/files`
List all non-deleted files for the authenticated user, newest first.

**Response `200 OK`** — array of file objects (same shape as upload response)

---

### GET `/files/{fileId}/download-url`
Generate a time-limited S3 pre-signed URL for downloading a file.

**Response `200 OK`**
```json
{
  "url": "https://s3.amazonaws.com/magizhchi-box-storage/user-1/uuid_report.pdf?X-Amz-..."
}
```
URL expires after `aws.s3.presigned-url-expiry-minutes` (default 60 min).

---

### DELETE `/files/{fileId}`
Soft-delete in DB + hard-delete from S3. Storage quota is reclaimed.

**Response `204 No Content`**

---

## Error format

All errors follow a consistent envelope:
```json
{
  "timestamp": "2026-04-24T12:00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Human-readable description"
}
```

Validation errors also include a `fieldErrors` map:
```json
{
  "fieldErrors": {
    "email": "Must be a valid email address",
    "password": "Password must be at least 8 characters"
  }
}
```
