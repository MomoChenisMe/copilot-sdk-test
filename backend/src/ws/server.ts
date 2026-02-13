import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { parse as parseCookie } from 'cookie';
import type { SessionStore } from '../auth/session.js';
import { createRouter } from './router.js';
import { createLogger } from '../utils/logger.js';
import type { WsMessage } from './types.js';

const log = createLogger('ws-server');

export function createWsServer(httpServer: HttpServer, sessionStore: SessionStore) {
  const wss = new WebSocketServer({ noServer: true });
  const router = createRouter();

  httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    // Only handle /ws path
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    // Validate auth cookie
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const cookies = parseCookie(cookieHeader);
    const token = cookies.session;
    if (!token || !sessionStore.validate(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  const HEARTBEAT_TIMEOUT = 60_000; // 60 seconds

  wss.on('connection', (ws: WebSocket) => {
    log.info('Client connected');

    let lastPing = Date.now();
    const heartbeatInterval = setInterval(() => {
      if (Date.now() - lastPing > HEARTBEAT_TIMEOUT) {
        log.warn('Heartbeat timeout, closing connection');
        clearInterval(heartbeatInterval);
        ws.terminate();
      }
    }, 15_000);

    ws.on('message', (raw: Buffer | string) => {
      const data = raw.toString();

      let message: WsMessage;
      try {
        message = JSON.parse(data);
      } catch {
        send(ws, { type: 'error', data: { message: 'Invalid JSON' } });
        return;
      }

      if (!message.type || typeof message.type !== 'string') {
        send(ws, { type: 'error', data: { message: 'Missing or invalid "type" field' } });
        return;
      }

      // Track ping activity for heartbeat
      if (message.type === 'ping') {
        lastPing = Date.now();
      }

      router(message, (msg) => send(ws, msg));
    });

    ws.on('close', () => {
      clearInterval(heartbeatInterval);
      log.info('Client disconnected');
    });

    ws.on('error', (err) => {
      clearInterval(heartbeatInterval);
      log.error({ err }, 'WebSocket error');
    });
  });

  return wss;
}

function send(ws: WebSocket, message: WsMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
