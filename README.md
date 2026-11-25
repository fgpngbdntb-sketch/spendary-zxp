# Spendary

A mobile-first spending diary built with React and Vite. Each expense becomes a dot; category controls its color and amount controls its size.

## Run locally

Requires Node.js 24+ and npm.

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run build
npm run preview
```

Expenses are saved in this browser's localStorage, without accounts or cloud storage. First-time visits start with three demonstration expenses. Deleting all expenses preserves an empty diary after reload. Local development and the public website have separate browser storage.

## Deployment

Pushes to `main` build and deploy through `.github/workflows/deploy.yml`. GitHub Pages source must be **GitHub Actions**. Vite base is `/spendary-zxp/`.

Public URL: https://fgpngbdntb-sketch.github.io/spendary-zxp/
