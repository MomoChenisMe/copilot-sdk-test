export interface WsMessage {
  type: string;
  data?: unknown;
}

export type SendFn = (msg: WsMessage) => void;

export interface WsHandlerObject {
  onMessage: (message: WsMessage, send: SendFn) => void;
  onDisconnect?: (send: SendFn) => void;
}

export type WsHandler = ((message: WsMessage, send: SendFn) => void) | WsHandlerObject;
