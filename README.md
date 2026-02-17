# BRIEF

[简体中文说明](README.zh-CN.md)

BRIEF is an AI-native BNB Chain address research interface. Users input one address/CA/question, and get a plain-language brief with evidence links.

## Positioning

- Product category: `Agent-driven chain research browser`
- Experience goal: `one input -> one brief`
- Audience: analysts, traders, community users, and first-time onchain users
- Narrative: AI-assisted mass-adoption tooling, not a complex pro dashboard

## Why this project fits Vibing on BNB

BRIEF is designed for the spirit of **Good Vibes Only: OpenClaw Edition (Vibing on BNB)**:

- AI-first building workflow
- Verifiable onchain output (BSC/opBNB addresses and transaction evidence)
- Reproducible open-source repository and runnable demo
- Simple product UX for non-technical users

OpenClaw is treated as inspiration for autonomous/onchain AI applications. It is **not a mandatory dependency** for participation.

## Vibing on BNB compliance

BRIEF is presented as a compliant submission for Vibing on BNB:

- Track alignment: `Agent`
- Onchain proof: BSC/opBNB contract address or transaction hash
- Reproducibility: public repo, runnable demo, and setup steps
- AI usage: integrated in workflow and product experience
- Event policy: no token launch/fundraising/liquidity-opening behavior during restricted period

Official requirement references:
- `https://www.bnbchain.org/en/blog/win-a-share-of-100k-with-good-vibes-only-openclaw-edition`
- `https://dorahacks.io/hackathon/goodvibes/detail`

## Core features

- Single input for address/CA/question
- AI-readable risk summary (`TL;DR + explanation + findings`)
- Evidence-first output with clickable sources (BscScan, DexScreener, optional data APIs)
- Optional enrichment sources (Frontrun/MemeRadar/Arkham/GMGN/BscScan v2) controlled by backend env
- Product-style frontend with GSAP-driven motion
- `enhanced/fallback` runtime status exposed in UI for transparent judging

## Architecture

- `frontend/`: Next.js App Router UI shell
- `backend/`: Fastify API (`POST /api/brief`)
- `contracts/`: app contract `BriefAgentNFA` (BAP578-compatible, Hardhat)
- Frontend calls backend via built-in proxy route: `frontend/app/api/brief/route.ts`

Contract integration note:
- users do not need to paste contract addresses in UI
- backend can auto-bind agent records using `BRIEF_NFA_CONTRACT`
- `/agents` supports onchain `create / fund / withdraw` actions and paid public-agent calls (rent + tx verification)

## Local development

```bash
# backend
npm --prefix backend install
npm --prefix backend run dev

# frontend
npm --prefix frontend install
npm --prefix frontend run dev
```

Build checks:

```bash
npm --prefix backend run build
npm --prefix frontend run build
npm --prefix contracts run build
```

For `contracts/`, use Node.js 22 LTS for best Hardhat compatibility.

## Environment policy

- `env.example`, `backend/env.example`, `frontend/env.example` contain placeholders only (`KEY=`)
- concrete secrets must stay in local `.env` / `frontend/.env.local`
- secret files are git-ignored by default
- optional onchain binding key: `BRIEF_NFA_CONTRACT`
- optional onchain network keys: `BRIEF_NFA_CHAIN_ID`, `BRIEF_NFA_RPC_URL`
- optional enhanced keys include: `ARKM_API_KEY`, `MORALIS_API_KEY`, `GMGN_*`, `FR_*`, `MR_*`, `BSCSCAN_API_KEY` (or `ETHERSCAN_API_KEY` / `ETHERSCAN_V2_API_KEY`)

## Repository docs

- English README: `README.md`
- Chinese README: `README.zh-CN.md`
- Contributing: `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`
- Security policy: `SECURITY.md` / `SECURITY.zh-CN.md`

## Disclaimer

This project is independent and not an official BNB Chain product.
Use third-party APIs and AI services at your own risk and review outputs before financial decisions.
