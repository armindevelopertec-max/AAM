import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name);
  private readonly bucket = process.env.S3_BUCKET ?? 'pos-productos';

  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    },
    forcePathStyle: true,
  });

  async onModuleInit() {
    try {
      await this.ensureBucket();
      this.logger.log(`Bucket S3 "${this.bucket}" listo`);
    } catch (err) {
      this.logger.warn(
        `MinIO no disponible: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async ensureBucket() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async uploadObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async getObject(
    key: string,
  ): Promise<{ body: Buffer; contentType: string }> {
    const resp = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = resp.Body;
    if (!stream || typeof stream.transformToByteArray !== 'function') {
      throw new Error('No se pudo leer el objeto');
    }
    const bytes = await stream.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: resp.ContentType ?? 'application/octet-stream',
    };
  }
}
