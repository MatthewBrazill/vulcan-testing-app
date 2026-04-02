# Vulcan Testing App — Project Reference

A polyglot microservices application for mythology-focused note-taking. Built primarily as a learning/demo platform to explore multiple languages, observability tools (Datadog), and modern infrastructure patterns (Kubernetes + Docker Compose hybrid).

---

## Architecture Overview

**Deployment model:** Hybrid. Backend services run in Kubernetes; databases and supporting infra run in Docker Compose. An NGINX reverse proxy bridges external traffic from Docker into the Kubernetes cluster via NodePort.

**Request path:**
```
Browser (443)
  → NGINX vulcan-proxy (Docker, port 443)
  → Vulcan [K8s NodePort 32100] (Java/Spring Boot, main app)
      ├─ Authenticator [K8s] (Python/FastAPI)  — auth checks
      ├─ User-Manager [K8s] (Node/Express)     — user CRUD
      ├─ God-Manager [K8s] (Go/Gin)            — god CRUD
      ├─ Delphi [K8s] (Python/FastAPI)         — LLM descriptions
      └─ Scribe [K8s+Docker] (Node/Express)    — note retrieval
```

**Async data flow:**
```
Vulcan → Kafka (user-notes topic)
Delphi → OpenAI (GPT-4o-mini) → Kafka (god-notes topic)
Kafka → Scribe → notes-database (MongoDB)
```

---

## Services

### Vulcan — Java 17 / Spring Boot 3.1.2
- **Role:** Main application backend, serves HTML templates, orchestrates all other services
- **Port:** 443 (HTTPS)
- **K8s NodePort:** 32100
- **Session storage:** Redis sidecar in same pod (`localhost:6379`), 86400s TTL, SameSite=strict
- **Templating:** Mustache (Spring Boot integration), templates in `/services/frontend/pages/`, partials in `/services/frontend/partials/`
- **Key dependencies:** Spring Session + Redis, MongoDB driver, Kafka client, Log4j2, Password4j, Gson
- **Datadog:** Java agent (`-javaagent`), APM + profiling + AppSec + IAST + DI enabled
- **K8s resources:** 1.5GB memory, 0.2 CPU
- **Source:** `/services/vulcan/src/vulcan/`
  - `App.java` — entry point
  - `controllers/` — Gods, Users, Storage, Utility, Authenticate endpoints

### God-Manager — Go 1.25 / Gin
- **Role:** CRUD for god entities, backed by MongoDB
- **Port:** 443 (HTTPS)
- **Endpoints:** `POST /create`, `/get`, `/search`, `/update`, `/delete`; `GET /health`
- **Database:** god-database (MongoDB)
- **Datadog:** Orchestrion (compile-time auto-instrumentation), profiling enabled
- **K8s resources:** 128MB memory, 0.05 CPU
- **Source:** `/services/god-manager/god-manager/`
  - `main.go`, `router.go`, `gods.go`, `databases.go`

### User-Manager — Node.js 18 / Express 4
- **Role:** User account CRUD
- **Port:** 443 (HTTPS)
- **Endpoints:** `POST /create`, `/get`, `/delete`; `GET /all`, `/health`
- **Database:** user-database (PostgreSQL `vulcan_users`)
- **Datadog:** dd-trace, profiling enabled
- **K8s resources:** 256MB memory, 0.05 CPU
- **Source:** `/services/user-manager/user-manager/app.js`

### Authenticator — Python 3.12 / FastAPI + Uvicorn
- **Role:** Password and API key authentication
- **Port:** 443 (HTTPS)
- **Endpoints:** `POST /authenticate`, `POST /authorize`, `GET /health`
- **Auth details:**
  - Validates username+password against user-database with bcrypt + pepper
  - Also validates API keys
  - Returns permission levels
  - Pepper from `PASSWORD_PEPPER` env var (Kubernetes secret)
- **Database:** user-database (PostgreSQL), uses asyncpg
- **Datadog:** ddtrace, profiling, log injection
- **K8s resources:** 256MB memory, 0.3 CPU
- **Source:** `/services/authenticator/authenticator/`
  - `main.py`, `auth.py`

### Delphi — Python 3.12 / FastAPI
- **Role:** LLM service — generates god descriptions via OpenAI GPT-4o-mini, publishes to Kafka
- **Port:** 443 (HTTPS)
- **Endpoints:** `POST /describe` (async, returns 202), `GET /health`
- **External dependency:** OpenAI API (`OPENAI_API_KEY` from Kubernetes secret)
- **Kafka:** Publishes to `god-notes` topic at `notes-queue.vulcan-application.svc.cluster.local:9092`
- **Datadog:** ddtrace + LLMObs (`DD_LLMOBS_ENABLED=1`), profiling
- **K8s resources:** 384MB memory, 0.05 CPU
- **Source:** `/services/delphi/delphi/`
  - `main.py`, `delphi.py`

### Scribe — Node.js 18 / Express + KafkaJS
- **Role:** Kafka consumer — processes notes from `user-notes` and `god-notes` topics, stores in MongoDB
- **Port:** 443 (HTTPS)
- **Kafka:** Subscribes to both `user-notes` and `god-notes`; auto-creates topics if missing
- **Databases:** Reads user-database (PostgreSQL), writes to notes-database (MongoDB)
- **Datadog:** dd-trace, data streams monitoring enabled, profiling
- **K8s resources:** 256MB memory, 0.05 CPU
- **Source:** `/services/scribe/scribe/`
  - `app.js` — Kafka consumer + Express setup
  - `handlers.js` — message processing
  - `notes.js` — notes logic

---

## Data Stores

| Service | Type | Container | Purpose |
|---------|------|-----------|---------|
| god-database | MongoDB | Docker | God entity data |
| notes-database | MongoDB | Docker | User notes + LLM descriptions |
| user-database | PostgreSQL 15 | Docker | Users, credentials, API keys |
| vulcan-sessions | Redis | K8s sidecar in Vulcan pod | Session storage |

### Database Schema Notes
- **user-database** PostgreSQL DB name: `vulcan_users`
  - Tables: `users`, `apikeys`
  - Auth mode: trust (dev)
- **Databases** have Datadog monitoring users configured for DBM (Database Monitoring)

---

## Message Queue

**Notes-Queue** — Apache Kafka 3.7.2 (KRaft mode, no ZooKeeper)
- **Internal (K8s):** `notes-queue.vulcan-application.svc.cluster.local:9092`
- **External (Docker):** `pupkube:32200` (NodePort 32200)
- **Topics:** `user-notes`, `god-notes`
- **JMX:** Port 9091, used for Datadog monitoring

---

## Frontend

- **Location:** `/services/frontend/`
- **Templates:** Mustache HTML in `/pages/` with partials in `/partials/` (footer, head, nav)
- **Statics:** CSS, JS (minified with Closure Compiler), images in `/statics/`
- **Source JS:** Unminified source in `/javascript/` (minified during build)
- **Source maps** are uploaded to Datadog during CI/CD build

---

## Networking & TLS

- **All services run on port 443 HTTPS** with self-signed certificates
- Certs stored per service at `/services/[name]/certificate/cert.pem` and `key.pem`
- Vulcan imports all service certs into its Java truststore at startup
- **K8s service discovery:** `[service-name].vulcan-application.svc.cluster.local`
- **Docker networking:** Services on `vulcan_app` network; `pupkube` is external network bridging to K8s

---

## Kubernetes Configuration

- **Namespace:** `vulcan-application`
- **Manifest:** `/deployment.yaml` (854 lines)
- **Secrets:** `/secrets.yaml`
  - `datadog-api-key`
  - `vulcan-secrets`: `OPENAI_API_KEY`, `PASSWORD_PEPPER`, `SESSION_KEY`
- **NodePorts:**
  - 32100 → Vulcan (HTTPS)
  - 32200 → Kafka (external)

---

## Docker Compose

- **File:** `/docker-compose.yaml`
- **Services:** scribe, vulcan-proxy, god-database, notes-database, user-database
- **Note:** Scribe and User-Manager run in both K8s AND Docker (hybrid dual deployment)

---

## CI/CD Pipeline

- **File:** `/.github/workflows/cicd.yaml`
- **Runner:** `pupmac-runner` (custom self-hosted)
- **Trigger:** Push to main, pull requests
- **Jobs:**
  - Build + health-check each service independently
  - `deploy` job: K8s apply
  - `test` job: 8 Datadog Synthetic tests
- **Health check pattern:** All services expose `GET /health` → `{"status": "ok"}`, tested with 60s timeout in CI

---

## Observability (Datadog)

All services are fully instrumented:

| Feature | Services |
|---------|---------|
| APM Tracing (100% sample rate) | All |
| Profiling | All |
| AppSec | All |
| IAST | All |
| Dynamic Instrumentation | All |
| Database Monitoring (DBM) | god-db, notes-db, user-db |
| LLM Observability | Delphi |
| Data Streams | Scribe (Kafka) |
| Log injection (trace correlation) | Authenticator, Delphi |
| NGINX monitoring | vulcan-proxy |
| Synthetic tests | 8 tests defined in CI |
| Symbol DB / source maps | Vulcan frontend JS |

**Datadog env vars pattern (consistent across all services):**
- `DD_ENV`, `DD_SERVICE`, `DD_VERSION`
- `DD_TRACE_SAMPLE_RATE=1`
- `DD_PROFILING_ENABLED=true`
- `DD_APPSEC_ENABLED=true`, `DD_IAST_ENABLED=true`, `DD_DYNAMIC_INSTRUMENTATION_ENABLED=true`
- `DD_TRACE_AGENT_URL` (unix socket or network depending on context)

**Monitoring infrastructure:** `/services/monitoring/`
- Docker Compose Datadog agent config
- HELM values for K8s Datadog agent: `services/monitoring/datadog-agent/agent-values.yaml`

---

## Build & Deployment Scripts

- **`/build-scripts/deploy.sh`** — Main deploy script
  - Flags: `-t` (teardown), `-a` (application), `-m` (monitoring)
  - Handles Docker Compose up/down and `kubectl apply`
- **`/build-scripts/startup.sh`** — Per-container startup (runs on each service host)
  - Clones repo from GitHub
  - Builds service-specific artifacts (JAR, Go binary, npm install, pip install)
  - Vulcan: minifies JS, imports certs, downloads Java DD agent
  - God-Manager: downloads Orchestrion, compiles with instrumentation
- **`/build-scripts/gen-certs.sh`** — Certificate generation

---

## Security

- Passwords: bcrypt + pepper (secret from env)
- Session cookies: Secure, HttpOnly, SameSite=strict
- Input validation: Regex patterns enforced in all services
  - Username: `^[a-zA-Z0-9-]{1,32}$`
  - Password: `^.{1,64}$`
- AppSec + IAST + SCA enabled across all services via Datadog

---

## Service Catalog

Defined in `/service.datadog.yaml`:
- 6 services, 1 UI, 4 datastores, 1 queue
- Links, contacts, code locations, and tiers documented per component
