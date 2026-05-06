# Deployment Guide

This repo is split into:

- `frontend`: Vite + React app in the repo root, deploy on Vercel
- `backend`: Express + Prisma API in [`server`](./server), deploy on Render

The frontend talks to the backend through `VITE_API_URL`, and the backend only accepts browser requests from origins allowed by `CLIENT_URL` and the optional `CLIENT_URL_REGEX`.

## 1. Backend on Render

Create a **Web Service** on Render from this same repository.

- **Root Directory:** `server`
- **Runtime:** `Node`
- **Build Command:** `npm install && npx prisma generate`
- **Start Command:** `npm start`

Important:

- If Render is started from the repo root instead of `server`, deploys will fail with `npm error Missing script: "start"` because the root [`package.json`](./package.json) is the frontend package.
- This repo now includes [`render.yaml`](./render.yaml) with the correct backend service settings if you prefer a Render Blueprint setup.

Optional but recommended on paid Render plans:

- **Pre-Deploy Command:** `npx prisma db push`

If you are on a plan without pre-deploy commands, run `npx prisma db push` manually from the Render Shell after the first deploy and any time `server/prisma/schema.prisma` changes.

### Render environment variables

Add these in the Render dashboard:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`
- `CLOUDINARY_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Notes:

- `CLIENT_URL` should include your local frontend and your production Vercel URL, separated by commas.
- Example:

```env
CLIENT_URL=http://localhost:5174,https://your-app.vercel.app
```

- `PORT` is not required on Render. Render provides it automatically, and the server already reads `process.env.PORT`.

### Optional: allow Vercel preview deployments

This repo now supports `CLIENT_URL_REGEX` for preview URLs. Add it only if you want preview deployments to call the backend successfully.

Example:

```env
CLIENT_URL_REGEX=^https://your-app(-[a-z0-9-]+)?\\.vercel\\.app$
```

If your preview domains use a different pattern, adjust the regex to match your project’s preview URLs.

### Seed the database

After the backend is live and `DATABASE_URL` is working, run this once from the Render Shell:

```bash
node src/seed.js
```

The seed creates demo users and data for the app.

## 2. Frontend on Vercel

Create a Vercel project from the same repository.

- **Root Directory:** repo root
- **Framework Preset:** `Vite`
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Vercel environment variable

Add this in Vercel for Production and Preview:

```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

Use your actual Render backend URL, including `/api`.

## 3. Domain wiring

Once Vercel gives you the frontend URL:

1. Copy the Vercel production URL.
2. Add that URL to Render’s `CLIENT_URL`.
3. Redeploy the Render backend.
4. Redeploy the Vercel frontend if you changed `VITE_API_URL`.

The important pairing is:

- `VITE_API_URL` on Vercel points to Render
- `CLIENT_URL` on Render includes Vercel

Without both, login and API calls will fail because of either wrong API routing or CORS.

## 4. Current repo config that already helps deployment

- [`src/api/index.js`](./src/api/index.js) uses `VITE_API_URL` and falls back to `/api` locally.
- [`vite.config.js`](./vite.config.js) proxies `/api` to `http://localhost:3001` for local development.
- [`vercel.json`](./vercel.json) rewrites all frontend routes to `index.html`, which is required for React Router refreshes on Vercel.
- [`server/src/index.js`](./server/src/index.js) reads `PORT`, `CLIENT_URL`, and optional `CLIENT_URL_REGEX`.

## 5. Deploy order

Use this order to avoid broken API calls:

1. Deploy Render backend.
2. Run `npx prisma db push`.
3. Run `node src/seed.js`.
4. Copy the Render backend URL.
5. Add `VITE_API_URL` in Vercel.
6. Deploy Vercel frontend.
7. Copy the Vercel production URL.
8. Add that URL to Render `CLIENT_URL`.
9. Redeploy the Render backend.

## 6. Smoke test after deployment

Check these URLs and flows:

- `https://your-render-service.onrender.com/api/health` returns JSON
- Vercel frontend loads without a blank page
- Login works
- Dashboard data loads
- File upload works for avatars/documents/messages
- Meeting links open correctly

## 7. Common failure points

### Frontend loads but API calls fail

Usually one of these:

- `VITE_API_URL` is missing `/api`
- Render `CLIENT_URL` does not include the Vercel domain
- Render backend was not redeployed after changing env vars

### Backend deploys but crashes on startup

Usually one of these:

- `DATABASE_URL` is invalid
- Prisma schema was not pushed with `npx prisma db push`
- Cloudinary env vars are missing

### Vercel preview deploy works visually but login fails

That means the preview domain is not allowed by backend CORS yet. Add `CLIENT_URL_REGEX` on Render or test against the production Vercel domain only.
