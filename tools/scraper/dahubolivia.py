import re
import time
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from common import clean_image_url, clean_text, fetch, parse_amount, save_json, session
from config import SCRAPER_DELAY

BASE_URL = "https://dahuabolivia.store"
FUENTE = "dahubolivia"

CATEGORIES = [
    {
        "id": "todas",
        "url": "/?s=&post_type=product",
        "out": "dahubolivia",
        "categoria": "todos",
    }
]


def get_category(cat_id_or_path):
    if cat_id_or_path in (None, "todas", "all"):
        return CATEGORIES[0]
    return {
        "id": cat_id_or_path,
        "url": cat_id_or_path if cat_id_or_path.startswith("http") else f"/?s=&post_type=product&product_cat={cat_id_or_path}",
        "out": re.sub(r"[^a-z0-9]+", "_", cat_id_or_path.lower()).strip("_"),
        "categoria": cat_id_or_path.strip("/"),
    }


def collect_product_urls(delay=SCRAPER_DELAY):
    links, page = [], 1
    while True:
        url = f"{BASE_URL}/?s=&post_type=product&paged={page}"
        print(f"[Catalogo] {url}")
        html = fetch(url, delay=delay, retries=1)
        if html is None:
            break
        soup = BeautifulSoup(html, "lxml")
        items = soup.select(".porto-tb-item.product")
        new_urls = []
        for item in items:
            a = item.select_one(".post-title a") or item.select_one(
                'a[href*="/producto/"]'
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


def extract_brand(description, title):
    if description:
        m = re.search(r"Marca[:\s]+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ0-9.\-/]{0,20})(?:\s|$)", description, re.I)
        if m:
            return m.group(1).strip()
    if title:
        m = re.search(r",\s*([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ0-9\-.]{1,20})\s*$", title)
        if m:
            return m.group(1).strip()
    return None


def extract_product(url, delay=SCRAPER_DELAY):
    html = fetch(url, delay=delay)
    if html is None:
        return {"url": url, "error": "no se pudo descargar"}
    soup = BeautifulSoup(html, "lxml")

    summary = soup.select_one(".summary") or soup

    title_el = soup.select_one("h1.product_title") or soup.select_one(
        "h1.entry-title, h2.entry-title"
    )
    title = clean_text(title_el.get_text()) if title_el else None

    price_el = summary.select_one("p.price")
    price_regular, price_sale = None, None
    if price_el:
        del_el = price_el.select_one("del")
        ins_el = price_el.select_one("ins")
        if del_el and ins_el:
            price_regular = parse_amount(del_el.get_text())
            price_sale = parse_amount(ins_el.get_text())
        else:
            amounts = [
                parse_amount(bdi.get_text())
                for bdi in price_el.select("bdi")
                if bdi.get_text(strip=True)
            ]
            amounts = [a for a in amounts if a is not None]
            if amounts:
                price_regular = max(amounts)
                price_sale = min(amounts)

    sku_el = summary.select_one(".product_meta span.sku, .sku")
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

    stock_el = summary.select_one(".stock") or summary.select_one(
        ".availability-text"
    )
    stock_text = (
        clean_text(stock_el.get_text(" ", strip=True)) if stock_el else ""
    )
    lower = stock_text.lower()
    in_stock = None
    if stock_text:
        in_stock = all(
            word not in lower
            for word in ("agotado", "out of stock", "sin existencia", "sin stock")
        )
    stock_qty_match = re.search(r"(\d+)", stock_text)
    stock_qty = int(stock_qty_match.group(1)) if stock_qty_match else None

    post_id = None
    body_match = re.search(r"<body[^>]*\bpostid-(\d+)", html)
    if body_match:
        post_id = int(body_match.group(1))
    else:
        id_input = soup.select_one('input[name="comment_post_ID"]')
        if id_input and id_input.get("value", "").isdigit():
            post_id = int(id_input["value"])
        else:
            dp = soup.select_one(".summary form[data-product_id], form[data-product_id]")
            if dp and dp.get("data-product_id", "").isdigit():
                post_id = int(dp["data-product_id"])

    categories, tags = [], []
    meta = soup.select_one(".product_meta")
    if meta:
        cat_links = meta.select(".posted_in a")
        categories = [clean_text(a.get_text()) for a in cat_links]
        tag_links = meta.select(".tagged_as a")
        tags = [clean_text(a.get_text()) for a in tag_links]

    brand = extract_brand(description, title)

    images = []
    seen = set()
    gallery = soup.select(
        ".woocommerce-product-gallery__wrapper .product-images img, "
        "div.images img"
    )
    for img in gallery:
        src = (
            img.get("data-large_image")
            or img.get("data-src")
            or img.get("src")
        )
        src = clean_image_url(urljoin(BASE_URL, src or ""))
        if src and src.startswith("http") and "logo" not in src and src not in seen:
            seen.add(src)
            images.append(src)

    return {
        "id": post_id,
        "url": url,
        "nombre": title,
        "sku": sku,
        "precio_regular": price_regular,
        "precio_oferta": price_sale,
        "moneda": "BOB",
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


def scrape_category(cat, out_dir, delay=SCRAPER_DELAY, limite=None):
    links = collect_product_urls(delay=delay)
    if not links:
        print("[X] No se encontraron productos en el catalogo")
        return None

    if limite:
        links = links[: limite]
        print(f"\n[Limitado] Solo se procesaran {len(links)} productos")

    print(f"\n[Scraping] {len(links)} productos...")
    products = []
    for i, link in enumerate(links, 1):
        print(f"  [{i}/{len(links)}] {link}")
        products.append(extract_product(link, delay=delay))
        time.sleep(delay)

    return save_json(products, out_dir, cat["out"])


def scrape_all(out_dir, delay=SCRAPER_DELAY, limite=None):
    cat = CATEGORIES[0]
    print("=" * 60)
    print(f"[Catalogo] {cat['id']} -> {cat['out']}.json")
    print("=" * 60)
    return [p for p in [scrape_category(cat, out_dir, delay=delay, limite=limite)] if p]