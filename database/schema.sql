-- ============================================================
-- Magizhchi Box — PostgreSQL Schema
-- Run once against your magizhchi_box database.
-- Spring JPA (ddl-auto=update) will also auto-create tables,
-- but this script documents the authoritative structure.
-- ============================================================

CREATE DATABASE magizhchi_box;
\c magizhchi_box;

-- -------------------------------------------------------
-- Users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                  BIGSERIAL       PRIMARY KEY,
    email               VARCHAR(255)    NOT NULL UNIQUE,
    name                VARCHAR(255)    NOT NULL,
    password            VARCHAR(255)    NOT NULL,         -- BCrypt-hashed
    storage_used_bytes  BIGINT          NOT NULL DEFAULT 0,
    storage_quota_bytes BIGINT          NOT NULL DEFAULT 5368709120,  -- 5 GB
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- -------------------------------------------------------
-- Devices
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       VARCHAR(255)    NOT NULL,   -- UUID generated on frontend
    device_name     VARCHAR(255),
    device_type     VARCHAR(100),
    ip_address      VARCHAR(50),
    first_login_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active          BOOLEAN         NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX idx_devices_user_active ON devices(user_id, active);

-- -------------------------------------------------------
-- Folders (virtual directory tree)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255)    NOT NULL,
    parent_id   BIGINT          REFERENCES folders(id) ON DELETE CASCADE,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique folder name per parent level (NULLs are distinct in PG unique indexes)
CREATE UNIQUE INDEX uq_folder_name_per_parent
    ON folders(user_id, name, parent_id)
    WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX uq_folder_name_at_root
    ON folders(user_id, name)
    WHERE parent_id IS NULL;

CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);

-- -------------------------------------------------------
-- File metadata
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS file_metadata (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id           BIGINT          REFERENCES folders(id) ON DELETE SET NULL,
    original_file_name  VARCHAR(500)    NOT NULL,
    s3_key              VARCHAR(1000)   NOT NULL UNIQUE,
    content_type        VARCHAR(255)    NOT NULL,
    file_size_bytes     BIGINT          NOT NULL,
    uploaded_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted             BOOLEAN         NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP
);

CREATE INDEX idx_files_user_folder  ON file_metadata(user_id, folder_id, deleted);
CREATE INDEX idx_files_uploaded_at  ON file_metadata(uploaded_at DESC);
