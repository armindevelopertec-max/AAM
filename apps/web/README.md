# apps/web — Frontend Next.js

Frontend del sistema AAM (login, POS, catálogo, cotizaciones, scraping y seguimiento).
Ver el `README.md` de la raíz del repositorio para la documentación completa (local y producción).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- Tailwind CSS 4
- `jspdf` / `jspdf-autotable` para PDFs en el cliente
- PDFs de ventas/cotizaciones también se generan en el servidor (`pdfmake`)

## Puesta en marcha (dev)

```bash
npm install
npm run dev                  # http://localhost:3000
```

## Comunicación con el backend

El frontend llama a la API **por la ruta relativa `/api`** (`const API_URL = "/api"`
en `app/lib/api.ts` y `app/lib/auth.ts`). El rewrite vive en `next.config.ts`:

```ts
rewrites: [{ source: "/api/:path*", destination: "http://localhost:3001/:path*" }]
```

Ese proxy funciona igual en dev y en producción y evita el Mixed Content detrás
de Cloudflare/HTTPS. No cambies `API_URL` a `http://IP:3001`.

## Scripts

| Comando            | Descripción                                   |
|--------------------|-----------------------------------------------|
| `npm run dev`      | Dev server con HMR (Turbopack)                |
| `npm run build`    | Build de producción (`next build --webpack`)  |
| `npm run start`    | Servir el build (`next start`)                |
| `npm run lint`     | ESLint                                        |

> En producción usa siempre `npm run build` + `npm run start`; `next dev` detrás
> de Cloudflare produce 403 en recursos y 502 en el HMR.