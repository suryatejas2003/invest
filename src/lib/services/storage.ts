import { createHash, createHmac } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env, features } from '@/lib/env';
import { badRequest } from '@/lib/errors';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

export interface StoredFile { key: string; url: string }

interface Driver { put(key: string, body: Buffer, contentType: string): Promise<StoredFile> }

/** Local disk driver: files land in ./uploads and are served from /uploads/…. */
const localDriver: Driver = {
  async put(key, body) {
    const dest = path.join(process.cwd(), 'uploads', key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
    return { key, url: `/uploads/${key}` };
  },
};

/* --- minimal SigV4 so S3-compatible storage needs no SDK dependency ------ */
const sha256 = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const hmac = (key: Buffer | string, v: string) => createHmac('sha256', key).update(v).digest();

function signingKey(secret: string, date: string, region: string, service: string) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request');
}

const s3Driver: Driver = {
  async put(key, body, contentType) {
    const endpoint = new URL(env.STORAGE_ENDPOINT!);
    const region = env.STORAGE_REGION;
    const service = 's3';
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const canonicalUri = `/${env.STORAGE_BUCKET}/${key}`;
    const payloadHash = sha256(body);

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${endpoint.host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
    const signature = createHmac('sha256', signingKey(env.STORAGE_SECRET_KEY!, dateStamp, region, service))
      .update(stringToSign)
      .digest('hex');

    const res = await fetch(`${endpoint.origin}${canonicalUri}`, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${env.STORAGE_ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body: new Uint8Array(body),
    });

    if (!res.ok) throw new Error(`Storage rejected the upload (${res.status})`);
    const base = env.STORAGE_PUBLIC_URL || `${endpoint.origin}/${env.STORAGE_BUCKET}`;
    return { key, url: `${base}/${key}` };
  },
};

const driver: Driver = features.objectStorage ? s3Driver : localDriver;

/** Magic-number check: the declared content type is not trusted on its own. */
function sniff(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export function safeName(original: string): string {
  return original
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/\.+/g, '.')
    .replace(/^-+|-+$/g, '')
    .slice(-60) || 'upload';
}

export async function uploadImage(file: File, folder: 'avatars' | 'logos'): Promise<StoredFile> {
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest('Images must be 4 MB or smaller.');
  if (file.size === 0) throw badRequest('That file is empty.');

  const buffer = Buffer.from(await file.arrayBuffer());
  const actualType = sniff(buffer);
  if (!actualType || !ALLOWED_IMAGE_TYPES.includes(actualType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw badRequest('Upload a JPEG, PNG or WebP image.');
  }

  const ext = actualType.split('/')[1].replace('jpeg', 'jpg');
  const key = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`.replace(/\.[^.]*$/, '') + `.${ext}`;
  return driver.put(key, buffer, actualType);
}

export const storageConfigured = features.objectStorage;
