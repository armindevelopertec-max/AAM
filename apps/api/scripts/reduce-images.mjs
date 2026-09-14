#!/usr/bin/env node
/**
 * One-off: reduce imágenes ya guardadas en MinIO.
 * Recorre objetos del bucket, baja los que son imágenes y, si tras re-encodificar
 * quedan más livianos (máx. IMAGE_MAX_DIM / JPEG q82 / PNG si alfa), los reemplaza
 * con la misma clave y nuevo content-type.
 *
 * Uso (desde apps/api):
 *   node scripts/reduce-images.mjs                 # procesa todo el bucket
 *   node scripts/reduce-images.mjs --prefix scraping/dicabolivia/
 *   node scripts/reduce-images.mjs --dry-run
 *   node scripts/reduce-images.mjs --limit 50      # solo los primeros 50
 *   node scripts/reduce-images.mjs --max-dim 1080 --quality 82
 */
import { createRequire } from 'node:module';
import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
};
const has = (name) => args.includes(`--${name}`);

const DRY_RUN = has('dry-run');
const PREFIX = flag('prefix', '');
const LIMIT = flag('limit') !== undefined ? Number(flag('limit')) : Infinity;
const MAX_DIM = Number(flag('max-dim', process.env.IMAGE_MAX_DIM ?? '1080'));
const QUALITY = Number(flag('quality', process.env.IMAGE_QUALITY ?? '82'));
const BUCKET = process.env.S3_BUCKET ?? 'pos-productos';

const isImageName = (key) =>
  /\.(jpe?g|png|webp|gif|avif|tiff?|bmp)$/i.test(key);

async function main() {
  console.log(
    `reduce-images | bucket=${BUCKET} prefix="${PREFIX}" ` +
      `maxDim=${MAX_DIM} q=${QUALITY} dryRun=${DRY_RUN} limit=${LIMIT}`,
  );

  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    },
    forcePathStyle: true,
  });

  let seen = 0;
  let processed = 0;
  let rewritten = 0;
  let skipped = 0;
  let failed = 0;
  let savedBytes = 0;
  let continuation;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: continuation,
      }),
    );

    for (const obj of list.Contents ?? []) {
      if (seen >= LIMIT) break;
      seen++;

      const { Key, Size } = obj;
      if (!Key || !isImageName(Key)) {
        skipped++;
        continue;
      }

      try {
        const get = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
        const original = Buffer.from(await get.Body.transformToByteArray());
        const contentType = get.ContentType ?? 'application/octet-stream';
        if (!contentType.startsWith('image/')) {
          skipped++;
          continue;
        }

        let optimized = null;
        let keepPng = false;
        try {
          const meta = await sharp(original, { failOn: 'none' }).metadata();
          if (!meta.width || !meta.height) {
            skipped++;
            continue;
          }
          keepPng = meta.hasAlpha;
          const needsResize =
            meta.width > MAX_DIM || meta.height > MAX_DIM;
          const resize = { width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true };
          let pipeline = sharp(original, { failOn: 'none' }).resize(resize);
          optimized = keepPng
            ? await pipeline
                .png({ compressionLevel: 9, adaptiveFiltering: true })
                .toBuffer()
            : await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

          if (!needsResize && optimized.length >= original.length) {
            skipped++;
            continue;
          }
        } catch {
          skipped++;
          continue;
        }

        if (!optimized) {
          skipped++;
          continue;
        }

        const outType = keepPng ? 'image/png' : 'image/jpeg';
        const saved = original.length - optimized.length;
        savedBytes += saved;

        console.log(
          `${DRY_RUN ? '[dry]' : '[ok]'} ${Key}: ${(original.length / 1024).toFixed(1)}KiB -> ` +
            `${(optimized.length / 1024).toFixed(1)}KiB (ahorra ${(saved / 1024).toFixed(1)}KiB)` +
            (Size !== undefined ? ` [listSize=${(Size / 1024).toFixed(1)}KiB]` : ''),
        );

        if (!DRY_RUN) {
          await s3.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key,
              Body: optimized,
              ContentType: outType,
            }),
          );
        }
        rewritten++;
      } catch (err) {
        failed++;
        console.error(`[fail] ${Key}: ${err instanceof Error ? err.message : err}`);
      }
      processed++;
    }

    continuation = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuation && seen < LIMIT);

  console.log(
    `\nResumen: visto=${seen} procesados=${processed} ` +
      `rewritten=${rewritten} skipped=${skipped} failed=${failed} ` +
      `ahorroTotal=${(savedBytes / 1024 / 1024).toFixed(2)}MiB ` +
      `(${DRY_RUN ? 'dry run, nada escrito' : 'escrito a MinIO'})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});