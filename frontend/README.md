## NextLab Frontend

Modern SaaS frontend for the NextLab security scanner. Built with **Next.js App Router**, **TypeScript**, **Tailwind 4**, **Framer Motion**, **Lucide Icons**, and **Supabase Auth**.

## Getting Started

First, install dependencies and run the development server:

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required keys:

- `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – public anon key for Supabase Auth.
- `NEXT_PUBLIC_API_BASE_URL` – base URL for the FastAPI backend (for example `http://localhost:8000`).

The API client also accepts `NEXT_PUBLIC_API_URL` for backwards compatibility.

## Architecture overview

- `src/app` – Next.js App Router pages and layouts:
  - `page.tsx` – marketing + free scan landing page.
  - `dashboard/page.tsx` – authenticated monitoring dashboard for saved domains.
  - `login/page.tsx`, `register/page.tsx` – Supabase-backed auth flows.
- `src/components` – shared UI building blocks (for example `Logo`).
- `src/lib/api.ts` – typed HTTP client for calling the FastAPI backend (scans and Stripe checkout).
- `src/lib/domain.ts` – domain normalization helpers.
- `src/utils/supabase/client.ts` – browser Supabase client.

Authentication is enforced on the dashboard via Supabase RLS and a client-side guard. The login and register pages automatically redirect authenticated users to the dashboard.

## Frontend conventions

- **Styling**: Tailwind utility classes plus a small set of custom utilities in `globals.css` (glassmorphism, grid background, premium buttons).
- **State management**: React hooks (`useState`, `useEffect`) at the page level; no global state library.
- **Animations**: `framer-motion` is used for subtle entrance animations and loading indicators.
- **API calls**: All backend requests go through the typed helpers in `src/lib/api.ts` so URLs and error handling are centralized.
