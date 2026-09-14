import sharp from 'sharp';

export const IMAGE_MAX_DIM = Number(process.env.IMAGE_MAX_DIM ?? '1080');
export const IMAGE_QUALITY = Number(process.env.IMAGE_QUALITY ?? '82');

export type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

function extFor(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

/**
 * Reduce imágenes antes de guardarlas en MinIO:
 * - Si el lado mayor supera IMAGE_MAX_DIM se redimensiona a 1080px (fit "inside",
 *   mantiene proporción; nunca agranda imágenes pequeñas).
 * - Se conserva PNG solo si la fuente tiene canal alfa (transparencia); en caso
 *   contrario se re-encoda a JPEG con calidad IMAGE_QUALITY.
 * - En imágenes que ya no superan el límite, el resultado se usa solo si pesa
 *   menos que el original (protección contra bloat en logos/iconos pequeños).
 * - Si el buffer no es una imagen decodificable, se devuelve el original.
 */
export async function optimizeImage(
  buffer: Buffer,
  contentType: string,
): Promise<OptimizedImage> {
  const fallback: OptimizedImage = {
    buffer,
    contentType,
    ext: extFor(contentType),
  };

  try {
    const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
    if (!metadata.width || !metadata.height) return fallback;

    const needsResize =
      metadata.width > IMAGE_MAX_DIM || metadata.height > IMAGE_MAX_DIM;
    const keepPng = Boolean(metadata.hasAlpha);

    const pipeline = sharp(buffer, { failOn: 'none' }).resize({
      width: IMAGE_MAX_DIM,
      height: IMAGE_MAX_DIM,
      fit: 'inside',
      withoutEnlargement: true,
    });

    let optimized: Buffer;
    let outContentType: string;
    let ext: string;

    if (keepPng) {
      optimized = await pipeline
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
      outContentType = 'image/png';
      ext = 'png';
    } else {
      optimized = await pipeline
        .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
        .toBuffer();
      outContentType = 'image/jpeg';
      ext = 'jpg';
    }

    if (!needsResize && optimized.length >= buffer.length) return fallback;

    return { buffer: optimized, contentType: outContentType, ext };
  } catch {
    return fallback;
  }
}