<div align="center">
  <img src="https://raw.githubusercontent.com/user-attachments/assets/nextlab-logo" width="200" alt="NextLab Logo" />
  <h1>NextLab Security Scanner</h1>
  <p>An enterprise-grade, localized web security SaaS. Provides instantaneous threat detection, automated Moroccan/International compliance reporting (CNDP & SSL enforcement), and executive PDF distribution.</p>
</div>

---

## 🏗 Architecture & Stack
**NextLab** is completely decoupled, leveraging serverless logic and asynchronous task queuing for massive scalability.

- **Frontend**: [Next.js 14 (App Router)](https://nextjs.org/) + TailwindCSS + Framer Motion.
- **Backend**: [FastAPI (Python)](https://fastapi.tiangolo.com/) handling routing and API coordination.
- **Task Queue**: [Celery](https://docs.celeryq.dev/) executing the heavy scanning operations asynchronously.
- **AI Engine**: [Groq (Llama 3)](https://groq.com/) translating complex vulnerabilities into rapid, human-readable remediation steps.
- **PDF Generation**: [WeasyPrint](https://weasyprint.org/) completely configured for standard RTL Arabic layouts.
- **Database / Auth**: [Supabase](https://supabase.com/).
- **Message Broker**: [Upstash](https://upstash.com/) (Serverless Redis).
- **Deployment**: [Vercel](https://vercel.com) (Frontend) & [Northflank](https://northflank.com/) (Backend container).

---

## 🚀 Local Development Setup

### 1. Requirements
Ensure you have the following installed on your machine:
- `Node.js` (v18+)
- `Python` (3.11+)
- Upstash Redis account (or local Redis instance)
- Groq API Key

### 2. Backend Initialization
The backend relies on FastAPI and a Celery worker pool to execute the custom intelligence gathering (e.g. SSL 200-day limit enforcement, CNDP scraping).

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
### Windows
venv\Scripts\activate
### Unix/MacOS
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Duplicate environment file
cp .env.example .env
```
Ensure you fill out the `.env` file with your `GROQ_API_KEY`, `DATABASE_URL` (Supabase), and `REDIS_URL` (Upstash).

**Run the FastAPI Server:**
```bash
uvicorn main:app --reload --port 8000
```

**Run the Celery Worker (in a separate terminal):**
```bash
# Windows (requires gevent/eventlet for celery on windows usually, or standard solo pool)
celery -A worker.celery_app worker --pool=solo -l info
# Unix
celery -A worker.celery_app worker -l info
```

*(Note for Windows: If using WeasyPrint PDF generation locally, ensure [GTK3](https://weasyprint.readthedocs.io/en/latest/install.html#windows) is installed in your system PATH).*

### 3. Frontend Initialization

```bash
cd frontend

# Install Next.js dependencies
npm install

# Run development server
npm run dev
```
The application will map to `http://localhost:3000`. It automatically proxies API requests pointing to `/scans` into your localhost backend (`:8000`).

---

## 🌐 Deployment Mechanics

### Frontend (Vercel)
Next.js handles static delivery and proxies automatically. 
1. Link your repository via Vercel.
2. Vercel automatically detects `vercel.json` and bridges the `/api/*` rewrite configuration pointing toward your production Northflank URL.

### Backend (Northflank)
Northflank runs raw Dockerfiles out of the box. 
1. Link the repository to a new **Northflank Service**, selecting the `/backend` directory.
2. The provided `Dockerfile` installs `libpango` and `fonts-hosny-amiri` automatically, ensuring the Arabic HTML-to-PDF engine runs perfectly on Alpine/Debian Linux.
3. Once deployed, boot up a **secondary service/worker** in Northflank pointing to the identical image, but overriding the default command to: `celery -A worker.celery_app worker -l info` so it acts strictly as the background queue consumer.

---

## 🛡️ Key Features Included
- **SSL Sentinel Engine**: Handshakes domains and actively enforces the incoming industry standard 200-day maximum validity limit.
- **Moroccan CNDP Scanner**: Actively scrapes routes for `Numéro d'autorisation CNDP`, verifying local legal compliance on public ledgers.
- **LPU AI Remediation**: Bypasses typical LLM slowness using Groq’s Lightning Processing Units—generating executive summaries synchronously alongside the API gathering.
- **Native Arabic Reports**: Bypasses standard encoding errors by directly rendering standard `Amiri` RTL typography into compiled PDFs natively within Python. 

---

<p align="center">Built with execution speed in mind. © 2026 NextLab.</p>
