# Contributing to BRIEF

[中文版本](CONTRIBUTING.zh-CN.md)

Thanks for contributing. This repository is maintained for open-source collaboration and hackathon reproducibility.

## Ground rules

- Keep PRs focused and small.
- Do not commit secrets, private keys, cookies, or paid API credentials.
- Keep `env.example` files placeholder-only.
- For user-facing changes, include screenshots or short videos.
- For backend logic changes, include a reproducible request example.

## Development setup

```bash
npm --prefix backend install
npm --prefix frontend install
```

Run locally:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

Build before PR:

```bash
npm --prefix backend run build
npm --prefix frontend run build
```

## Branch and PR convention

- Branch name: `feat/*`, `fix/*`, `chore/*`, `docs/*`
- PR title examples:
- `feat(frontend): add gsap reveal for result sections`
- `fix(backend): improve token contract detection`
- `docs: update vibing-on-bnb submission checklist`

PR checklist:

- [ ] no secrets included
- [ ] builds pass locally
- [ ] docs updated if behavior changed
- [ ] backward compatibility considered for API response fields

## Code style

- TypeScript first, clear naming, minimal side effects.
- Keep frontend and backend concerns separated.
- Prefer additive refactors over risky rewrites.
- Keep motion intentional (GSAP) and avoid noisy animations.

## Reporting bugs

Please include:

- environment (OS, Node version)
- exact steps to reproduce
- expected behavior vs actual behavior
- logs or screenshots when possible

For security issues, do not open public issues first. Follow `SECURITY.md`.
