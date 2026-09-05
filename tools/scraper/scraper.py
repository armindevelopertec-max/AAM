import argparse
import sys

from config import SCRAPER_OUT_DIR
import dahubolivia
import dicabolivia
import importer

SITES = {
    "dicabolivia": dicabolivia,
    "dahubolivia": dahubolivia,
}

SITE_ALIASES = {
    "dahuabolivia": "dahubolivia",
    "dahuabolivia.store": "dahubolivia",
    "dahubolivia.store": "dahubolivia",
}


def resolve_site(name):
    name = name.lower()
    name = SITE_ALIASES.get(name, name)
    return SITES.get(name)


def cmd_list(_args):
    print("Sitios disponibles:\n")
    for name, mod in SITES.items():
        print(f"  {name}  (fuente '{mod.FUENTE}')")
        print("    Categorias:")
        for cat in mod.CATEGORIES:
            print(f"      {cat['id']:<16} -> {cat['out']}.json  (categoria '{cat['categoria']}')")
        print()
    print("Mapeo de importacion por nombre de archivo:")
    for base, info in importer.SOURCE_MAP.items():
        print(f"      {base}.json  ->  fuente='{info['fuente']}', categoria='{info['categoria']}'")


def parse_site_cat(pos_args):
    args = list(pos_args)
    site = "dicabolivia"
    if args:
        mod = resolve_site(args[0])
        if mod is not None:
            site = list(SITES.keys())[list(SITES.values()).index(mod)]
            args = args[1:]
    categoria = args[0] if args else "todas"
    return site, categoria


def cmd_scrape(args):
    site, categoria = parse_site_cat(args.posicion)
    mod = SITES[site]

    print("=" * 60)
    print(f"[Sitio] {site}  |  Categoria: {categoria}")
    print("=" * 60)

    if categoria == "todas":
        paths = mod.scrape_all(args.out, limite=args.limite)
    else:
        cat = mod.get_category(categoria)
        path = mod.scrape_category(cat, args.out, limite=args.limite)
        paths = [path] if path else []

    if not paths:
        print("[X] No se genero ningun JSON")
        sys.exit(1)

    if args.importar:
        print("\n" + "=" * 60)
        print("[Scrape + Import] Importando a MongoDB/MinIO...")
        print("=" * 60)
        for path in paths:
            importer.import_json_file(
                path,
                fuente=getattr(args, "fuente", None),
                categoria=categoria,
                download_images=not args.no_imagenes,
            )


def cmd_import(args):
    importer.import_json_file(
        args.archivo,
        fuente=args.fuente,
        categoria=args.categoria,
        download_images=not args.no_imagenes,
    )


def cmd_todo(args):
    site, categoria = parse_site_cat(args.posicion)
    mod = SITES[site]

    print("=" * 60)
    print(f"[Sitio] {site}  |  Categoria: {categoria}")
    print("=" * 60)

    if categoria == "todas":
        paths = mod.scrape_all(args.out, limite=args.limite)
    else:
        cat = mod.get_category(categoria)
        path = mod.scrape_category(cat, args.out, limite=args.limite)
        paths = [path] if path else []

    if not paths:
        print("[X] No se genero ningun JSON")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("[Import] Importando a MongoDB/MinIO...")
    print("=" * 60)
    for path in paths:
        importer.import_json_file(
            path,
            fuente=args.fuente,
            categoria=None,
            download_images=not args.no_imagenes,
        )


def main():
    parser = argparse.ArgumentParser(
        prog="scraper",
        description=(
            "Herramienta de scraping independiente del backend: genera JSON, "
            "los importa a MongoDB y descarga imagenes a MinIO."
        ),
    )
    sub = parser.add_subparsers(dest="comando", required=True)

    p_list = sub.add_parser("list", help="Muestra sitios y categorias configuradas")
    p_list.set_defaults(func=cmd_list)

    for name, helptxt in (
        ("scrape", "Genera JSON scrapeando un sitio (no toca Mongo/MinIO)"),
        ("todo", "Scrapea y luego importa en un solo paso"),
    ):
        p = sub.add_parser(name, help=helptxt)
        p.add_argument(
            "posicion",
            nargs="*",
            help="[sitio] [categoria]  (sitio: dicabolivia|dahubolivia; categorias o 'todas')",
        )
        p.add_argument("--out", default=SCRAPER_OUT_DIR, help="Directorio de salida")
        p.add_argument(
            "--limite",
            type=int,
            default=None,
            help="Limitar el numero de productos (para pruebas)",
        )
        p.add_argument(
            "--no-imagenes",
            action="store_true",
            help="No descargar imagenes a MinIO",
        )
        p.set_defaults(func=cmd_scrape if name == "scrape" else cmd_todo)
        if name == "scrape":
            p.add_argument(
                "--importar",
                action="store_true",
                help="Ademas de generar el JSON, importarlo a MongoDB/MinIO",
            )
        else:
            p.add_argument(
                "--fuente",
                default=None,
                help="Sobrescribir fuente (default segun el archivo)",
            )
    # p_todo comparte defs; el --fuente solo en todo

    p_import = sub.add_parser(
        "import", help="Importa un JSON de productos a MongoDB/MinIO"
    )
    p_import.add_argument("archivo", help="Ruta al JSON generado")
    p_import.add_argument("--fuente", default=None, help="Sobrescribir fuente (default segun el archivo)")
    p_import.add_argument("--categoria", default=None, help="Sobrescribir categoria")
    p_import.add_argument(
        "--no-imagenes", action="store_true", help="No descargar imagenes a MinIO"
    )
    p_import.set_defaults(func=cmd_import)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()