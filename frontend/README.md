# BRIEF Frontend

Next.js UI shell for the single-page AI brief experience.

## Stack

- Framework: Next.js (App Router)
- UI: Tailwind CSS v4
- Motion: GSAP + Framer Motion
- Icons: Lucide React

## Start

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

## Build

```bash
npm --prefix frontend run build
```

## Env

- `frontend/env.example` keeps placeholders only.
- Local value file: `frontend/.env.local`
- Required key: `BRIEF_BACKEND_URL` (defaults to `http://127.0.0.1:8787`)

## Related Docs

- Root docs: `README.md`
- 中文文档: `README.zh-CN.md`
