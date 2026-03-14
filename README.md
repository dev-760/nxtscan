<div align="center">
  <h1>🛡️ NextLab</h1>
  <p><strong>Open-source web security scanner with AI-powered remediation, automated monitoring, and executive PDF reports.</strong></p>
  <p>
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-features">Features</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## ✨ Features

- **Instant Threat Detection** — SSL certificate analysis, security headers, DNS validation — no signup required
- **Deep Infrastructure Scan** — Open port discovery (Shodan), subdomain enumeration, technology fingerprinting
- **AI Remediation** — Groq-powered (Llama 3) human-readable fix instructions for every finding
- **Continuous Monitoring** — Automated weekly scans with real-time email alerts
- **Executive PDF Reports** — Bilingual Arabic & English reports with native RTL typography (WeasyPrint + Amiri font)
- **Moroccan CNDP Compliance** — Checks for `Numéro d'autorisation CNDP` on public pages
- **Dashboard** — Manage monitored domains, trigger scans, and view history

---

## 🏗 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Next.js   │────▶│   FastAPI     │────▶│  Celery Worker │
│  (Vercel)   │     │  (Northflank) │     │  (Northflank)  │
└─────────────┘     └──────┬───────┘     └───────┬───────┘
                           │                     │
                    ┌──────▼───────┐     ┌───────▼───────┐
                    │   Supabase   │     │  Upstash Redis │
                    │  (DB + Auth) │     │   (Broker)     │
                    └──────────────┘     └───────────────┘
```

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router) + Tailwind CSS v4 + Framer Motion |
| **Backend API** | FastAPI (Python 3.11) |
| **Task Queue** | Celery + Redis (Upstash) |
| **AI Engine** | Groq (Llama 3.3 70B) |
| **PDF Engine** | WeasyPrint with native Arabic RTL support |
| **Database & Auth** | Supabase (PostgreSQL + Auth + RLS) |
| **Deployment** | Vercel (frontend) + Northflank (backend container) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Redis** instance (or [Upstash](https://upstash.com/) free tier)
- **Supabase** project (free tier works)
- **Groq** API key (free tier: [console.groq.com](https://console.groq.com))

### 1. Clone & Setup Database

```bash
git clone https://github.com/YOUR_USERNAME/nextlab.git
cd nextlab
```

Run the SQL in `supabase_init.sql` in your Supabase SQL editor to create tables, RLS policies, and the auth trigger.

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Unix:    source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see .env.example for details)

# Run the API server
uvicorn main:app --reload --port 8000

# In a separate terminal — run the Celery worker
# Windows:
celery -A worker.celery_app worker --pool=solo -l info
# Unix:
celery -A worker.celery_app worker -l info
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the frontend proxies `/api/*` to the backend automatically.

---

## 🌐 Deployment

### Frontend → Vercel

1. Import your repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `BACKEND_URL` (your Northflank service URL)

### Backend → Northflank

1. Create a new **Service** on [Northflank](https://northflank.com), pointing to the `/backend` directory
2. Northflank will auto-detect the `Dockerfile`
3. Add all env vars from `backend/.env.example`
4. Create a **second service** (same image) with the command override:
   ```
   celery -A worker.celery_app worker -l info
   ```
   This runs the Celery worker separately.

### Required Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Backend | Supabase **Connection Pooler** URL (IPv4) |
| `SUPABASE_JWT_SECRET` | Backend | Supabase → Settings → API → JWT Secret |
| `REDIS_URL` | Backend | Upstash Redis URL (rediss://) |
| `GROQ_API_KEY` | Backend | Groq API key |
| `FRONTEND_URL` | Backend | Your Vercel URL (for CORS) |
| `SHODAN_API_KEY` | Backend | Optional — enables port scanning |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Supabase anon/public key |
| `BACKEND_URL` | Frontend | Northflank backend URL |

---

## 📁 Project Structure

```
nextlab/
├── backend/
│   ├── main.py              # FastAPI app, endpoints, auth
│   ├── worker.py             # Celery tasks (scan execution)
│   ├── config.py             # Environment settings
│   ├── models.py             # SQLModel database models
│   ├── scanners/             # Individual scan modules
│   ├── reports/              # PDF report generation
│   ├── templates/            # HTML templates for reports
│   ├── Dockerfile            # Production container
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment template
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # Reusable React components
│   │   ├── lib/              # API client, utilities
│   │   └── utils/            # Supabase client setup
│   ├── public/               # Static assets
│   ├── next.config.ts        # API proxy rewrites
│   ├── package.json          # Node dependencies
│   └── .env.example          # Environment template
├── supabase_init.sql         # Database schema & RLS policies
├── .gitignore
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ by NextLab. © 2026</p>
