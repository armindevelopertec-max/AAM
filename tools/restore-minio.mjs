import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9100';
const BUCKET = process.env.S3_BUCKET || 'pos-productos';
const ROOT =
  process.env.S3_SRC || '/tmp/opencode/aam-restore/20261018/minio/minio-export';

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

// 1) Asegurar que el bucket exista
try {
  await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  console.log(`bucket "${BUCKET}" ya existe`);
} catch {
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  console.log(`bucket "${BUCKET}" CREADO`);
}

// 2) Subir archivos
const files = await walk(ROOT);
console.log(`archivos a subir: ${files.length}`);

let done = 0;
const failed = [];
let idx = 0;

async function worker() {
  while (idx < files.length) {
    const f = files[idx++];
    try {
      const body = await readFile(f);
      const key = path.relative(ROOT, f).split(path.sep).join('/');
      await s3.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body }),
      );
      done++;
      if (done % 250 === 0) console.log(`  ${done}/${files.length}`);
    } catch (e) {
      failed.push(`${f} -> ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => worker()));

console.log(`\n=== RESULTADO ===`);
console.log(`subidos:  ${done}/${files.length}`);
console.log(`fallidos: ${failed.length}`);
failed.slice(0, 10).forEach((f) => console.log(`  FAIL ${f}`));
process.exit(failed.length > 0 ? 1 : 0);
