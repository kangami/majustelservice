# MajustelServices

Modern e-commerce website for laptops, computer equipment and maintenance services.

- **Frontend:** React 18 + Vite + React Router (in `frontend/`)
- **Backend:** Flask + SQLite (in `backend/`)
- **Design:** white / blue / black, logo in `majustelService.jpg`

## Run it

### 1. Backend (Flask API on port 5000)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The SQLite database (`majustel.db`) is created and seeded with products and services automatically on first run.

### 2. Frontend (Vite dev server on port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the dev server proxies `/api/*` to the Flask backend.

### Environment variables (backend)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string in production; omit to use local SQLite |
| `SECRET_KEY` | Flask session secret — set a real one before deploying |
| `ADMIN_PASSWORD` | Password for the seeded `admin` account (first run only) |
| `STRIPE_SECRET_KEY` | Enables card checkout; omit to only offer pay-on-delivery |
| `GOOGLE_MAPS_SERVER_KEY` | Server-side key with the Distance Matrix API enabled, used to price shipping by road distance from the office address. Without it, every order falls back to a manual shipping quote. Distinct from the frontend's `VITE_GOOGLE_MAPS_KEY` (address autocomplete only) — never reuse a browser-restricted key here. |
| `FRONTEND_URL` | Used to build Stripe redirect URLs when the `Origin` header isn't available |
| `RESEND_API_KEY` | Enables order confirmation / status-update emails via [Resend](https://resend.com). Without it, orders still work — emails are just skipped (a warning is logged instead). |
| `ORDER_EMAIL_FROM` | The `from` address for order emails, e.g. `MajustelServices <orders@majustelservices.ca>`. Must be on a domain verified in the Resend dashboard — an unverified domain is rejected. Defaults to Resend's `onboarding@resend.dev` sandbox address, which only delivers to the Resend account's own email. |

## Admin panel

Open http://localhost:5173/login (or click the shield icon in the navbar).

- Default credentials: **admin / admin123** — change these before deploying (`users` table; also set a real `app.secret_key` in `backend/app.py`).
- **Products tab:** add, edit and delete products (name, price, stock, badge, image, …); drag rows by the ⋮⋮ handle to reorder — that order is what shoppers see.
- **Orders tab:** view customer orders and update their status (new → processing → shipped → completed / cancelled).
- **Shipping tab:** set your office/warehouse address and the distance-based delivery fee tiers (free under X km, flat fees up to three further bands, then "quoted manually" beyond that — orders past the last tier are flagged `canada_post` for you to price by hand). Requires `GOOGLE_MAPS_SERVER_KEY` (see below) to actually compute distances; without it every order falls back to a manual quote.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products?category=laptops\|accessories&q=` | List/search products |
| GET | `/api/products/<id>` | Product detail |
| GET | `/api/services` | Maintenance services |
| POST | `/api/orders` | Place an order (checkout); total includes the calculated shipping fee |
| POST | `/api/shipping/quote` | Preview the shipping fee for a delivery address |
| POST | `/api/contact` | Contact / service booking message |
| POST | `/api/auth/login` | Admin login (session cookie) |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current session user |
| POST/PUT/DELETE | `/api/admin/products[/<id>]` | Manage products (admin only) |
| PUT | `/api/admin/products/reorder` | Persist drag-and-drop product order (admin only) |
| GET/PUT | `/api/admin/orders[/<id>]` | List orders / update status (admin only) |
| GET/PUT | `/api/admin/shipping` | Read/update the office address and fee tiers (admin only) |

## Features

- Bilingual (English / French): toggle with the EN/FR button in the navbar; choice is remembered and the browser language is detected on first visit. UI text lives in `frontend/src/translations.js`; product and service French content is stored in the database (`description_fr`, `name_fr`, …) and editable from the admin panel.
- Contact details: (263) 288-7930 · hello@majustelservices.ca (set in `frontend/src/translations.js` → `CONTACT_INFO`)
- Product catalog with category filter and live search
- Shopping cart (persisted in localStorage) with slide-out drawer and checkout
- Computer maintenance services with booking via the contact form
- Orders and contact messages stored in SQLite
- Fully responsive, modern white/blue/black design
- Order emails via Resend: the customer gets a branded confirmation email once an order is placed (or, for card payments, once payment is verified), and another whenever its status changes in the admin panel. See `RESEND_API_KEY` / `ORDER_EMAIL_FROM` above.
