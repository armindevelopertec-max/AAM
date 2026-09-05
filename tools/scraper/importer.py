import io
import json
import zlib
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import requests
from minio import Minio
from pymongo import MongoClient

from config import (
    MONGO_DB,
    MONGO_URI,
    S3_ACCESS_KEY,
    S3_BUCKET,
    S3_ENDPOINT,
    S3_REGION,
    S3_SECRET_KEY,
)

SOURCE_MAP = {
    "productos": {"fuente": "dicabolivia", "categoria": "xvr"},
    "camaras_dahua": {"fuente": "dicabolivia", "categoria": "camaras_dahua"},
    "camaras_hikvision": {"fuente": "dicabolivia", "categoria": "camaras_hikvision"},
    "camaras_wifi": {"fuente": "dicabolivia", "categoria": "camaras_wifi"},
    "accesorios_camaras": {"fuente": "dicabolivia", "categoria": "accesorios_camaras"},
    "alarma": {"fuente": "dicabolivia", "categoria": "alarma"},
    "alarmas": {"fuente": "dicabolivia", "categoria": "alarmas"},
    "gadgets": {"fuente": "dicabolivia", "categoria": "gadgets"},
    "domotica": {"fuente": "dicabolivia", "categoria": "domotica"},
    "acceso": {"fuente": "dicabolivia", "categoria": "acceso"},
    "computadoras_puntoventa": {"fuente": "dicabolivia", "categoria": "computadoras_puntodeventa"},
    "computadoras_cajafuerte": {"fuente": "dicabolivia", "categoria": "computadoras_cajafuerte"},
    "router": {"fuente": "dicabolivia", "categoria": "router"},
    "switch": {"fuente": "dicabolivia", "categoria": "switch"},
    "cables_redes": {"fuente": "dicabolivia", "categoria": "cables_redes"},
    "cableado_estructurado": {"fuente": "dicabolivia", "categoria": "cableado_estructurado"},
    "discos_duros": {"fuente": "dicabolivia", "categoria": "discos_duros"},
    "energia": {"fuente": "dicabolivia", "categoria": "energia"},
    "outlet": {"fuente": "dicabolivia", "categoria": "outlet"},
    "dahubolivia": {"fuente": "dahubolivia", "categoria": "todos"},
}


def get_mongo():
    client = MongoClient(MONGO_URI)
    return client, client[MONGO_DB]


def get_minio():
    client = Minio(
        S3_ENDPOINT.replace("http://", "").replace("https://", ""),
        access_key=S3_ACCESS_KEY,
        secret_key=S3_SECRET_KEY,
        secure=S3_ENDPOINT.startswith("https"),
        region=S3_REGION,
    )
    ensure_bucket(client)
    return client


def ensure_bucket(client):
    if not client.bucket_exists(S3_BUCKET):
        client.make_bucket(S3_BUCKET)
        print(f"[OK] Bucket {S3_BUCKET} creado")


def normalize(product):
    def str_or(val, default=""):
        return val if val else default

    def num_or(val, default=0):
        if val is None:
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    def bool_or(val, default=True):
        return bool(val) if val is not None else default

    product_id = product.get("id")
    if product_id is None:
        product_id = zlib.crc32(str(product.get("url", "")).encode("utf-8"))

    return {
        "id": product_id,
        "url": str_or(product.get("url")),
        "nombre": str_or(product.get("nombre"), "Sin nombre"),
        "sku": str_or(product.get("sku"), f"SKU-{product_id}"),
        "precio_regular": num_or(product.get("precio_regular")),
        "precio_oferta": num_or(product.get("precio_oferta")),
        "precio_metro": (
            num_or(product.get("precio_metro"))
            if product.get("precio_metro")
            else None
        ),
        "unidad": product.get("unidad"),
        "metros": product.get("metros"),
        "moneda": str_or(product.get("moneda"), "Bs."),
        "en_stock": bool_or(product.get("en_stock")),
        "stock_cantidad": num_or(product.get("stock_cantidad"), 0),
        "stock_texto": str_or(product.get("stock_texto")),
        "marca": str_or(product.get("marca"), "Sin marca"),
        "categorias": product.get("categorias") or [],
        "tags": product.get("tags") or [],
        "descripcion_corta": str_or(product.get("descripcion_corta")),
        "descripcion_larga": str_or(product.get("descripcion_larga")),
        "imagenes": product.get("imagenes") or [],
    }


def map_product(product, fuente):
    p = normalize(product)
    return {
        "fuente": fuente,
        "categoriaScrape": None,
        "fechaScrape": datetime.now(timezone.utc),
        "urlOriginal": p["url"],
        "datosCrudos": {
            "idExterno": p["id"],
            "nombre": p["nombre"],
            "sku": p["sku"],
            "precioRegular": p["precio_regular"],
            "precioOferta": p["precio_oferta"],
            "precioMetro": p["precio_metro"],
            "unidad": p["unidad"],
            "metros": p["metros"],
            "moneda": p["moneda"],
            "enStock": p["en_stock"],
            "stockCantidad": p["stock_cantidad"],
            "stockTexto": p["stock_texto"],
            "marca": p["marca"],
            "categorias": p["categorias"],
            "tags": p["tags"],
            "descripcionCorta": p["descripcion_corta"],
            "descripcionLarga": p["descripcion_larga"],
        },
        "imagenesDescargadas": [],
        "importadoAPostgres": False,
        "postgresProductId": None,
        "historialPrecios": [
            {
                "fecha": datetime.now(timezone.utc),
                "precioRegular": p["precio_regular"],
                "precioOferta": p["precio_oferta"],
            }
        ],
        "descartado": False,
        "notas": "",
    }


def download_image(original_url, fuente, sku, minio_client):
    content_type = "image/jpeg"
    ext = "jpg"
    try:
        resp = requests.get(original_url, timeout=30)
        if not resp.ok:
            return None
        content_type = resp.headers.get("content-type", "image/jpeg")
        if "png" in content_type:
            ext = "png"
        buffer = resp.content
    except requests.RequestException:
        return None

    key = f"scraping/{fuente}/{sku}/{uuid4()}.{ext}"
    minio_client.put_object(
        S3_BUCKET,
        key,
        io.BytesIO(buffer),
        length=len(buffer),
        content_type=content_type,
    )
    return {"key": key, "originalUrl": original_url}


def import_products(products, fuente, categoria, download_images=True):
    client, db = get_mongo()
    coll = db.scraped_products
    runs = db.scraping_runs

    run = runs.insert_one(
        {
            "fuente": fuente,
            "categoria": categoria,
            "status": "running",
            "totalEncontrados": len(products),
            "nuevosGuardados": 0,
            "imagenesDescargadas": 0,
            "errorMensaje": "",
            "inicioEn": datetime.now(timezone.utc),
            "finEn": None,
        }
    )
    run_id = run.inserted_id

    nuevos_guardados = 0
    imagenes_descargadas = 0

    try:
        for prod in products:
            doc = map_product(prod, fuente)
            raw = doc["datosCrudos"]

            existing = coll.find_one(
                {"datosCrudos.idExterno": raw["idExterno"], "fuente": fuente}
            )

            if existing:
                update = {
                    "$set": {
                        "datosCrudos": raw,
                        "fechaScrape": doc["fechaScrape"],
                        "urlOriginal": doc["urlOriginal"],
                    },
                    "$push": {"historialPrecios": doc["historialPrecios"][0]},
                }
                coll.update_one({"_id": existing["_id"]}, update)
                continue

            if download_images:
                minio_client = get_minio()
                downloaded = []
                for url in prod.get("imagenes") or []:
                    img = download_image(
                        url, fuente, raw["sku"], minio_client
                    )
                    if img:
                        downloaded.append(img)
                doc["imagenesDescargadas"] = downloaded
                imagenes_descargadas += len(downloaded)

            doc["categoriaScrape"] = categoria
            coll.insert_one(doc)
            nuevos_guardados += 1

        runs.update_one(
            {"_id": run_id},
            {
                "$set": {
                    "status": "completed",
                    "nuevosGuardados": nuevos_guardados,
                    "imagenesDescargadas": imagenes_descargadas,
                    "finEn": datetime.now(timezone.utc),
                }
            },
        )
    except Exception as exc:
        runs.update_one(
            {"_id": run_id},
            {
                "$set": {
                    "status": "failed",
                    "errorMensaje": str(exc),
                    "finEn": datetime.now(timezone.utc),
                }
            },
        )
        raise

    client.close()
    return {
        "runId": str(run_id),
        "totalEncontrados": len(products),
        "nuevosGuardados": nuevos_guardados,
        "imagenesDescargadas": imagenes_descargadas,
    }


def detect_source(json_path):
    basename = Path(json_path).stem
    if basename in SOURCE_MAP:
        return SOURCE_MAP[basename]
    return {"fuente": "dicabolivia", "categoria": basename}


def import_json_file(json_path, fuente=None, categoria=None, download_images=True):
    with open(json_path, "r", encoding="utf-8") as fh:
        products = json.load(fh)

    if not isinstance(products, list):
        raise ValueError(f"{json_path} no contiene una lista de productos")

    source = detect_source(json_path)
    fuente = fuente or source["fuente"]
    categoria = categoria or source["categoria"]

    print(f"[Import] {len(products)} productos -> {fuente}/{categoria}")
    if not download_images:
        print("[Import] Sin descarga de imágenes (--no-imagenes)")

    stats = import_products(products, fuente, categoria, download_images)
    print(
        f"[OK] Nuevos: {stats['nuevosGuardados']}, "
        f"imágenes descargadas: {stats['imagenesDescargadas']} "
        f"(run {stats['runId']})"
    )
    return stats