import { createHash, randomUUID } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

function configuration(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName && !apiKey && !apiSecret) return null;
  if (!cloudName || !apiKey || !apiSecret || !/^[\w-]+$/.test(cloudName)) {
    throw new ServiceUnavailableException('Cloudinary receipt storage is not fully configured.');
  }
  return { cloudName, apiKey, apiSecret };
}

/**
 * Absent configuration retains the original database uploader.
 * Once all 3 server-side environment values are supplied, new receipts go
 * to authenticated Cloudinary storage. Secrets must NEVER reach the mobile app.
 */
export function hasCloudinaryReceiptStorage(): boolean {
  return configuration() !== null;
}

function signedParams(values: Record<string, string>, secret: string): string {
  const sorted = Object.entries(values)
    .filter(([, value]) => value !== '')
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => key + '=' + value)
    .join('&');
  // Cloudinary signed REST requests use SHA-1 of sorted params + API secret.
  return createHash('sha1').update(sorted + secret).digest('hex');
}

export async function uploadPrivateExpenseReceipt(bytes: Buffer, mime: string): Promise<string> {
  const config = configuration();
  if (!config) throw new ServiceUnavailableException('Cloudinary is not configured.');
  const resourceType = mime === 'application/pdf' ? 'raw' : 'image';
  // Opaque public IDs, with PDF extension for raw Cloudinary assets.
  const publicId = 'kassa/expense-receipts/' + randomUUID() +
    (resourceType === 'raw' ? '.pdf' : '');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { public_id: publicId, timestamp, type: 'authenticated' };
  const form = new FormData();
  form.append('file', 'data:' + mime + ';base64,' + bytes.toString('base64'));
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append('api_key', config.apiKey);
  form.append('signature', signedParams(params, config.apiSecret));

  let response: Response;
  try {
    response = await fetch(
      'https://api.cloudinary.com/v1_1/' + config.cloudName + '/' + resourceType + '/upload',
      { method: 'POST', body: form, signal: AbortSignal.timeout(25000) },
    );
  } catch {
    throw new ServiceUnavailableException('Receipt storage is temporarily unavailable. Try again.');
  }
  if (!response.ok) {
    // Cloudinary's error body may contain request metadata; never forward it.
    throw new ServiceUnavailableException('Cloudinary could not save this receipt. Try again.');
  }
  const result = await response.json() as {
    asset_id?: unknown; type?: unknown; resource_type?: unknown;
  };
  if (typeof result.asset_id !== 'string' || result.asset_id.length > 100 ||
      result.type !== 'authenticated' || result.resource_type !== resourceType) {
    throw new ServiceUnavailableException('Cloudinary returned an invalid receipt confirmation.');
  }
  return result.asset_id;
}

/** Retrieves authenticated Cloudinary bytes on behalf of an authorised owner.
 * The app never receives a Cloudinary API key, secret, public URL or signed URL.
 */
export async function downloadPrivateExpenseReceipt(assetId: string): Promise<Buffer> {
  const config = configuration();
  if (!config) throw new ServiceUnavailableException('Cloudinary receipt storage is not configured.');
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(assetId)) {
    throw new ServiceUnavailableException('The stored receipt identifier is invalid.');
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const expiresAt = String(Number(timestamp) + 120);
  const params = { asset_id: assetId, expires_at: expiresAt, timestamp };
  const query = new URLSearchParams({
    ...params, api_key: config.apiKey,
    signature: signedParams(params, config.apiSecret),
  });
  let response: Response;
  try {
    response = await fetch(
      'https://api.cloudinary.com/v1_1/' + config.cloudName + '/asset/download?' +
      query.toString(),
      { signal: AbortSignal.timeout(25000), redirect: 'follow' },
    );
  } catch {
    throw new ServiceUnavailableException('Could not retrieve the receipt right now.');
  }
  if (!response.ok) {
    throw new ServiceUnavailableException('Receipt temporarily unavailable from Cloudinary.');
  }
  const size = Number(response.headers.get('content-length') ?? 0);
  if (size > 3 * 1024 * 1024) {
    throw new ServiceUnavailableException('Stored receipt exceeds the supported size.');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) {
    throw new ServiceUnavailableException('Received an invalid receipt file.');
  }
  return bytes;
}
