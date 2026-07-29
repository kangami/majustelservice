import os
import sqlite3
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
    description_fr TEXT
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
    created_at TEXT NOT NULL
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


def init_db():
    conn = connect()
    cur = conn.cursor()
    ph = "%s" if IS_POSTGRES else "?"

    if IS_POSTGRES:
        cur.execute(SCHEMA)
    else:
        cur.executescript(SCHEMA)

    def count(table):
        cur2 = conn.cursor()
        cur2.execute(f"SELECT COUNT(*) AS c FROM {table}")
        return cur2.fetchone()["c"]

    if count("products") == 0:
        marks = ",".join([ph] * 12)
        cur.executemany(
            "INSERT INTO products (name, category, brand, price, old_price, description, specs,"
            f" stock, badge, icon, image, description_fr) VALUES ({marks})", PRODUCTS)
    if count("services") == 0:
        marks = ",".join([ph] * 8)
        cur.executemany(
            "INSERT INTO services (name, description, price_from, duration, icon, name_fr,"
            f" description_fr, duration_fr) VALUES ({marks})", SERVICES)
    if count("users") == 0:
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        cur.execute(
            f"INSERT INTO users (username, password_hash, role) VALUES ({ph},{ph},{ph})",
            ("admin", generate_password_hash(admin_password), "admin"))
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
    return jsonify({"status": "ok", "service": "MajustelService API",
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
                  "description_fr"]
ORDER_STATUSES = ["new", "processing", "shipped", "completed", "cancelled"]


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
    for num_field in ["price", "old_price"]:
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
    cols = ", ".join(values.keys())
    marks = ", ".join("?" * len(values))
    new_id = insert_returning_id(
        f"INSERT INTO products ({cols}) VALUES ({marks})", list(values.values()))
    get_db().commit()
    row = fetch_one("SELECT * FROM products WHERE id = ?", (new_id,))
    return jsonify(dict(row)), 201


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
    return jsonify(dict(row))


@app.delete("/api/admin/products/<int:product_id>")
@require_admin
def admin_delete_product(product_id):
    cur = db_execute("DELETE FROM products WHERE id = ?", (product_id,))
    get_db().commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product deleted"})


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
    cur = db_execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    get_db().commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Order not found"}), 404
    row = fetch_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    return jsonify(dict(row))


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
    rows = fetch_all(query + " ORDER BY id", params)
    return jsonify([dict(r) for r in rows])


@app.get("/api/products/<int:product_id>")
def get_product(product_id):
    row = fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
    if row is None:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(dict(row))


@app.get("/api/services")
def list_services():
    rows = fetch_all("SELECT * FROM services ORDER BY id")
    return jsonify([dict(r) for r in rows])


@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    required = ["customer_name", "email", "address", "items"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    if not isinstance(data["items"], list) or not data["items"]:
        return jsonify({"error": "Cart is empty"}), 400

    total = 0.0
    lines = []
    for item in data["items"]:
        row = fetch_one("SELECT * FROM products WHERE id = ?", (item.get("id"),))
        if row is None:
            return jsonify({"error": f"Unknown product id {item.get('id')}"}), 400
        qty = max(1, int(item.get("qty", 1)))
        total += row["price"] * qty
        lines.append(f"{row['name']} x{qty} @ {row['price']:.2f}")

    order_id = insert_returning_id(
        "INSERT INTO orders (customer_name, email, phone, address, items, total, created_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (data["customer_name"], data["email"], data.get("phone", ""),
         data["address"], "; ".join(lines), round(total, 2),
         datetime.utcnow().isoformat(timespec="seconds")))
    get_db().commit()
    return jsonify({"order_id": order_id, "total": round(total, 2),
                    "message": "Order placed successfully. We will contact you to confirm delivery."}), 201


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
