import os

from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin",
)
MONGO_DB = os.environ.get("MONGO_DB", "pos_crm")

S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "http://localhost:9000")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "minioadmin")
S3_BUCKET = os.environ.get("S3_BUCKET", "pos-productos")

SCRAPER_DELAY = float(os.environ.get("SCRAPER_DELAY", "1.0"))
SCRAPER_PER_PAGE = int(os.environ.get("SCRAPER_PER_PAGE", "80"))
SCRAPER_OUT_DIR = os.environ.get("SCRAPER_OUT_DIR", "output")