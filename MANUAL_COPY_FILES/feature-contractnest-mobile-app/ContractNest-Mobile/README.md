# ContractNest Mobile

Expo (React Native) companion app for ContractNest.

## Features

- **Login** against the ContractNest API (Supabase-backed JWT auth)
- **Signup from invitation** — validate an invitation code + secret, then register or accept
- **Registration pointer** — full account/workspace registration happens on the website
- **Contact management** — list, search, create, edit, delete (live API)
- **Contract Hub, AR/AP, OPS, Cadence** — mobile UI previews of the web modules
- **Themes** — the full set of ContractNest web themes with light/dark modes

## Getting started

```bash
npm install
npm start          # Expo dev server
npm run typecheck  # TypeScript check
```

The API base URL is configured in `src/services/config.ts` (defaults to the
production API; override with the `EXPO_PUBLIC_API_URL` environment variable).
