export interface WsMessage {
  type: string;
  data?: unknown;
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected';
