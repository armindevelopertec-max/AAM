import json
import re
import time
from pathlib import Path

import requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}

session = requests.Session()
session.headers.update(HEADERS)


def fetch(url, retries=3, delay=1.0):
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 200:
                return resp.text
            print(f"  [!] HTTP {resp.status_code} en {url}")
        except requests.RequestException as exc:
            print(f"  [!] Error ({attempt + 1}/{retries}): {exc}")
        time.sleep(delay * (attempt + 1))
    return None


def clean_text(text):
    return re.sub(r"\s+", " ", text or "").strip()


def parse_amount(text):
    match = re.search(r"([\d.,]+)", text)
    if not match:
        return None
    raw = match.group(1)
    if "," in raw:
        raw = raw.replace(".", "").replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def save_json(products, out_dir, out_base):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_json = out_dir / f"{out_base}.json"
    with open(out_json, "w", encoding="utf-8") as fh:
        json.dump(products, fh, ensure_ascii=False, indent=2)
    print(f"\n[OK] Guardado: {out_json} ({len(products)} productos)")
    return str(out_json)


def clean_image_url(url):
    if not url:
        return url
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", url)