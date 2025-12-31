import type { Response as ServerResponse } from 'express';
import type { ServerSentEvent } from '~/types';

function sendNamedEvent(res: ServerResponse, name: string, data: ServerSentEvent['data']): void {
  if (typeof data === 'string' && data.length === 0) {
    return;
  }
  res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Sends message data in Server Sent Events format.
 * @param res - The server response.
 * @param event - The message event.
 * @param event.event - The type of event.
 * @param event.data - The message to be sent.
 */
export function sendEvent(res: ServerResponse, event: ServerSentEvent): void {
  sendNamedEvent(res, 'message', event);
}

/**
 * Sends status data in Server Sent Events format.
 * @param res - The server response.
 * @param data - The status payload.
 */
export function sendStatusEvent(res: ServerResponse, data: ServerSentEvent['data']): void {
  sendNamedEvent(res, 'status', data);
}

/**
 * Sends error data in Server Sent Events format and ends the response.
 * @param res - The server response.
 * @param message - The error message.
 */
export function handleError(res: ServerResponse, message: string): void {
  res.write(`event: error\ndata: ${JSON.stringify(message)}\n\n`);
  res.end();
}
