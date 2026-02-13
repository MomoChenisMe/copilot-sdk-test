import { createLogger } from '../utils/logger.js';

const log = createLogger('device-flow');

export interface DeviceFlowResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export async function startDeviceFlow(clientId: string): Promise<DeviceFlowResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    scope: 'copilot',
  });

  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    log.error({ status: res.status }, 'Failed to start device flow');
    throw new Error('Failed to start device flow');
  }

  const data = await res.json();

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

export async function pollDeviceFlow(
  clientId: string,
  deviceCode: string,
  options: PollOptions = {},
): Promise<string> {
  const intervalMs = options.intervalMs ?? 5000;
  const timeoutMs = options.timeoutMs ?? 300_000; // 5 minutes
  const deadline = Date.now() + timeoutMs;
  let currentInterval = intervalMs;

  while (Date.now() < deadline) {
    const body = new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json();

    if (data.access_token) {
      log.info('Device flow completed successfully');
      return data.access_token;
    }

    if (data.error === 'authorization_pending') {
      await sleep(currentInterval);
      continue;
    }

    if (data.error === 'slow_down') {
      currentInterval += 5000;
      await sleep(currentInterval);
      continue;
    }

    if (data.error === 'access_denied') {
      throw new Error('Authorization denied by user');
    }

    if (data.error === 'expired_token') {
      throw new Error('Device flow timed out');
    }

    throw new Error(`Unexpected device flow error: ${data.error}`);
  }

  throw new Error('Device flow timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
