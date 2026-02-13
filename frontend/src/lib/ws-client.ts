import type { WsMessage, WsStatus } from './ws-types';

export type WsListener = (message: WsMessage) => void;
export type WsStatusListener = (status: WsStatus) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<WsListener>();
  private statusListeners = new Set<WsStatusListener>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;
  private _status: WsStatus = 'disconnected';

  get status(): WsStatus {
    return this._status;
  }

  connect() {
    this.shouldReconnect = true;
    this.doConnect();
  }

  disconnect() {
    this.shouldReconnect = false;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  send(message: WsMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(listener: WsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: WsStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private doConnect() {
    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.setStatus('connected');
      this.reconnectDelay = 1000; // Reset backoff
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);

        // Handle auth expired
        if (message.type === 'auth:expired') {
          this.shouldReconnect = false;
          this.disconnect();
          // Listeners can handle redirect to login
        }

        // Skip pong (internal)
        if (message.type === 'pong') return;

        for (const listener of this.listeners) {
          listener(message);
        }
      } catch {
        // Ignore unparseable messages
      }
    };

    this.ws.onclose = () => {
      this.cleanup();
      this.setStatus('disconnected');

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  private scheduleReconnect() {
    this.reconnectTimeout = setTimeout(() => {
      this.doConnect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private setStatus(status: WsStatus) {
    this._status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
