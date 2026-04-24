# Magizhchi Box — Setup Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |
| AWS account | — |

---

## 1. PostgreSQL

```sql
CREATE DATABASE magizhchi_box;
```
Then run `database/schema.sql` against it (or let Spring Boot's `ddl-auto=update` create the tables automatically on first start).

---

## 2. AWS S3

1. Create an S3 bucket (e.g. `magizhchi-box-storage`) in your chosen region.
2. **Block all public access** — files are served only via pre-signed URLs.
3. Create an IAM user, then attach the policy below **directly to that IAM user**
   (IAM Console → Users → your user → Permissions → Add inline policy → JSON tab).

> ⚠️ **Do NOT paste this into the S3 Bucket Policy editor.**
> IAM identity policies have no `Principal`; bucket policies do.
> Pasting here will produce "Missing Principal" errors.

**IAM user policy (paste in IAM, not S3):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::magizhchi-box-storage/*"
    }
  ]
}
```

**Alternative — S3 Bucket Policy (if you prefer resource-based policy):**
Replace `ACCOUNT_ID` and `IAM_USER_NAME` with your actual values,
then paste this in S3 Console → your bucket → Permissions → Bucket policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:user/IAM_USER_NAME"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::magizhchi-box-storage/*"
    }
  ]
}
```

4. Note the **Access Key ID** and **Secret Access Key** of the IAM user.

---

## 3. Backend

```bash
cd backend

# Copy and fill in secrets
cp src/main/resources/application.properties src/main/resources/application-local.properties
# Edit application-local.properties with your DB credentials, JWT secret, and AWS keys

# Generate a JWT secret (256-bit base64):
openssl rand -base64 32

# Run
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The API starts on **http://localhost:8080**.

---

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

The React app starts on **http://localhost:5173**.
API calls are proxied to `localhost:8080` via Vite.

---

## 5. Environment Variables (Production)

For production, set these as environment variables instead of hardcoding in `.properties`:

| Variable | Description |
|----------|-------------|
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | DB password |
| `JWT_SECRET` | 256-bit base64 secret |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_REGION` | AWS region |
| `AWS_S3_BUCKET_NAME` | S3 bucket name |
| `CORS_ALLOWED_ORIGINS` | Frontend origin(s) |

---

## Project Structure

```
Magizhchi-Box/
├── backend/                  Spring Boot (Java 17, Maven)
│   └── src/main/java/com/magizhchi/box/
│       ├── config/           SecurityConfig, AwsS3Config
│       ├── controller/       AuthController, DeviceController, FileController
│       ├── dto/              Request/Response DTOs
│       ├── entity/           User, Device, FileMetadata
│       ├── exception/        GlobalExceptionHandler + custom exceptions
│       ├── repository/       JPA repositories
│       ├── security/         JwtAuthenticationFilter, UserDetailsServiceImpl
│       └── service/          AuthService, DeviceService, FileService, JwtService
├── frontend/                 React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── context/          AuthContext
│       ├── pages/            Login, Signup, Dashboard
│       ├── components/       Navbar, FileUpload, FileList, DeviceManager
│       └── services/         api.js, authService, fileService, deviceService
├── database/
│   └── schema.sql            PostgreSQL DDL
└── docs/
    ├── API.md                REST API reference
    └── SETUP.md              This file
```
