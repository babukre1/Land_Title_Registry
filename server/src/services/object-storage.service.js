import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const R2_REFERENCE_PREFIX = "r2://";
let client;

function configuration() {
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw Object.assign(new Error(`R2 object storage is not configured; missing ${missing.join(", ")}`), { status: 503 });
  }
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET_NAME,
  };
}

function getClient() {
  const config = configuration();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return { client, bucket: config.bucket };
}

function objectKey(category, storedName) {
  const prefix = (process.env.R2_OBJECT_PREFIX || "land-title-registry").replace(/^\/+|\/+$/g, "");
  return [prefix, category, storedName].filter(Boolean).join("/");
}

export async function storeObject({ category, storedName, buffer, mimeType }) {
  const { client: r2, bucket } = getClient();
  const key = objectKey(category, storedName);
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType, ContentLength: buffer.length }));
  return `${R2_REFERENCE_PREFIX}${key}`;
}

export async function loadObject(reference) {
  if (!reference?.startsWith(R2_REFERENCE_PREFIX)) return null;
  const { client: r2, bucket } = getClient();
  const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: reference.slice(R2_REFERENCE_PREFIX.length) }));
  if (!response.Body) throw Object.assign(new Error("Stored document content is unavailable"), { status: 502 });
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteObject(reference) {
  if (!reference?.startsWith(R2_REFERENCE_PREFIX)) return;
  const { client: r2, bucket } = getClient();
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: reference.slice(R2_REFERENCE_PREFIX.length) }));
}
