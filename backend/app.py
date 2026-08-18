import html
import json
import math
import os
import sqlite3
import urllib.parse
import urllib.request
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, g, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = Path(__file__).parent / "majustel.db"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
IS_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))

if IS_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "majustel-dev-secret-change-me-in-production")
CORS(app, supports_credentials=True)

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET_KEY:
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY

# Server-side key for the Distance Matrix API (shipping fee calculation).
# Distinct from the frontend's VITE_GOOGLE_MAPS_KEY, which only powers address
# autocomplete and is never trusted for pricing.
GOOGLE_MAPS_SERVER_KEY = os.environ.get("GOOGLE_MAPS_SERVER_KEY", "")

# Transactional order emails (confirmation + status updates), sent via Resend.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
if RESEND_API_KEY:
    import resend
    resend.api_key = RESEND_API_KEY
# Must be on a domain verified in the Resend dashboard, or emails are rejected;
# onboarding@resend.dev only works for sending to the account owner's own address.
ORDER_EMAIL_FROM = os.environ.get("ORDER_EMAIL_FROM", "MajustelServices <onboarding@resend.dev>")


def frontend_base_url():
    return (os.environ.get("FRONTEND_URL")
            or request.headers.get("Origin")
            or "http://localhost:5173").rstrip("/")


# ---------------------------------------------------------------------------
# Database helpers — Postgres in production (DATABASE_URL), SQLite locally
# ---------------------------------------------------------------------------

def connect():
    if IS_POSTGRES:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_db():
    if "db" not in g:
        g.db = connect()
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def q(sql):
    """Translate '?' placeholders to '%s' for Postgres."""
    return sql.replace("?", "%s") if IS_POSTGRES else sql


def db_execute(sql, params=()):
    """Execute a statement on the request connection; returns a cursor."""
    cur = get_db().cursor()
    cur.execute(q(sql), params)
    return cur


def fetch_one(sql, params=()):
    return db_execute(sql, params).fetchone()


def fetch_all(sql, params=()):
    return db_execute(sql, params).fetchall()


def insert_returning_id(sql, params=()):
    if IS_POSTGRES:
        cur = db_execute(sql + " RETURNING id", params)
        return cur.fetchone()["id"]
    return db_execute(sql, params).lastrowid


PK_TYPE = "SERIAL PRIMARY KEY" if IS_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS products (
    id {PK_TYPE},
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    price REAL NOT NULL,
    old_price REAL,
    description TEXT NOT NULL,
    specs TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 10,
    badge TEXT,
    icon TEXT NOT NULL DEFAULT 'laptop',
    image TEXT,
    description_fr TEXT,
    images TEXT,
    rental_price REAL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
    id {PK_TYPE},
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_from REAL NOT NULL,
    duration TEXT NOT NULL,
    icon TEXT NOT NULL,
    name_fr TEXT,
    description_fr TEXT,
    duration_fr TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id {PK_TYPE},
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    payment_method TEXT DEFAULT 'cod',
    stripe_session_id TEXT,
    order_type TEXT DEFAULT 'purchase',
    rental_start TEXT,
    rental_end TEXT,
    shipping_fee REAL,
    shipping_distance_km REAL,
    shipping_mode TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_settings (
    id {PK_TYPE},
    office_address TEXT NOT NULL DEFAULT '',
    free_km REAL NOT NULL DEFAULT 5,
    tier2_km REAL NOT NULL DEFAULT 10,
    tier2_price REAL NOT NULL DEFAULT 15,
    tier3_km REAL NOT NULL DEFAULT 20,
    tier3_price REAL NOT NULL DEFAULT 25,
    tier4_km REAL NOT NULL DEFAULT 30,
    tier4_price REAL NOT NULL DEFAULT 30,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id {PK_TYPE},
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id {PK_TYPE},
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS lots (
    id {PK_TYPE},
    name TEXT NOT NULL,
    name_fr TEXT,
    description TEXT,
    description_fr TEXT,
    price REAL NOT NULL,
    badge TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    lead_time TEXT,
    lead_time_fr TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lot_items (
    id {PK_TYPE},
    lot_id INTEGER NOT NULL,
    product_id INTEGER,
    name TEXT NOT NULL,
    specs TEXT,
    icon TEXT,
    grade TEXT NOT NULL DEFAULT 'refurbished',
    qty INTEGER NOT NULL DEFAULT 1,
    unit_value REAL,
    position INTEGER NOT NULL DEFAULT 0
);
"""

PRODUCTS = [
    # --- Laptops ---
    ("ProBook Ultra 14", "laptops", "Dell", 1299.00, 1499.00,
     "Thin and light 14\" business ultrabook with all-day battery life.",
     "Intel Core i7-1360P · 16GB RAM · 512GB SSD · 14\" 2.5K IPS", 12, "Sale", "laptop",
     "/products/probook.jpg",
     "Ultrabook professionnel 14 po fin et léger avec une autonomie d'une journée."),
    ("XPS 15 Creator", "laptops", "Dell", 1899.00, None,
     "Powerful 15\" creator laptop with stunning OLED display.",
     "Intel Core i9-13900H · 32GB RAM · 1TB SSD · RTX 4060 · 15.6\" OLED", 6, "Popular", "laptop",
     "/products/xps15.jpg",
     "Portable créatif 15 po puissant avec un superbe écran OLED."),
    ("MacBook Air M3", "laptops", "Apple", 1199.00, None,
     "Incredibly thin, silent and fast with the Apple M3 chip.",
     "Apple M3 · 16GB RAM · 512GB SSD · 13.6\" Liquid Retina", 9, None, "laptop",
     "/products/macbook-air.jpg",
     "Incroyablement fin, silencieux et rapide grâce à la puce Apple M3."),
    ("ThinkPad X1 Carbon", "laptops", "Lenovo", 1649.00, 1799.00,
     "Legendary business laptop: rugged, light and secure.",
     "Intel Core i7-1355U · 16GB RAM · 1TB SSD · 14\" WUXGA", 8, "Sale", "laptop",
     "/products/thinkpad.jpg",
     "Le portable professionnel légendaire : robuste, léger et sécurisé."),
    ("ROG Zephyrus G14", "laptops", "ASUS", 1599.00, None,
     "Compact gaming powerhouse with high-refresh display.",
     "AMD Ryzen 9 8945HS · 16GB RAM · 1TB SSD · RTX 4070 · 14\" 165Hz", 5, "Gaming", "laptop",
     "/products/rog.jpg",
     "Concentré de puissance gaming compact avec écran à haut taux de rafraîchissement."),
    ("Aspire 5 Essential", "laptops", "Acer", 549.00, 649.00,
     "Great value everyday laptop for work, study and browsing.",
     "AMD Ryzen 5 7530U · 8GB RAM · 512GB SSD · 15.6\" FHD", 20, "Best Value", "laptop",
     "/products/aspire.jpg",
     "Excellent portable au quotidien pour le travail, les études et la navigation."),
    ("Galaxy Book4 Pro", "laptops", "Samsung", 1449.00, None,
     "Ultra-slim premium laptop with vivid AMOLED touchscreen.",
     "Intel Core Ultra 7 · 16GB RAM · 512GB SSD · 14\" AMOLED Touch", 7, "New", "laptop",
     "/products/galaxy-book.jpg",
     "Portable premium ultra-fin avec écran tactile AMOLED éclatant."),
    ("Pavilion 15", "laptops", "HP", 749.00, None,
     "Reliable all-rounder for home and office with fast SSD storage.",
     "Intel Core i5-1335U · 16GB RAM · 512GB SSD · 15.6\" FHD", 15, None, "laptop",
     "/products/pavilion.jpg",
     "Polyvalent et fiable pour la maison et le bureau avec stockage SSD rapide."),

    # --- Accessories / equipment ---
    ("MX Master 3S Mouse", "accessories", "Logitech", 99.00, None,
     "Flagship wireless mouse with silent clicks and 8K DPI precision.",
     "Bluetooth / USB receiver · 70-day battery · Ergonomic", 30, "Popular", "mouse",
     "/products/mouse.jpg",
     "Souris sans fil haut de gamme avec clics silencieux et précision 8K DPI."),
    ("Mechanical Keyboard K8 Pro", "accessories", "Keychron", 109.00, 129.00,
     "Hot-swappable wireless mechanical keyboard with white backlight.",
     "Gateron Pro switches · Bluetooth 5.1 · Mac / Windows", 18, "Sale", "keyboard",
     "/products/keyboard.jpg",
     "Clavier mécanique sans fil à interrupteurs remplaçables avec rétroéclairage blanc."),
    ("USB-C Docking Station", "accessories", "Anker", 149.00, None,
     "Turn one USB-C port into 12: dual 4K HDMI, Ethernet, USB and more.",
     "12-in-1 · 100W PD pass-through · Dual 4K@60Hz", 14, None, "dock",
     "/products/dock.jpg",
     "Transformez un port USB-C en 12 : double HDMI 4K, Ethernet, USB et plus."),
    ("Laptop Backpack Pro 17\"", "accessories", "Targus", 79.00, None,
     "Water-resistant backpack with padded compartment up to 17.3\".",
     "Anti-theft pocket · USB charge port · Rain cover", 25, None, "bag",
     "/products/backpack.jpg",
     "Sac à dos résistant à l'eau avec compartiment rembourré jusqu'à 17,3 po."),
    ("970 EVO Plus 2TB NVMe SSD", "accessories", "Samsung", 159.00, 199.00,
     "Blazing-fast NVMe storage upgrade for any modern laptop.",
     "PCIe 3.0 x4 · Read 3500MB/s · 5-year warranty", 22, "Sale", "ssd",
     "/products/ssd.jpg",
     "Mise à niveau de stockage NVMe ultra-rapide pour tout portable moderne."),
    ("32GB DDR5 SODIMM Kit", "accessories", "Crucial", 119.00, None,
     "Double your laptop memory for smooth heavy multitasking.",
     "2×16GB · DDR5-5600 · CL46 · 1.1V", 16, None, "ram",
     "/products/ram.jpg",
     "Doublez la mémoire de votre portable pour un multitâche intensif et fluide."),
    ("Laptop Cooling Pad RGB", "accessories", "Havit", 39.00, None,
     "Five quiet fans keep your laptop cool during long sessions.",
     "Fits 12–17\" · Adjustable height · Dual USB hub", 28, "Best Value", "fan",
     "/products/cooling.jpg",
     "Cinq ventilateurs silencieux gardent votre portable au frais pendant les longues sessions."),
    ("65W GaN USB-C Charger", "accessories", "Ugreen", 45.00, 55.00,
     "Pocket-size fast charger for laptops, tablets and phones.",
     "65W PD 3.0 · 2×USB-C + USB-A · Foldable plug", 40, "Sale", "charger",
     "/products/charger.jpg",
     "Chargeur rapide de poche pour portables, tablettes et téléphones."),
    ("27\" 4K IPS Monitor", "accessories", "LG", 349.00, None,
     "Sharp 4K external display with USB-C 90W laptop charging.",
     "27\" UHD IPS · USB-C 90W · HDR10 · Height adjustable", 10, "Popular", "monitor",
     "/products/monitor.jpg",
     "Écran externe 4K net avec charge de portable USB-C 90 W."),
    ("1080p Webcam with Mic", "accessories", "Logitech", 59.00, None,
     "Crisp full-HD video calls with auto light correction.",
     "1080p/30fps · Stereo mics · Privacy shutter", 35, None, "webcam",
     "/products/webcam.jpg",
     "Appels vidéo full HD nets avec correction automatique de la lumière."),
]

SERVICES = [
    ("Diagnostics & Health Check",
     "Full hardware and software inspection with a detailed report and repair quote. Free when you proceed with any repair.",
     0, "30–60 min", "search",
     "Diagnostic et bilan de santé",
     "Inspection matérielle et logicielle complète avec rapport détaillé et devis. Gratuit si vous procédez à une réparation.",
     "30–60 min"),
    ("Virus & Malware Removal",
     "Deep-clean of viruses, malware, adware and browser hijackers, plus security hardening to keep you protected.",
     49, "Same day", "shield",
     "Suppression de virus et malwares",
     "Nettoyage en profondeur des virus, malwares et publiciels, plus un renforcement de la sécurité pour rester protégé.",
     "Le jour même"),
    ("Screen Replacement",
     "Cracked or dead display replaced with a quality panel — matte, glossy or touch — with warranty on parts and labour.",
     89, "24–48 h", "screen",
     "Remplacement d'écran",
     "Écran fissuré ou défectueux remplacé par une dalle de qualité — mate, brillante ou tactile — avec garantie pièces et main-d'œuvre.",
     "24–48 h"),
    ("Hardware Upgrade",
     "Boost performance with SSD, RAM or battery upgrades. We migrate your data and tune the system for you.",
     39, "Same day", "chip",
     "Mise à niveau matérielle",
     "Boostez les performances avec une mise à niveau SSD, RAM ou batterie. Nous migrons vos données et optimisons le système.",
     "Le jour même"),
    ("Data Recovery",
     "Recover documents, photos and projects from failing drives, accidental deletion or corrupted systems.",
     79, "1–3 days", "database",
     "Récupération de données",
     "Récupérez documents, photos et projets depuis des disques défaillants, une suppression accidentelle ou des systèmes corrompus.",
     "1–3 jours"),
    ("OS Installation & Setup",
     "Clean install of Windows, macOS or Linux with drivers, updates and your essential software configured.",
     59, "Same day", "os",
     "Installation et configuration d'OS",
     "Installation propre de Windows, macOS ou Linux avec pilotes, mises à jour et vos logiciels essentiels configurés.",
     "Le jour même"),
    ("Deep Cleaning & Thermal Service",
     "Internal dust removal, fan service and fresh thermal paste — cooler, quieter and faster.",
     45, "2–4 h", "fan",
     "Nettoyage en profondeur et service thermique",
     "Dépoussiérage interne, entretien des ventilateurs et pâte thermique neuve — plus frais, plus silencieux et plus rapide.",
     "2–4 h"),
    ("Business IT Support",
     "On-site and remote maintenance contracts for small businesses: networks, backups, printers and workstations.",
     99, "Contract", "briefcase",
     "Support informatique aux entreprises",
     "Contrats de maintenance sur site et à distance pour petites entreprises : réseaux, sauvegardes, imprimantes et postes de travail.",
     "Contrat"),
]


LOTS = [
    {
        "name": "Office Starter Lot", "name_fr": "Lot Bureau Essentiel",
        "description": "Twenty tested office machines ready to deploy, ideal for a "
                       "small business refresh or a first reseller order.",
        "description_fr": "Vingt postes bureautiques testés et prêts à déployer, idéals "
                          "pour renouveler une PME ou pour une première commande revendeur.",
        "discount": 0.30, "badge": "Best Value",
        "lead_time": "Ships within 3 business days",
        "lead_time_fr": "Expédié sous 3 jours ouvrables",
        "items": [("Aspire 5 Essential", 12, "grade_a"), ("Pavilion 15", 8, "refurbished")],
    },
    {
        "name": "Business Mobility Lot", "name_fr": "Lot Mobilité Affaires",
        "description": "Twelve premium business ultrabooks, every unit cleaned, "
                       "reinstalled and covered by our 180 day warranty.",
        "description_fr": "Douze ultraportables professionnels haut de gamme, chaque "
                          "appareil nettoyé, réinstallé et couvert par notre garantie 180 jours.",
        "discount": 0.30, "badge": "Popular",
        "lead_time": "Ships within 5 business days",
        "lead_time_fr": "Expédié sous 5 jours ouvrables",
        "items": [("ThinkPad X1 Carbon", 6, "grade_a"), ("ProBook Ultra 14", 6, "grade_a")],
    },
    {
        "name": "Creative Studio Lot", "name_fr": "Lot Studio Créatif",
        "description": "Nine high performance machines for editing, rendering and "
                       "design work, sold as one turnkey batch.",
        "description_fr": "Neuf machines haute performance pour le montage, le rendu et "
                          "le design, vendues en un seul lot clé en main.",
        "discount": 0.27, "badge": "New",
        "lead_time": "Ships within 7 business days",
        "lead_time_fr": "Expédié sous 7 jours ouvrables",
        "items": [("XPS 15 Creator", 4, "new"), ("MacBook Air M3", 3, "new"),
                  ("ROG Zephyrus G14", 2, "new")],
    },
    {
        "name": "Full Deployment Lot", "name_fr": "Lot Déploiement Complet",
        "description": "Ten workstations delivered complete with docking stations and "
                       "peripherals, so every desk is ready on day one.",
        "description_fr": "Dix postes livrés complets avec stations d'accueil et "
                          "périphériques, pour que chaque bureau soit prêt dès le premier jour.",
        "discount": 0.30, "badge": None,
        "lead_time": "Ships within 3 business days",
        "lead_time_fr": "Expédié sous 3 jours ouvrables",
        "items": [("Aspire 5 Essential", 10, "refurbished"),
                  ("USB-C Docking Station", 10, "new"),
                  ("MX Master 3S Mouse", 10, "new")],
    },
]


def init_db():
    conn = connect()
    cur = conn.cursor()
    ph = "%s" if IS_POSTGRES else "?"

    migrations_pg = [
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS rental_price REAL",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod'",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'purchase'",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS rental_start TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS rental_end TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee REAL",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_distance_km REAL",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_mode TEXT",
        "ALTER TABLE lot_items ADD COLUMN IF NOT EXISTS grade TEXT NOT NULL DEFAULT 'refurbished'",
    ]
    migrations_sqlite = [
        "ALTER TABLE products ADD COLUMN images TEXT",
        "ALTER TABLE products ADD COLUMN rental_price REAL",
        "ALTER TABLE products ADD COLUMN position INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cod'",
        "ALTER TABLE orders ADD COLUMN stripe_session_id TEXT",
        "ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'purchase'",
        "ALTER TABLE orders ADD COLUMN rental_start TEXT",
        "ALTER TABLE orders ADD COLUMN rental_end TEXT",
        "ALTER TABLE orders ADD COLUMN shipping_fee REAL",
        "ALTER TABLE orders ADD COLUMN shipping_distance_km REAL",
        "ALTER TABLE orders ADD COLUMN shipping_mode TEXT",
        "ALTER TABLE lot_items ADD COLUMN grade TEXT NOT NULL DEFAULT 'refurbished'",
    ]
    if IS_POSTGRES:
        cur.execute(SCHEMA)
        for stmt in migrations_pg:
            cur.execute(stmt)
    else:
        cur.executescript(SCHEMA)
        for stmt in migrations_sqlite:
            try:
                cur.execute(stmt)
            except sqlite3.OperationalError:
                pass  # column already exists

    def count(table):
        cur2 = conn.cursor()
        cur2.execute(f"SELECT COUNT(*) AS c FROM {table}")
        return cur2.fetchone()["c"]

    if count("products") == 0:
        marks = ",".join([ph] * 12)
        cur.executemany(
            "INSERT INTO products (name, category, brand, price, old_price, description, specs,"
            f" stock, badge, icon, image, description_fr) VALUES ({marks})", PRODUCTS)
        rental_rates = {
            "ProBook Ultra 14": 8, "XPS 15 Creator": 12, "MacBook Air M3": 10,
            "ThinkPad X1 Carbon": 10, "ROG Zephyrus G14": 15, "Aspire 5 Essential": 5,
            "Galaxy Book4 Pro": 10, "Pavilion 15": 6,
        }
        for name, rate in rental_rates.items():
            cur.execute(f"UPDATE products SET rental_price = {ph} WHERE name = {ph}", (rate, name))
    if count("services") == 0:
        marks = ",".join([ph] * 8)
        cur.executemany(
            "INSERT INTO services (name, description, price_from, duration, icon, name_fr,"
            f" description_fr, duration_fr) VALUES ({marks})", SERVICES)
    if count("lots") == 0:
        for lot in LOTS:
            # Resolve the manifest first so the lot price follows its contents
            # instead of being a constant that drifts the moment items change.
            resolved = []
            for position, (product_name, qty, grade) in enumerate(lot["items"]):
                cur.execute(f"SELECT id, name, specs, icon, price FROM products WHERE name = {ph}",
                            (product_name,))
                p = cur.fetchone()
                if p is not None:
                    resolved.append((p, qty, grade, position))
            retail = sum(p["price"] * qty for p, qty, _, _ in resolved)
            price = round(retail * (1 - lot["discount"]), -1)

            cur.execute(
                "INSERT INTO lots (name, name_fr, description, description_fr, price,"
                f" badge, status, lead_time, lead_time_fr, created_at) VALUES ({','.join([ph] * 10)})"
                + (" RETURNING id" if IS_POSTGRES else ""),
                (lot["name"], lot["name_fr"], lot["description"], lot["description_fr"],
                 price, lot["badge"], "available",
                 lot["lead_time"], lot["lead_time_fr"], datetime.utcnow().isoformat()))
            lot_id = cur.fetchone()["id"] if IS_POSTGRES else cur.lastrowid

            for p, qty, grade, position in resolved:
                cur.execute(
                    "INSERT INTO lot_items (lot_id, product_id, name, specs, icon, grade, qty,"
                    f" unit_value, position) VALUES ({','.join([ph] * 9)})",
                    (lot_id, p["id"], p["name"], p["specs"], p["icon"], grade, qty,
                     p["price"], position))
    if count("users") == 0:
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        cur.execute(
            f"INSERT INTO users (username, password_hash, role) VALUES ({ph},{ph},{ph})",
            ("admin", generate_password_hash(admin_password), "admin"))
    if count("shipping_settings") == 0:
        cur.execute(
            f"INSERT INTO shipping_settings (office_address, updated_at) VALUES ({ph},{ph})",
            ("", datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Authentication required"}), 401
        row = fetch_one("SELECT role FROM users WHERE id = ?", (session["user_id"],))
        if row is None or row["role"] != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return wrapper


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "MajustelServices API",
                    "database": "postgres" if IS_POSTGRES else "sqlite"})


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    row = fetch_one("SELECT * FROM users WHERE username = ?", (username,))
    if row is None or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401
    session["user_id"] = row["id"]
    return jsonify({"id": row["id"], "username": row["username"], "role": row["role"]})


@app.post("/api/auth/logout")
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logged out"})


@app.get("/api/auth/me")
def me():
    if not session.get("user_id"):
        return jsonify({"user": None})
    row = fetch_one("SELECT id, username, role FROM users WHERE id = ?", (session["user_id"],))
    if row is None:
        session.pop("user_id", None)
        return jsonify({"user": None})
    return jsonify({"user": dict(row)})


# ---------------------------------------------------------------------------
# Admin: products & orders management
# ---------------------------------------------------------------------------

PRODUCT_FIELDS = ["name", "category", "brand", "price", "old_price",
                  "description", "specs", "stock", "badge", "icon", "image",
                  "description_fr", "images", "rental_price"]
ORDER_STATUSES = ["new", "awaiting_payment", "paid", "processing", "shipped",
                  "completed", "cancelled"]
MAX_IMAGES = 5


def product_to_dict(row):
    d = dict(row)
    try:
        d["images"] = json.loads(d.get("images") or "[]")
    except (TypeError, ValueError):
        d["images"] = []
    return d


def product_payload(data, partial=False):
    errors = []
    values = {}
    for field in PRODUCT_FIELDS:
        if field in data:
            values[field] = data[field]
    if not partial:
        for field in ["name", "category", "brand", "price"]:
            if not str(data.get(field, "")).strip():
                errors.append(field)
    for num_field in ["price", "old_price", "rental_price"]:
        if values.get(num_field) not in (None, ""):
            try:
                values[num_field] = float(values[num_field])
            except (TypeError, ValueError):
                errors.append(num_field)
        elif num_field in values:
            values[num_field] = None
    if "stock" in values:
        try:
            values["stock"] = max(0, int(values["stock"] or 0))
        except (TypeError, ValueError):
            errors.append("stock")
    if values.get("category") not in (None, "laptops", "accessories"):
        errors.append("category")
    if "images" in values:
        imgs = values["images"] or []
        if not isinstance(imgs, list) or not all(isinstance(i, str) for i in imgs):
            errors.append("images")
        else:
            imgs = [i.strip() for i in imgs if i.strip()][:MAX_IMAGES]
            values["images"] = json.dumps(imgs)
            values["image"] = imgs[0] if imgs else None
    return values, errors


@app.post("/api/admin/products")
@require_admin
def admin_create_product():
    values, errors = product_payload(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"error": f"Invalid or missing fields: {', '.join(errors)}"}), 400
    values.setdefault("description", "")
    values.setdefault("specs", "")
    values.setdefault("stock", 10)
    values.setdefault("icon", "laptop")
    max_position = fetch_one("SELECT COALESCE(MAX(position), -1) AS m FROM products")
    values["position"] = max_position["m"] + 1
    cols = ", ".join(values.keys())
    marks = ", ".join("?" * len(values))
    new_id = insert_returning_id(
        f"INSERT INTO products ({cols}) VALUES ({marks})", list(values.values()))
    get_db().commit()
    row = fetch_one("SELECT * FROM products WHERE id = ?", (new_id,))
    return jsonify(product_to_dict(row)), 201


@app.put("/api/admin/products/<int:product_id>")
@require_admin
def admin_update_product(product_id):
    if fetch_one("SELECT id FROM products WHERE id = ?", (product_id,)) is None:
        return jsonify({"error": "Product not found"}), 404
    values, errors = product_payload(request.get_json(silent=True) or {}, partial=True)
    if errors:
        return jsonify({"error": f"Invalid fields: {', '.join(errors)}"}), 400
    if not values:
        return jsonify({"error": "No fields to update"}), 400
    assignments = ", ".join(f"{k} = ?" for k in values)
    db_execute(f"UPDATE products SET {assignments} WHERE id = ?",
               [*values.values(), product_id])
    get_db().commit()
    row = fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
    return jsonify(product_to_dict(row))


@app.delete("/api/admin/products/<int:product_id>")
@require_admin
def admin_delete_product(product_id):
    cur = db_execute("DELETE FROM products WHERE id = ?", (product_id,))
    get_db().commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product deleted"})


@app.put("/api/admin/products/reorder")
@require_admin
def admin_reorder_products():
    data = request.get_json(silent=True) or {}
    order = data.get("order")
    if not isinstance(order, list) or not order:
        return jsonify({"error": "order must be a non-empty list of product ids"}), 400
    try:
        ids = [int(i) for i in order]
    except (TypeError, ValueError):
        return jsonify({"error": "order must contain integer ids"}), 400
    for position, product_id in enumerate(ids):
        db_execute("UPDATE products SET position = ? WHERE id = ?", (position, product_id))
    get_db().commit()
    rows = fetch_all("SELECT * FROM products ORDER BY position, id")
    return jsonify([product_to_dict(r) for r in rows])


SERVICE_FIELDS = ["name", "description", "price_from", "duration", "icon",
                  "name_fr", "description_fr", "duration_fr"]


def service_payload(data, partial=False):
    errors = []
    values = {f: data[f] for f in SERVICE_FIELDS if f in data}
    if not partial:
        for field in ["name", "description", "duration"]:
            if not str(data.get(field, "")).strip():
                errors.append(field)
        if "price_from" not in data:
            errors.append("price_from")
    if "price_from" in values:
        try:
            values["price_from"] = max(0.0, float(values["price_from"] or 0))
        except (TypeError, ValueError):
            errors.append("price_from")
    return values, errors


@app.post("/api/admin/services")
@require_admin
def admin_create_service():
    values, errors = service_payload(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"error": f"Invalid or missing fields: {', '.join(errors)}"}), 400
    values.setdefault("icon", "wrench")
    cols = ", ".join(values.keys())
    marks = ", ".join("?" * len(values))
    new_id = insert_returning_id(
        f"INSERT INTO services ({cols}) VALUES ({marks})", list(values.values()))
    get_db().commit()
    row = fetch_one("SELECT * FROM services WHERE id = ?", (new_id,))
    return jsonify(dict(row)), 201


@app.put("/api/admin/services/<int:service_id>")
@require_admin
def admin_update_service(service_id):
    if fetch_one("SELECT id FROM services WHERE id = ?", (service_id,)) is None:
        return jsonify({"error": "Service not found"}), 404
    values, errors = service_payload(request.get_json(silent=True) or {}, partial=True)
    if errors:
        return jsonify({"error": f"Invalid fields: {', '.join(errors)}"}), 400
    if not values:
        return jsonify({"error": "No fields to update"}), 400
    assignments = ", ".join(f"{k} = ?" for k in values)
    db_execute(f"UPDATE services SET {assignments} WHERE id = ?",
               [*values.values(), service_id])
    get_db().commit()
    row = fetch_one("SELECT * FROM services WHERE id = ?", (service_id,))
    return jsonify(dict(row))


@app.delete("/api/admin/services/<int:service_id>")
@require_admin
def admin_delete_service(service_id):
    cur = db_execute("DELETE FROM services WHERE id = ?", (service_id,))
    get_db().commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Service not found"}), 404
    return jsonify({"message": "Service deleted"})


# ---------------------------------------------------------------------------
# Lots: bulk batches of machines sold to resellers
# ---------------------------------------------------------------------------

LOT_FIELDS = ["name", "name_fr", "description", "description_fr", "price",
              "badge", "status", "lead_time", "lead_time_fr"]
LOT_GRADES = ["new", "grade_a", "refurbished"]
LOT_STATUSES = ["available", "reserved", "sold"]
MAX_LOT_ITEMS = 25


def lot_item_covers(items):
    """Cover photo per catalogue product, read live so it follows the product."""
    ids = {i["product_id"] for i in items if i.get("product_id")}
    if not ids:
        return {}
    marks = ", ".join("?" * len(ids))
    rows = fetch_all(f"SELECT id, image, images FROM products WHERE id IN ({marks})", list(ids))
    covers = {}
    for row in rows:
        try:
            gallery = json.loads(row["images"] or "[]")
        except (TypeError, ValueError):
            gallery = []
        covers[row["id"]] = (gallery[0] if gallery else None) or row["image"]
    return covers


def lot_to_dict(row):
    """Serialize a lot with its manifest and the figures a reseller compares on."""
    lot = dict(row)
    lot.pop("grade", None)  # grade moved onto each machine; column may linger on old rows
    items = [dict(i) for i in fetch_all(
        "SELECT * FROM lot_items WHERE lot_id = ? ORDER BY position, id", (lot["id"],))]
    covers = lot_item_covers(items)
    for item in items:
        item["qty"] = int(item["qty"] or 0)
        item["unit_value"] = float(item["unit_value"]) if item["unit_value"] is not None else None
        item["subtotal"] = round(item["qty"] * (item["unit_value"] or 0), 2)
        item["image"] = covers.get(item.get("product_id"))
    unit_count = sum(i["qty"] for i in items)
    retail_value = round(sum(i["subtotal"] for i in items), 2)
    lot["items"] = items
    lot["unit_count"] = unit_count
    lot["retail_value"] = retail_value
    lot["unit_price"] = round(lot["price"] / unit_count, 2) if unit_count else None
    lot["savings"] = round(retail_value - lot["price"], 2) if retail_value else 0
    return lot


def lot_items_payload(raw):
    """Normalize the manifest. Rows may reference a product or be typed by hand."""
    errors = []
    items = []
    if not isinstance(raw, list):
        return [], ["items"]
    for position, entry in enumerate(raw[:MAX_LOT_ITEMS]):
        if not isinstance(entry, dict):
            errors.append(f"items[{position}]")
            continue
        try:
            qty = max(1, int(entry.get("qty") or 1))
        except (TypeError, ValueError):
            errors.append(f"items[{position}].qty")
            continue

        product_id = entry.get("product_id")
        product = None
        if product_id not in (None, ""):
            try:
                product_id = int(product_id)
            except (TypeError, ValueError):
                errors.append(f"items[{position}].product_id")
                continue
            product = fetch_one(
                "SELECT id, name, specs, icon, price FROM products WHERE id = ?", (product_id,))
            if product is None:
                errors.append(f"items[{position}].product_id")
                continue
        else:
            product_id = None

        # A product row only needs a quantity: everything else is copied from the
        # catalogue, while a hand typed row carries its own name, specs and value.
        name = str(entry.get("name") or (product["name"] if product else "")).strip()
        if not name:
            errors.append(f"items[{position}].name")
            continue
        specs = str(entry.get("specs") or (product["specs"] if product else "")).strip()
        icon = str(entry.get("icon") or (product["icon"] if product else "laptop")).strip()

        grade = entry.get("grade") or "refurbished"
        if grade not in LOT_GRADES:
            errors.append(f"items[{position}].grade")
            continue

        unit_value = entry.get("unit_value")
        if unit_value in (None, ""):
            unit_value = product["price"] if product else None
        if unit_value is not None:
            try:
                unit_value = float(unit_value)
            except (TypeError, ValueError):
                errors.append(f"items[{position}].unit_value")
                continue

        items.append({"product_id": product_id, "name": name, "specs": specs, "icon": icon,
                      "grade": grade, "qty": qty, "unit_value": unit_value, "position": position})
    return items, errors


def lot_payload(data, partial=False):
    errors = []
    values = {f: data[f] for f in LOT_FIELDS if f in data}
    if not partial:
        if not str(data.get("name", "")).strip():
            errors.append("name")
        if "price" not in data:
            errors.append("price")
    if "price" in values:
        try:
            values["price"] = max(0.0, float(values["price"] or 0))
        except (TypeError, ValueError):
            errors.append("price")
    if values.get("status") not in (None, *LOT_STATUSES):
        errors.append("status")
    return values, errors


def replace_lot_items(lot_id, items):
    db_execute("DELETE FROM lot_items WHERE lot_id = ?", (lot_id,))
    for item in items:
        db_execute(
            "INSERT INTO lot_items (lot_id, product_id, name, specs, icon, grade, qty,"
            " unit_value, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (lot_id, item["product_id"], item["name"], item["specs"], item["icon"],
             item["grade"], item["qty"], item["unit_value"], item["position"]))


@app.get("/api/lots")
def list_lots():
    rows = fetch_all(
        "SELECT * FROM lots ORDER BY CASE status WHEN 'available' THEN 0 WHEN 'reserved'"
        " THEN 1 ELSE 2 END, id")
    return jsonify([lot_to_dict(r) for r in rows])


@app.get("/api/lots/<int:lot_id>")
def get_lot(lot_id):
    row = fetch_one("SELECT * FROM lots WHERE id = ?", (lot_id,))
    if row is None:
        return jsonify({"error": "Lot not found"}), 404
    return jsonify(lot_to_dict(row))


@app.post("/api/admin/lots")
@require_admin
def admin_create_lot():
    data = request.get_json(silent=True) or {}
    values, errors = lot_payload(data)
    items, item_errors = lot_items_payload(data.get("items") or [])
    errors += item_errors
    if errors:
        return jsonify({"error": f"Invalid or missing fields: {', '.join(errors)}"}), 400
    values.setdefault("status", "available")
    values["created_at"] = datetime.utcnow().isoformat()
    cols = ", ".join(values.keys())
    marks = ", ".join("?" * len(values))
    lot_id = insert_returning_id(f"INSERT INTO lots ({cols}) VALUES ({marks})",
                                list(values.values()))
    replace_lot_items(lot_id, items)
    get_db().commit()
    return jsonify(lot_to_dict(fetch_one("SELECT * FROM lots WHERE id = ?", (lot_id,)))), 201


@app.put("/api/admin/lots/<int:lot_id>")
@require_admin
def admin_update_lot(lot_id):
    if fetch_one("SELECT id FROM lots WHERE id = ?", (lot_id,)) is None:
        return jsonify({"error": "Lot not found"}), 404
    data = request.get_json(silent=True) or {}
    values, errors = lot_payload(data, partial=True)
    items, item_errors = ([], [])
    if "items" in data:
        items, item_errors = lot_items_payload(data.get("items") or [])
    errors += item_errors
    if errors:
        return jsonify({"error": f"Invalid fields: {', '.join(errors)}"}), 400
    if values:
        assignments = ", ".join(f"{k} = ?" for k in values)
        db_execute(f"UPDATE lots SET {assignments} WHERE id = ?", [*values.values(), lot_id])
    if "items" in data:
        replace_lot_items(lot_id, items)
    get_db().commit()
    return jsonify(lot_to_dict(fetch_one("SELECT * FROM lots WHERE id = ?", (lot_id,))))


@app.delete("/api/admin/lots/<int:lot_id>")
@require_admin
def admin_delete_lot(lot_id):
    db_execute("DELETE FROM lot_items WHERE lot_id = ?", (lot_id,))
    cur = db_execute("DELETE FROM lots WHERE id = ?", (lot_id,))
    get_db().commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Lot not found"}), 404
    return jsonify({"message": "Lot deleted"})


@app.get("/api/admin/orders")
@require_admin
def admin_list_orders():
    rows = fetch_all("SELECT * FROM orders ORDER BY id DESC")
    return jsonify([dict(r) for r in rows])


@app.put("/api/admin/orders/<int:order_id>")
@require_admin
def admin_update_order(order_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ORDER_STATUSES:
        return jsonify({"error": f"Status must be one of: {', '.join(ORDER_STATUSES)}"}), 400
    existing = fetch_one("SELECT status FROM orders WHERE id = ?", (order_id,))
    if existing is None:
        return jsonify({"error": "Order not found"}), 404
    changed = existing["status"] != status
    db_execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    get_db().commit()
    row = fetch_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    if changed:
        emoji, heading, message = STATUS_EMAIL_COPY.get(
            status, ("📦", "Order update", "Your order status has changed."))
        send_order_email(dict(row), heading, emoji, message)
    return jsonify(dict(row))


# ---------------------------------------------------------------------------
# Shipping: office address + distance-based fee tiers
# ---------------------------------------------------------------------------

SHIPPING_NUMERIC_FIELDS = ["free_km", "tier2_km", "tier2_price",
                          "tier3_km", "tier3_price", "tier4_km", "tier4_price"]


def get_shipping_settings():
    row = fetch_one("SELECT * FROM shipping_settings ORDER BY id LIMIT 1")
    return dict(row) if row else None


def google_distance_km(origin, destination):
    """Driving distance in km between two addresses, or None if it can't be resolved.

    Every failure is logged: a silent None here shows up as a plain HTTP 200 with
    mode 'unavailable', which is impossible to diagnose from an access log alone.
    """
    if not GOOGLE_MAPS_SERVER_KEY:
        app.logger.warning("Shipping: GOOGLE_MAPS_SERVER_KEY is not set, distance skipped")
        return None
    params = urllib.parse.urlencode({
        "origins": origin, "destinations": destination,
        "units": "metric", "key": GOOGLE_MAPS_SERVER_KEY,
    })
    url = f"https://maps.googleapis.com/maps/api/distancematrix/json?{params}"
    try:
        with urllib.request.urlopen(url, timeout=6) as resp:
            data = json.loads(resp.read())
    except Exception as exc:
        app.logger.warning("Shipping: Distance Matrix call failed: %s", exc)
        return None

    # A rejected key (referrer restriction, API not enabled, billing off) answers
    # with a top level status and an empty rows list, never with an element.
    if data.get("status") != "OK":
        app.logger.warning("Shipping: Distance Matrix refused the request (%s): %s",
                           data.get("status"), data.get("error_message") or "no detail given")
        return None
    try:
        element = data["rows"][0]["elements"][0]
    except (KeyError, IndexError):
        app.logger.warning("Shipping: Distance Matrix returned no rows")
        return None
    if element.get("status") != "OK":
        app.logger.warning("Shipping: no route to %r (%s)", destination, element.get("status"))
        return None
    return element["distance"]["value"] / 1000.0


def compute_shipping(address):
    """Distance-tiered shipping fee from the configured office address.

    Returns fee=None with mode 'canada_post' (beyond the last tier) or
    'unavailable' (no office address configured, or the distance couldn't be
    resolved) — both mean the fee needs a manual quote rather than an
    automatic charge.
    """
    settings = get_shipping_settings()
    address = str(address or "").strip()
    if not settings or not settings["office_address"].strip() or not address:
        return {"fee": None, "distance_km": None, "mode": "unavailable"}
    distance_km = google_distance_km(settings["office_address"], address)
    if distance_km is None:
        return {"fee": None, "distance_km": None, "mode": "unavailable"}
    distance_km = round(distance_km, 1)
    if distance_km <= settings["free_km"]:
        return {"fee": 0.0, "distance_km": distance_km, "mode": "free"}
    if distance_km <= settings["tier2_km"]:
        return {"fee": settings["tier2_price"], "distance_km": distance_km, "mode": "flat"}
    if distance_km <= settings["tier3_km"]:
        return {"fee": settings["tier3_price"], "distance_km": distance_km, "mode": "flat"}
    if distance_km <= settings["tier4_km"]:
        return {"fee": settings["tier4_price"], "distance_km": distance_km, "mode": "flat"}
    return {"fee": None, "distance_km": distance_km, "mode": "canada_post"}


@app.get("/api/admin/shipping")
@require_admin
def admin_get_shipping():
    settings = get_shipping_settings() or {}
    settings["geocoding_enabled"] = bool(GOOGLE_MAPS_SERVER_KEY)
    return jsonify(settings)


@app.put("/api/admin/shipping")
@require_admin
def admin_update_shipping():
    data = request.get_json(silent=True) or {}
    values = {}
    errors = []
    if "office_address" in data:
        values["office_address"] = str(data["office_address"]).strip()
    for field in SHIPPING_NUMERIC_FIELDS:
        if field in data:
            try:
                values[field] = max(0.0, float(data[field]))
            except (TypeError, ValueError):
                errors.append(field)
    if errors:
        return jsonify({"error": f"Invalid fields: {', '.join(errors)}"}), 400
    if not values:
        return jsonify({"error": "No fields to update"}), 400

    current = get_shipping_settings() or {}
    merged = {**current, **values}
    if not (merged["free_km"] <= merged["tier2_km"] <= merged["tier3_km"] <= merged["tier4_km"]):
        return jsonify({"error": "Distance tiers must increase: free < tier2 < tier3 < tier4"}), 400

    values["updated_at"] = datetime.utcnow().isoformat()
    assignments = ", ".join(f"{k} = ?" for k in values)
    db_execute(f"UPDATE shipping_settings SET {assignments} WHERE id = ?",
               [*values.values(), current["id"]])
    get_db().commit()
    settings = get_shipping_settings()
    settings["geocoding_enabled"] = bool(GOOGLE_MAPS_SERVER_KEY)
    return jsonify(settings)


@app.post("/api/shipping/quote")
def shipping_quote():
    data = request.get_json(silent=True) or {}
    address = str(data.get("address") or "").strip()
    if not address:
        return jsonify({"error": "Missing address"}), 400
    return jsonify(compute_shipping(address))


# ---------------------------------------------------------------------------
# Order emails: confirmation on placement/payment, update on status change
# ---------------------------------------------------------------------------

# (emoji, heading, message) shown for each order status. Falls back to a
# generic "Order update" for any status not listed here.
STATUS_EMAIL_COPY = {
    "awaiting_payment": ("⏳", "Payment pending", "We're waiting for your payment to go through."),
    "paid": ("✅", "Payment received", "Your payment has been received — we're getting your order ready."),
    "processing": ("🛠️", "Order in progress", "Your order is being prepared."),
    "shipped": ("🚚", "On its way", "Your order is on its way to you."),
    "completed": ("📦", "Order completed", "Your order is complete. Thanks for shopping with us!"),
    "cancelled": ("❌", "Order cancelled", "Your order has been cancelled. Contact us if this is unexpected."),
}


def render_order_email(heading, emoji, message, order):
    """Self-contained HTML email: inline styles only, since email clients
    ignore <style> blocks and external stylesheets almost universally."""
    base = frontend_base_url()
    name = html.escape(order["customer_name"] or "there")
    items = html.escape(order["items"] or "")
    total = f"{order['total']:.2f}"
    heading_esc = html.escape(heading)
    message_esc = html.escape(message)

    shipping_line = ""
    if order.get("shipping_fee"):
        distance = order.get("shipping_distance_km")
        distance_note = f" ({distance} km)" if distance is not None else ""
        shipping_line = (
            f'<p style="margin:6px 0 0;font-size:13px;color:#5b6472;">'
            f'Includes ${order["shipping_fee"]:.2f} shipping{distance_note}</p>'
        )

    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f2f3f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(16,21,29,0.08);">
      <div style="height:6px;background:linear-gradient(90deg,#2470c2,#3b8ede);"></div>
      <div style="padding:36px 24px;text-align:center;background:linear-gradient(135deg,#10151d,#2470c2);">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.3px;">
          Majustel<span style="color:#8ec9f7;">Services</span>
        </span>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 18px;font-size:15px;color:#10151d;">Hello {name},</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#10151d;">{heading_esc} {emoji}</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3a4048;">{message_esc}</p>

        <div style="background:#f6f8fb;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:12px;color:#5b6472;text-transform:uppercase;letter-spacing:0.05em;">Order #{order["id"]}</p>
          <p style="margin:0;font-size:13px;color:#3a4048;font-family:Consolas,Menlo,monospace;word-break:break-word;">{items}</p>
          <p style="margin:10px 0 0;font-size:18px;font-weight:700;color:#10151d;">Total: ${total}</p>
          {shipping_line}
        </div>

        <p style="margin:0;font-size:15px;color:#10151d;">All the best,<br>The MajustelServices Team 💻</p>
      </div>
      <div style="background:#3b8ede;padding:20px 24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#10151d;">majustelservices.ca</p>
        <p style="margin:0;font-size:13px;">
          <a href="{base}/shop" style="color:#10151d;text-decoration:none;font-weight:600;">Shop</a>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <a href="{base}/services" style="color:#10151d;text-decoration:none;font-weight:600;">Services</a>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <a href="{base}/contact" style="color:#10151d;text-decoration:none;font-weight:600;">Contact</a>
        </p>
      </div>
      <div style="background:#10151d;padding:20px 24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;">
          <a href="mailto:hello@majustelservices.ca" style="color:#ffffff;text-decoration:underline;">Contact Us</a>
        </p>
        <p style="margin:0;font-size:11px;color:#8b93a1;">45 Pl. Charles-Le Moyne, Longueuil, QC, Canada, J4K 5G5</p>
        <p style="margin:6px 0 0;font-size:11px;color:#5b6472;">© {datetime.utcnow().year} MajustelServices. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>"""


def send_order_email(order, heading, emoji, message):
    """Best-effort: a broken email provider must never block placing or updating an order."""
    if not RESEND_API_KEY or not order.get("email"):
        return
    try:
        resend.Emails.send({
            "from": ORDER_EMAIL_FROM,
            "to": order["email"],
            "subject": f"{heading} — Order #{order['id']}",
            "html": render_order_email(heading, emoji, message, order),
        })
    except Exception as exc:
        app.logger.warning("Order email failed for order #%s: %s", order.get("id"), exc)


# ---------------------------------------------------------------------------
# Public: products, services, orders, contact
# ---------------------------------------------------------------------------

@app.get("/api/products")
def list_products():
    category = request.args.get("category")
    search = request.args.get("q", "").strip()
    query = "SELECT * FROM products WHERE 1=1"
    params = []
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    if search:
        op = "ILIKE" if IS_POSTGRES else "LIKE"
        query += f" AND (name {op} ? OR brand {op} ? OR description {op} ?)"
        like = f"%{search}%"
        params += [like, like, like]
    rows = fetch_all(query + " ORDER BY position, id", params)
    return jsonify([product_to_dict(r) for r in rows])


@app.get("/api/products/<int:product_id>")
def get_product(product_id):
    row = fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
    if row is None:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product_to_dict(row))


@app.get("/api/services")
def list_services():
    rows = fetch_all("SELECT * FROM services ORDER BY id")
    return jsonify([dict(r) for r in rows])


def validate_cart(data):
    """Validate an order payload; returns (cart, error_response)."""
    required = ["customer_name", "email", "address", "items"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return None, (jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400)
    if not isinstance(data["items"], list) or not data["items"]:
        return None, (jsonify({"error": "Cart is empty"}), 400)

    total = 0.0
    lines = []
    products = []
    for item in data["items"]:
        row = fetch_one("SELECT * FROM products WHERE id = ?", (item.get("id"),))
        if row is None:
            return None, (jsonify({"error": f"Unknown product id {item.get('id')}"}), 400)
        qty = max(1, int(item.get("qty", 1)))
        total += row["price"] * qty
        lines.append(f"{row['name']} x{qty} @ {row['price']:.2f}")
        products.append((row, qty))
    return {"total": round(total, 2), "lines": lines, "products": products}, None


def insert_order(data, cart, shipping, status="new", payment_method="cod"):
    grand_total = round(cart["total"] + (shipping["fee"] or 0), 2)
    order_id = insert_returning_id(
        "INSERT INTO orders (customer_name, email, phone, address, items, total,"
        " status, payment_method, shipping_fee, shipping_distance_km, shipping_mode,"
        " created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (data["customer_name"], data["email"], data.get("phone", ""),
         data["address"], "; ".join(cart["lines"]), grand_total,
         status, payment_method, shipping["fee"], shipping["distance_km"], shipping["mode"],
         datetime.utcnow().isoformat(timespec="seconds")))
    get_db().commit()
    return order_id, grand_total


@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    cart, error = validate_cart(data)
    if error:
        return error
    shipping = compute_shipping(data["address"])
    order_id, grand_total = insert_order(data, cart, shipping)
    order = fetch_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    send_order_email(dict(order), "Order confirmed", "🎉",
                     "Thanks for your order! We've received it and will get started right away. "
                     "We'll email you again as soon as its status changes.")
    return jsonify({"order_id": order_id, "total": grand_total,
                    "shipping_fee": shipping["fee"], "shipping_mode": shipping["mode"],
                    "message": "Order placed successfully. We will contact you to confirm delivery."}), 201


# ---------------------------------------------------------------------------
# Stripe checkout
# ---------------------------------------------------------------------------

@app.post("/api/checkout/session")
def create_checkout_session():
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "Card payment is not configured"}), 503
    data = request.get_json(silent=True) or {}
    cart, error = validate_cart(data)
    if error:
        return error

    shipping = compute_shipping(data["address"])

    line_items = [{
        "price_data": {
            "currency": "cad",
            "product_data": {"name": row["name"]},
            "unit_amount": int(round(row["price"] * 100)),
        },
        "quantity": qty,
    } for row, qty in cart["products"]]
    if shipping["fee"]:
        line_items.append({
            "price_data": {
                "currency": "cad",
                "product_data": {"name": "Shipping"},
                "unit_amount": int(round(shipping["fee"] * 100)),
            },
            "quantity": 1,
        })

    order_id, _ = insert_order(data, cart, shipping, status="awaiting_payment", payment_method="card")
    base = frontend_base_url()
    try:
        checkout = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            customer_email=data["email"],
            metadata={"order_id": str(order_id)},
            success_url=f"{base}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/checkout/cancel",
        )
    except Exception as exc:
        db_execute("DELETE FROM orders WHERE id = ?", (order_id,))
        get_db().commit()
        return jsonify({"error": f"Payment provider error: {exc}"}), 502

    db_execute("UPDATE orders SET stripe_session_id = ? WHERE id = ?",
               (checkout.id, order_id))
    get_db().commit()
    return jsonify({"url": checkout.url})


@app.post("/api/rentals/checkout")
def rental_checkout():
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "Card payment is not configured"}), 503
    data = request.get_json(silent=True) or {}
    required = ["customer_name", "email", "location", "start", "end", "product_id"]
    missing = [f for f in required if not str(data.get(f, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    product = fetch_one("SELECT * FROM products WHERE id = ?", (data["product_id"],))
    if product is None:
        return jsonify({"error": "Product not found"}), 404
    rate = product["rental_price"] or 0
    if rate <= 0:
        return jsonify({"error": "This product is not available for rent"}), 400

    try:
        qty = max(1, int(data.get("qty", 1)))
        start = datetime.fromisoformat(str(data["start"]))
        end = datetime.fromisoformat(str(data["end"]))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid dates or quantity"}), 400
    if end <= start:
        return jsonify({"error": "End must be after start"}), 400

    hours = max(1, math.ceil((end - start).total_seconds() / 3600))
    total = round(rate * hours * qty, 2)
    start_s = start.isoformat(timespec="minutes")
    end_s = end.isoformat(timespec="minutes")
    items_line = (f"RENTAL {product['name']} x{qty} @ {rate:.2f}/h × {hours}h"
                  f" · {start_s} → {end_s}")

    order_id = insert_returning_id(
        "INSERT INTO orders (customer_name, email, phone, address, items, total, status,"
        " payment_method, order_type, rental_start, rental_end, created_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (data["customer_name"], data["email"], data.get("phone", ""),
         data["location"], items_line, total, "awaiting_payment", "card",
         "rental", start_s, end_s,
         datetime.utcnow().isoformat(timespec="seconds")))
    get_db().commit()

    base = frontend_base_url()
    try:
        checkout = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "cad",
                    "product_data": {
                        "name": f"Rental: {product['name']} ({hours}h × {qty})",
                    },
                    "unit_amount": int(round(rate * hours * 100)),
                },
                "quantity": qty,
            }],
            customer_email=data["email"],
            metadata={"order_id": str(order_id), "type": "rental"},
            success_url=f"{base}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/checkout/cancel",
        )
    except Exception as exc:
        db_execute("DELETE FROM orders WHERE id = ?", (order_id,))
        get_db().commit()
        return jsonify({"error": f"Payment provider error: {exc}"}), 502

    db_execute("UPDATE orders SET stripe_session_id = ? WHERE id = ?",
               (checkout.id, order_id))
    get_db().commit()
    return jsonify({"url": checkout.url, "total": total, "hours": hours})


@app.get("/api/checkout/verify")
def verify_checkout():
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "Card payment is not configured"}), 503
    session_id = request.args.get("session_id", "")
    if not session_id:
        return jsonify({"error": "Missing session_id"}), 400
    try:
        checkout = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        return jsonify({"error": f"Payment provider error: {exc}"}), 502

    row = fetch_one("SELECT * FROM orders WHERE stripe_session_id = ?", (session_id,))
    if row is None:
        return jsonify({"error": "Order not found"}), 404
    paid = checkout.payment_status == "paid"
    if paid and row["status"] == "awaiting_payment":
        db_execute("UPDATE orders SET status = 'paid' WHERE id = ?", (row["id"],))
        get_db().commit()
        row = fetch_one("SELECT * FROM orders WHERE id = ?", (row["id"],))
        send_order_email(dict(row), "Order confirmed", "🎉",
                         "Thanks for your order! Your payment has been received and we'll get "
                         "started right away. We'll email you again as soon as its status changes.")
    return jsonify({"paid": paid, "order_id": row["id"], "total": row["total"]})


@app.post("/api/contact")
def contact():
    data = request.get_json(silent=True) or {}
    required = ["name", "email", "subject", "message"]
    missing = [f for f in required if not str(data.get(f, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    db_execute(
        "INSERT INTO messages (name, email, subject, message, created_at) VALUES (?,?,?,?,?)",
        (data["name"], data["email"], data["subject"], data["message"],
         datetime.utcnow().isoformat(timespec="seconds")))
    get_db().commit()
    return jsonify({"message": "Thanks for reaching out! Our team will reply within 24 hours."}), 201


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
