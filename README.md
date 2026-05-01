# 🔐 Secure & Scalable REST API System

> **Final Year Project** — JWT Authentication · Dynamic Rate Limiting · Real-Time Monitoring

A production-ready full-stack system built with **FastAPI**, **React**, **MongoDB Atlas**, and **Redis** demonstrating modern API security practices including role-based access control, dynamic rate limiting, intrusion detection, and real-time analytics.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React + Tailwind + Recharts + Axios + WebSocket                │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                   FASTAPI BACKEND (Python)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  /auth/*     │  │  /api/*      │  │  /admin/*            │  │
│  │  Register    │  │  Protected   │  │  Stats, Logs,        │  │
│  │  Login       │  │  Endpoint    │  │  Block/Unblock,      │  │
│  │  Refresh     │  │  /me         │  │  Users, Alerts       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                 │                                      │
│  ┌──────▼─────────────────▼─────────────────────────────────┐  │
│  │              Middleware Layer                              │  │
│  │  • Request Logging  • Rate Limiter  • IP Blocker          │  │
│  │  • JWT Validator    • CORS          • bcrypt Auth         │  │
│  └──────────────────┬──────────────────────────────────────┘  │
│                     │                                           │
│  ┌──────────────────▼───────────────┐  ┌────────────────────┐ │
│  │         WebSocket /ws/monitor     │  │   Redis            │ │
│  │  Broadcasts stats every 2 sec    │  │   Rate counters    │ │
│  │  to connected dashboard clients  │  │   IP block cache   │ │
│  └──────────────────────────────────┘  │   Fail login count │ │
│                                         └────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
             ┌─────────────▼──────────────┐
             │      MongoDB Atlas          │
             │  users · logs · blocked     │
             │  alerts · stats             │
             └────────────────────────────┘
```

---

## 🗂️ Project Structure

```
SecureAPI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Env vars & settings
│   │   ├── database.py        # MongoDB connection & collections
│   │   ├── models.py          # Pydantic request models
│   │   ├── security.py        # JWT creation/validation, bcrypt
│   │   ├── rate_limiter.py    # Redis-based rate limiting & IP blocking
│   │   ├── websocket.py       # WebSocket broadcast manager
│   │   └── main.py            # FastAPI app, middleware, routers
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py            # /auth/register, /auth/login, /auth/refresh
│   │   ├── protected.py       # /api/protected, /api/me
│   │   └── admin.py           # /admin/* (stats, logs, block, users)
│   ├── .env                   # ← Your real credentials (never commit)
│   ├── .env.example           # ← Template to share
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Glassmorphism login
│   │   │   ├── Register.jsx   # Registration form
│   │   │   └── Dashboard.jsx  # Real-time admin panel
│   │   ├── App.jsx            # Router + PrivateRoute guard
│   │   ├── api.js             # Axios instance + JWT interceptors
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env                   # VITE_API_URL, VITE_WS_URL
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Redis (local or Upstash free tier)

### 1. Clone & Configure Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your real MONGO_URI, JWT_SECRET, REDIS_URL
```

### 2. Run Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Visit **http://localhost:8000/docs** for interactive Swagger UI.

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173**

### 4. Create Your First Admin

After registering via the UI (or API), update the user role in MongoDB Atlas:

```js
// In MongoDB Atlas → Browse Collections → users
{ $set: { "role": "admin" } }
```

Or via the Atlas UI: find your user document and change `"role": "user"` → `"role": "admin"`.

---

## 🔑 API Reference

### Auth Endpoints

| Method | Endpoint           | Body                                   | Description              |
|--------|--------------------|----------------------------------------|--------------------------|
| POST   | `/auth/register`   | `{ name, email, password }`            | Register new user        |
| POST   | `/auth/login`      | `{ email, password }`                  | Login → JWT tokens       |
| POST   | `/auth/refresh`    | `{ refresh_token }`                    | Get new access token     |

### Protected Endpoints

| Method | Endpoint           | Auth Required | Description              |
|--------|--------------------|---------------|--------------------------|
| GET    | `/api/protected`   | Bearer token  | Test protected access    |
| GET    | `/api/me`          | Bearer token  | Get current user profile |

### Admin Endpoints (role: admin)

| Method | Endpoint                  | Description                     |
|--------|---------------------------|---------------------------------|
| GET    | `/admin/stats`            | System-wide statistics          |
| GET    | `/admin/logs?limit=50`    | Recent request logs             |
| GET    | `/admin/users`            | List all users                  |
| GET    | `/admin/blocked-ips`      | List blocked IPs                |
| POST   | `/admin/block-user`       | Block IP or user by email       |
| DELETE | `/admin/unblock/{ip}`     | Unblock an IP                   |
| GET    | `/admin/alerts`           | Security alerts                 |
| PATCH  | `/admin/alerts/read-all`  | Mark all alerts read            |

### WebSocket

```
ws://localhost:8000/ws/monitor
```

Broadcasts a JSON payload every 2 seconds:
```json
{
  "type": "stats",
  "timestamp": 1700000000.0,
  "requests_per_sec": 3,
  "total_requests": 1042,
  "failed_logins": 2,
  "active_users": 5,
  "blocked_count": 1,
  "blocked_ips": [...],
  "alerts": [...],
  "recent_logs": [...],
  "chart": [{ "t": "-120s", "requests": 4 }, ...]
}
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt via `passlib` |
| JWT Access Tokens | 30-minute expiry, HS256 |
| JWT Refresh Tokens | 7-day expiry |
| Rate Limiting | Redis sliding window, 60 req/min per IP |
| IP Auto-Block | After 5 failed logins (configurable) |
| Manual IP Block | Via `/admin/block-user` or dashboard |
| Role-Based Access | `user` / `admin` roles enforced via JWT |
| Request Logging | Every request logged to MongoDB |
| Intrusion Alerts | Suspicious activity creates alerts |
| CORS | Configurable origin whitelist |

---

## 🌍 Deployment

### Backend → Render.com

1. Push `backend/` to a GitHub repo
2. Create a new **Web Service** on Render
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all `.env` variables in the **Environment** tab

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy via Vercel CLI or connect GitHub repo
```

Set environment variable in Vercel dashboard:
```
VITE_API_URL = https://your-backend.onrender.com
VITE_WS_URL  = wss://your-backend.onrender.com
```

### MongoDB Atlas Setup

1. Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Add a database user with `readWrite` permissions
3. Whitelist IP `0.0.0.0/0` (or your server IP) in Network Access
4. Copy connection string: `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/`
5. Paste into `.env` as `MONGO_URI` — append `/secure_api_system?retryWrites=true&w=majority&appName=Cluster0`

### Redis → Upstash (Free)

1. Create free Redis at [upstash.com](https://upstash.com)
2. Copy the `REDIS_URL` (format: `redis://:<pass>@<host>:<port>`)
3. Set in `.env` as `REDIS_URL`

---

## 🧪 Sample Test Data

```bash
# Register admin
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@test.com","password":"Admin123!"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}'

# Access protected endpoint (use token from login)
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8000/api/protected

# Trigger rate limit (run 65+ times quickly)
for i in {1..70}; do curl -s http://localhost:8000/api/protected \
  -H "Authorization: Bearer <token>" > /dev/null; done
```

---

## 📦 Dependencies

### Backend
| Package | Purpose |
|---------|---------|
| `fastapi` | ASGI web framework |
| `uvicorn` | ASGI server |
| `pymongo` | MongoDB driver |
| `python-jose` | JWT encoding/decoding |
| `passlib[bcrypt]` | Password hashing |
| `redis` | Redis client |
| `pydantic[email]` | Request validation |
| `python-dotenv` | Environment loading |

### Frontend
| Package | Purpose |
|---------|---------|
| `react` | UI library |
| `react-router-dom` | Client-side routing |
| `axios` | HTTP client |
| `recharts` | Chart components |
| `tailwindcss` | Utility CSS framework |
| `vite` | Build tool |

---

## 👨‍💻 Author

Built as a Final Year Project demonstrating secure API design principles, real-time monitoring, and modern full-stack development practices.

---

*SecureAPI v2.0.0 · FastAPI · React · MongoDB Atlas · Redis · JWT · WebSockets*
