# Monica's Interiors

React + Vite + Tailwind + Framer Motion storefront with a Node.js + Express + MongoDB API and JWT auth with rotating refresh tokens.

## Setup

**Requirements:** Node.js 20 or newer (tested on 22.19) and npm 10. No MongoDB install is needed.

### 1. Install

```bash
cd monicas-interiors
npm install
```

The first install downloads a local MongoDB 7 binary (about 630 MB) into `node_modules/.cache`. On a slow connection that can take 10–40 minutes; later installs reuse it.

### 2. Environment variables

```bash
cp apps/api/.env.example apps/api/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # paste into JWT_ACCESS_SECRET
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | 4000 | API port |
| `WEB_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed web origins, comma-separated (CORS and CSRF check) |
| `MONGODB_URI` | empty | Empty runs the bundled local MongoDB (data in `apps/api/.data`). Set it to use Atlas or your own server |
| `JWT_ACCESS_SECRET` | required | At least 32 random characters; signs access tokens |
| `ACCESS_TOKEN_MINUTES` | 15 | Access token lifetime |
| `REFRESH_TOKEN_DAYS` | 30 | Refresh cookie lifetime (1 day when "Remember me" is off) |
| `COURIER_WEBHOOK_SECRET` | required | HMAC secret for `POST /api/v1/webhooks/courier/:carrier` |
| `DEMO_AUTO_ADVANCE_SECONDS` | 20 | Dev only: new orders move one status every N seconds. `0` turns it off |

### 3. Run

```bash
npm run dev
```

Open **http://localhost:5173**. The API runs at http://localhost:4000/api/v1, and the web dev server forwards `/api` to it. The database seeds itself on first start.

| Command | What it does |
| --- | --- |
| `npm run dev` | API + web app with live reload |
| `npm run seed` | Reset the database to the demo data (10 products, 3 orders, 2 users) |
| `npm run test:api` | API smoke tests, 8 tests (needs `npm run dev` running) |
| `npm run build` | Production build of the web app into `apps/web/dist` |
| `npm start` | Build, then run the production server: API + optimized site on http://localhost:4000 |
| `npm run images -w apps/web` | Re-optimize photos after adding or replacing files in `apps/web/images-src` |

## Deploy to Vercel (+ MongoDB Atlas)

Vercel serves the built site from its CDN and runs the whole Express API as one serverless function (`api/index.mjs`). Routing, caching and security headers are in `vercel.json`. The database is a free MongoDB Atlas cluster.

**1. Database (MongoDB Atlas, free)**
1. Create an account and a free **M0** cluster at https://cloud.mongodb.com (pick a region near your customers, e.g. Mumbai).
2. **Database Access:** add a user with a strong password.
3. **Network Access:** allow `0.0.0.0/0`. Vercel functions don't have fixed IP addresses.
4. **Connect → Drivers:** copy the connection string, `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/`.

**2. Vercel**
1. Push this folder to a GitHub repository, then at https://vercel.com/new import it. Leave the root directory as the repo root; Vercel reads `vercel.json`.
2. Under **Environment Variables**, add:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | the Atlas connection string |
| `JWT_ACCESS_SECRET` | 48+ random characters (generate with the `node -e` command in step 2 of Setup) |
| `COURIER_WEBHOOK_SECRET` | another random string |
| `WEB_ORIGIN` | your site URL, e.g. `https://monicas-interiors.vercel.app` |
| `DEMO_AUTO_ADVANCE_SECONDS` | `20` for the demo, `0` for a real store |

3. Deploy. The first request seeds the demo data into Atlas. Check `https://YOUR-SITE/api/v1/health`.

Or deploy from the terminal: `npx vercel login`, then `npx vercel --prod` in this folder (the CLI asks for the same environment variables).

**How the always-on parts work on serverless:**
- **Live tracking:** each stream re-reads the order from the database every 3 seconds and closes after 50 seconds; the browser reconnects automatically.
- **Demo order progress:** no timers. Each order catches up to the status it should be at whenever it's viewed.
- **Rate limits:** counted per function instance, so they're looser than on a single server.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | monica@example.com | interiors123 |
| Staff | staff@example.com | staff12345 |

The staff account sees **Manage orders** in the account menu, which moves orders through the status state machine. Changes appear live on the customer's tracking page.

New orders placed at checkout advance one status every 20 seconds (`DEMO_AUTO_ADVANCE_SECONDS` in `apps/api/.env`, set to `0` to turn off), so you can watch live tracking.

## Layout

```
packages/shared   statuses, transitions, buildTimeline, Zod schemas, money helpers
apps/api          Express API: auth, products, wishlist, cart, orders, tracking (SSE), webhooks
apps/web          React app: pages in src/features, design system in src/components
```

## Not built yet

- Real payments (checkout uses a simulated payment; Razorpay plugs in at `POST /orders/checkout`)
- Email (verification, password reset), Google/Apple sign-in
- Product photos: products use drawn placeholders until `images[]` is filled
