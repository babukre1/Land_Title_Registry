import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const R2_REFERENCE_PREFIX = "r2://";
let client;
const testObjects = new Map();

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

/** Stores private bytes in the test memory adapter or configured R2 bucket and returns an opaque object reference. */
export async function storeObject({ category, storedName, buffer, mimeType }) {
  const key = objectKey(category, storedName);
  if (process.env.NODE_ENV === "test") {
    testObjects.set(key, Buffer.from(buffer));
    return `${R2_REFERENCE_PREFIX}${key}`;
  }
  const { client: r2, bucket } = getClient();
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType, ContentLength: buffer.length }));
  return `${R2_REFERENCE_PREFIX}${key}`;
}

/** Loads private bytes for an internal object reference; provider/configuration errors propagate to the safe handler. */
export async function loadObject(reference) {
  if (!reference?.startsWith(R2_REFERENCE_PREFIX)) return null;
  const key = reference.slice(R2_REFERENCE_PREFIX.length);
  if (process.env.NODE_ENV === "test") {
    const buffer = testObjects.get(key);
    if (!buffer) throw Object.assign(new Error("Stored document content is unavailable"), { status: 502 });
    return Buffer.from(buffer);
  }
  const { client: r2, bucket } = getClient();
  const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw Object.assign(new Error("Stored document content is unavailable"), { status: 502 });
  return Buffer.from(await response.Body.transformToByteArray());
}

/** Deletes a just-created object during rollback/cleanup; callers must never expose the storage reference publicly. */
export async function deleteObject(reference) {
  if (!reference?.startsWith(R2_REFERENCE_PREFIX)) return;
  const key = reference.slice(R2_REFERENCE_PREFIX.length);
  if (process.env.NODE_ENV === "test") {
    testObjects.delete(key);
    return;
  }
  const { client: r2, bucket } = getClient();
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
