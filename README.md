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

## Admin panel

Open http://localhost:5173/login (or click the shield icon in the navbar).

- Default credentials: **admin / admin123** — change these before deploying (`users` table; also set a real `app.secret_key` in `backend/app.py`).
- **Products tab:** add, edit and delete products (name, price, stock, badge, image, …).
- **Orders tab:** view customer orders and update their status (new → processing → shipped → completed / cancelled).

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products?category=laptops\|accessories&q=` | List/search products |
| GET | `/api/products/<id>` | Product detail |
| GET | `/api/services` | Maintenance services |
| POST | `/api/orders` | Place an order (checkout) |
| POST | `/api/contact` | Contact / service booking message |
| POST | `/api/auth/login` | Admin login (session cookie) |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current session user |
| POST/PUT/DELETE | `/api/admin/products[/<id>]` | Manage products (admin only) |
| GET/PUT | `/api/admin/orders[/<id>]` | List orders / update status (admin only) |

## Features

- Bilingual (English / French): toggle with the EN/FR button in the navbar; choice is remembered and the browser language is detected on first visit. UI text lives in `frontend/src/translations.js`; product and service French content is stored in the database (`description_fr`, `name_fr`, …) and editable from the admin panel.
- Contact details: (263) 288-7930 · hello@majustelservices.ca (set in `frontend/src/translations.js` → `CONTACT_INFO`)
- Product catalog with category filter and live search
- Shopping cart (persisted in localStorage) with slide-out drawer and checkout
- Computer maintenance services with booking via the contact form
- Orders and contact messages stored in SQLite
- Fully responsive, modern white/blue/black design
