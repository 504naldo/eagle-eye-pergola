import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from './_core/env';

function getS3Client(): S3Client {
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.s3Bucket) {
    throw new Error(
      "AWS S3 credentials not configured: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, and S3_REGION"
    );
  }
  return new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = normalizeKey(relKey);

  const body = typeof data === "string" ? Buffer.from(data) : data;
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const url = `https://${ENV.s3Bucket}.s3.${ENV.s3Region}.amazonaws.com/${key}`;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = normalizeKey(relKey);

  const command = new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key });
  const url = await getSignedUrl(client, command, { expiresIn: 3600 });

  return { key, url };
}
