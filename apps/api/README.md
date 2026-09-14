# apps/api — Backend NestJS

Backend del sistema AAM (POS + catálogo + cotizador + scraping). Ver el `README.md`
de la raíz del repositorio para la documentación completa (local y producción).

## Stack

- NestJS 11 + Prisma 7 (PostgreSQL) + Mongoose (MongoDB)
- MinIO/S3 para imágenes y PDFs (`@aws-sdk/client-s3`)
- JWT (`@nestjs/jwt` + `bcryptjs`), PDFs con `pdfmake`

## Puesta en marcha (dev)

```bash
npm install
npx prisma generate
# crear .env (ver README raíz, sección "Desarrollo local")
npm run start:dev            # http://localhost:3001
```

## Scripts

| Comando            | Descripción                                   |
|--------------------|-----------------------------------------------|
| `npm run start:dev`| Dev con hot-reload (watch)                    |
| `npm run build`    | Compila a `dist/`                             |
| `npm run start:prod`| Ejecuta el compilado (`node dist/src/main`)  |
| `npm run lint`     | ESLint                                        |
| `npm test`         | Jest (unit)                                   |
| `npm run test:e2e` | Supertest (e2e)                               |

## Requisitos

Contenedores de datos arriba (`podman-compose up -d` desde la raíz) y un `.env`
con al menos `DATABASE_URL` y `JWT_SECRET`.

## Variables de entorno

Referencia completa en el README raíz (§6). Defaults que calzan con el
`docker-compose.yml`: `S3_ENDPOINT=http://localhost:9000`, `MONGO_URI=mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin`, `PORT=3001`.