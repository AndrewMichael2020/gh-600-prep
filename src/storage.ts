/**
 * GCS helper for PDF storage.
 *
 * If GCS_BUCKET is not set (e.g. local dev without GCS), all functions
 * are no-ops / return null so the server falls back to local file serving.
 */
import { Storage } from "@google-cloud/storage";
import path from "node:path";

const BUCKET_NAME = process.env.GCS_BUCKET ?? "";

let _storage: Storage | null = null;
function gcs(): Storage {
  if (!_storage) _storage = new Storage();
  return _storage;
}

/** Whether GCS is configured (GCS_BUCKET env var is set). */
export function gcsConfigured(): boolean {
  return BUCKET_NAME.length > 0;
}

/** Public URL for a PDF object in the bucket. */
export function gcsPublicUrl(filename: string): string {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

/**
 * Upload a local PDF to GCS and make it publicly readable.
 * Returns the public URL.
 */
export async function uploadPdf(localPath: string, filename: string): Promise<string> {
  const bucket = gcs().bucket(BUCKET_NAME);
  await bucket.upload(localPath, {
    destination: filename,
    metadata: { contentType: "application/pdf", cacheControl: "public, max-age=31536000" },
  });
  await bucket.file(filename).makePublic();
  const url = gcsPublicUrl(filename);
  console.log(`[GCS] Uploaded ${filename} → ${url}`);
  return url;
}

/**
 * Check whether a PDF already exists in the bucket.
 */
export async function pdfExistsInGcs(filename: string): Promise<boolean> {
  try {
    const [exists] = await gcs().bucket(BUCKET_NAME).file(filename).exists();
    return exists;
  } catch {
    return false;
  }
}

/**
 * Resolve the download URL and existence for a given PDF filename.
 * - If GCS is configured: checks the bucket.
 * - Otherwise: checks the local data/exams/ directory.
 */
export async function resolvePdfStatus(
  filename: string,
  localDir: string,
): Promise<{ exists: boolean; url: string | null }> {
  if (gcsConfigured()) {
    const exists = await pdfExistsInGcs(filename);
    return { exists, url: exists ? gcsPublicUrl(filename) : null };
  }
  // Local fallback
  const { existsSync } = await import("node:fs");
  const localPath = path.join(localDir, filename);
  const exists = existsSync(localPath);
  return { exists, url: exists ? `/exams/${filename}` : null };
}
