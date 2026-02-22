import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';

const VAPID_FILE = 'VAPID_KEYS.json';

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export function loadOrGenerateVapidKeys(dataDir: string): VapidKeys {
  const filePath = path.join(dataDir, VAPID_FILE);

  // Try loading existing keys
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.publicKey && parsed.privateKey) {
      return { publicKey: parsed.publicKey, privateKey: parsed.privateKey };
    }
  } catch {
    // File missing, corrupted, or incomplete — generate new keys
  }

  // Generate new VAPID keys
  const keys = webpush.generateVAPIDKeys();
  const data: VapidKeys = {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return data;
}
