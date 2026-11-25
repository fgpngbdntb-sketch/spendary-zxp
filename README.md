# Spendary

A mobile-first spending diary built with React and Vite. Each expense becomes a dot; category controls its color and amount controls its size.

## Run locally

Requires Node.js 24+ and npm.

```sh
cp .env.example .env.local
# Set project URL and publishable key in .env.local
npm ci
npm run dev
```

```sh
npm run lint
npm run build
npm run preview
```

Expenses are stored in Supabase `public.expenses`, protected by owner RLS. Email/password authentication is required. Legacy localStorage records migrate to the first signed-in owner; browser copies are removed only after cloud records are verified. Local and public websites have separate browser storage. Old records store time only; migration assigns the migration day's local date.

Use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never use secret or service-role keys in browser configuration. `.env.local` is ignored by Git.

## Deployment

Pushes to `main` build and deploy through `.github/workflows/deploy.yml`. GitHub Pages source must be **GitHub Actions**. Set repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before deployment. Vite base is `/spendary-zxp/`.

Public URL: https://fgpngbdntb-sketch.github.io/spendary-zxp/
