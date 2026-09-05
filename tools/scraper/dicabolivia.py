import re
import time
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from common import clean_image_url, clean_text, fetch, parse_amount, save_json
from config import SCRAPER_DELAY

BASE_URL = "https://dicabolivia.com"
FUENTE = "dicabolivia"

CATEGORIES = [
    {"id": "camaras_dahua", "url": "/product-category/cat-camaras/dahua/", "out": "camaras_dahua", "categoria": "camaras_dahua"},
    {"id": "camaras_hikvision", "url": "/product-category/camaras/hikvision/", "out": "camaras_hikvision", "categoria": "camaras_hikvision"},
    {"id": "camaras_wifi", "url": "/product-category/camaras/camaras-wifi/", "out": "camaras_wifi", "categoria": "camaras_wifi"},
    {"id": "accesorios", "url": "/product-category/camaras/accesorios/", "out": "accesorios_camaras", "categoria": "accesorios_camaras"},
    {"id": "xvr", "url": "/product-category/cat-xvr/", "out": "productos", "categoria": "xvr"},
    {"id": "alarma", "url": "/product-category/alarma/", "out": "alarma", "categoria": "alarma"},
    {"id": "alarmas", "url": "/product-category/alarmas/", "out": "alarmas", "categoria": "alarmas"},
    {"id": "gadgets", "url": "/product-category/gadgets/", "out": "gadgets", "categoria": "gadgets"},
    {"id": "domotica", "url": "/product-category/cat-domotica/", "out": "domotica", "categoria": "domotica"},
    {"id": "acceso", "url": "/product-category/acceso/", "out": "acceso", "categoria": "acceso"},
    {"id": "computadoras_puntoventa", "url": "/product-category/cat-computadoras/cat-puntodeventa/", "out": "computadoras_puntoventa", "categoria": "computadoras_puntodeventa"},
    {"id": "computadoras_cajafuerte", "url": "/product-category/cat-computadoras/caja-fuerte/", "out": "computadoras_cajafuerte", "categoria": "computadoras_cajafuerte"},
    {"id": "router", "url": "/product-category/cat-redes/router/", "out": "router", "categoria": "router"},
    {"id": "switch", "url": "/product-category/cat-redes/switch-cat-redes/", "out": "switch", "categoria": "switch"},
    {"id": "cables", "url": "/product-category/cat-redes/cat-cables/", "out": "cables_redes", "categoria": "cables_redes"},
    {"id": "cableado_estructurado", "url": "/product-category/cat-redes/cableado-estructurado/", "out": "cableado_estructurado", "categoria": "cableado_estructurado"},
    {"id": "discos_duros", "url": "/product-category/discos-duros/", "out": "discos_duros", "categoria": "discos_duros"},
    {"id": "energia", "url": "/product-category/energia/", "out": "energia", "categoria": "energia"},
    {"id": "outlet", "url": "/product-category/outlet/", "out": "outlet", "categoria": "outlet"},
]

CATEGORIES_HINT = (
    "camaras_dahua | camaras_hikvision | camaras_wifi | accesorios | xvr | "
    "alarma | alarmas | gadgets | domotica | acceso | computadoras_puntoventa | "
    "computadoras_cajafuerte | router | switch | cables | cableado_estructurado | "
    "discos_duros | energia | outlet"
)


def collect_product_links(category_url, delay=SCRAPER_DELAY):
    links, page = [], 1
    while True:
        url = category_url if page == 1 else f"{category_url.rstrip('/')}/page/{page}/"
        print(f"[Listado] {url}")
        html = fetch(url, delay=delay, retries=1)
        if html is None:
            break
        soup = BeautifulSoup(html, "lxml")
        container = soup.select_one(
            "div.main-products, div.woocommerce.main-products, "
            "div.ts-product-wrapper div.products"
        )
        items = (container or soup).select("div.products .product, ul.products li.product")
        new_urls = []
        for item in items:
            a = (
                item.select_one(
                    "a.product-image-link, a.product-title-link, "
                    "a.woocommerce-LoopProduct-link, h2 a, h3 a"
                )
                or item.find("a", href=re.compile(r"/product/"))
            )
            href = a.get("href", "").split("#")[0] if a else None
            if href and href not in links and href not in new_urls:
                new_urls.append(urljoin(BASE_URL, href))
        if not new_urls:
            break
        links.extend(new_urls)
        print(f"  -> {len(new_urls)} productos (total: {len(links)})")
        page += 1
        time.sleep(delay)
    return links


def parse_prices(price_el):
    amounts = [
        parse_amount(bdi.get_text())
        for bdi in price_el.select("bdi")
        if bdi.get_text(strip=True)
    ]
    amounts = [a for a in amounts if a is not None]
    if not amounts:
        return None, None
    if len(amounts) == 1:
        return amounts[0], amounts[0]
    return max(amounts), min(amounts)


def parse_metros(text):
    match = re.search(r"(\d{2,4})\s*-?\s*(?:METROS?|MTS?)\b", text or "", re.I)
    return int(match.group(1)) if match else None


def postprocess_category(cat_id, products):
    if cat_id not in ("cables", "cableado_estructurado"):
        return products
    for p in products:
        p["unidad"] = "rollo"
        p["metros"] = None
        p["precio_metro"] = None
        metros = parse_metros(p.get("nombre")) or parse_metros(
            p.get("descripcion_corta")
        )
        base = p.get("precio_oferta") or p.get("precio_regular")
        if metros and base:
            p["metros"] = metros
            p["unidad"] = "metro"
            p["precio_metro"] = round(base / metros, 2)
    return products


def extract_product(url, delay=SCRAPER_DELAY):
    html = fetch(url, delay=delay)
    if html is None:
        return {"url": url, "error": "no se pudo descargar"}
    soup = BeautifulSoup(html, "lxml")

    title_el = soup.select_one("h1.product_title, h1.entry-title, h2.entry-title")
    title = clean_text(title_el.get_text()) if title_el else None

    summary = soup.select_one(".summary") or soup
    price_el = summary.select_one("p.price")
    price_regular, price_sale = (None, None)
    if price_el:
        price_regular, price_sale = parse_prices(price_el)

    sku_el = summary.select_one(".product_meta span.sku, span.sku")
    sku = clean_text(sku_el.get_text()) if sku_el else None

    short_desc_el = summary.select_one(
        ".woocommerce-product-details__short-description"
    )
    short_desc = (
        clean_text(short_desc_el.get_text(" ", strip=True))
        if short_desc_el
        else None
    )

    desc_el = soup.select_one("#tab-description")
    description = (
        clean_text(desc_el.get_text(" ", strip=True)) if desc_el else None
    )

    stock_el = summary.select_one(".availability-text") or summary.select_one(
        ".stock"
    )
    stock_text = (
        clean_text(stock_el.get_text(" ", strip=True)) if stock_el else ""
    )
    stock_qty_match = re.search(r"(\d+)", stock_text)
    stock_qty = int(stock_qty_match.group(1)) if stock_qty_match else None
    stock_class = soup.select_one(".availability.stock")
    classes = " ".join(stock_class.get("class", [])) if stock_class else ""
    if stock_text:
        in_stock = "out-of-stock" not in classes
    else:
        in_stock = None

    post_id = None
    body_match = re.search(r"<body[^>]*\bpostid-(\d+)", html)
    if body_match:
        post_id = int(body_match.group(1))
    else:
        id_input = soup.select_one('input[name="comment_post_ID"]')
        if id_input and id_input.get("value", "").isdigit():
            post_id = int(id_input["value"])
        else:
            dp = soup.select_one('form[data-product_id]')
            if dp and dp.get("data-product_id", "").isdigit():
                post_id = int(dp["data-product_id"])

    categories, tags, brand = [], [], None
    meta = soup.select_one(".product_meta")
    if meta:
        cat_links = meta.select(".posted_in a")
        tag_links = meta.select(".tagged_as a")
        categories = [clean_text(a.get_text()) for a in cat_links]
        tags = [clean_text(a.get_text()) for a in tag_links]
    brand_el = summary.select_one('a[href*="/product-brand/"]')
    if brand_el:
        brand = clean_text(brand_el.get_text())

    images = []
    gallery = soup.select(
        ".woocommerce-product-gallery__wrapper "
        ".woocommerce-product-gallery__image img, "
        "div.main-products figure img, div.products figure img"
    )
    for img in gallery:
        src = (
            img.get("data-large_image")
            or img.get("data-src")
            or img.get("src")
        )
        if src and "logo" not in src and src not in images:
            images.append(clean_image_url(urljoin(BASE_URL, src)))

    return {
        "id": post_id,
        "url": url,
        "nombre": title,
        "sku": sku,
        "precio_regular": price_regular,
        "precio_oferta": price_sale,
        "precio_metro": None,
        "unidad": None,
        "metros": None,
        "moneda": "Bs.",
        "en_stock": in_stock,
        "stock_cantidad": stock_qty,
        "stock_texto": stock_text,
        "marca": brand,
        "categorias": categories,
        "tags": tags,
        "descripcion_corta": short_desc,
        "descripcion_larga": description,
        "imagenes": images,
    }


def get_category(cat_id_or_path):
    if cat_id_or_path is None:
        return None
    cat = next((c for c in CATEGORIES if c["id"] == cat_id_or_path), None)
    if cat:
        return cat
    return {
        "id": cat_id_or_path,
        "url": cat_id_or_path if cat_id_or_path.startswith("http") else cat_id_or_path,
        "out": None,
        "categoria": cat_id_or_path.strip("/"),
    }


def scrape_category(cat, out_dir, delay=SCRAPER_DELAY, limite=None):
    category_url = cat["url"] if cat["url"].startswith("http") else BASE_URL + cat["url"]

    links = collect_product_links(category_url, delay=delay)
    if not links:
        print(f"[X] No se encontraron productos en {category_url}")
        return None

    if limite:
        links = links[:limite]
        print(f"\n[Limitado] Solo se procesaran {len(links)} productos")

    print(f"\n[Scraping] {len(links)} productos...")
    products = []
    for i, link in enumerate(links, 1):
        print(f"  [{i}/{len(links)}] {link}")
        products.append(extract_product(link, delay=delay))
        time.sleep(delay)

    products = postprocess_category(cat["id"], products)

    out_base = cat.get("out") or re.sub(r"[^a-z0-9]+", "_", cat["categoria"].lower()).strip("_")
    return save_json(products, out_dir, out_base)


def scrape_all(out_dir, delay=SCRAPER_DELAY, limite=None):
    results = []
    for cat in CATEGORIES:
        print("=" * 60)
        print(f"[Categoria] {cat['id']} -> {cat['out']}.json")
        print("=" * 60)
        path = scrape_category(cat, out_dir, delay=delay, limite=limite)
        if path:
            results.append(path)
    print("\n[Terminado] Categorias scrapeadas:", ", ".join(c["id"] for c in CATEGORIES))
    return results