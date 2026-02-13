export interface WsMessage {
  type: string;
  data?: unknown;
}

export type WsHandler = (message: WsMessage, send: (msg: WsMessage) => void) => void;
