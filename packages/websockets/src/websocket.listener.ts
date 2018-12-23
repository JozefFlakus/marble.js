import * as http from 'http';
import * as WebSocket from 'ws';
import { Subject, of } from 'rxjs';
import { tap, catchError, map, mergeMapTo, first } from 'rxjs/operators';
import { combineMiddlewares, combineEffects } from '@marblejs/core';
import {
  WebSocketMiddleware,
  WebSocketErrorEffect,
  WebSocketConnectionEffect,
  WebSocketEffect,
} from './effects/ws-effects.interface';
import { jsonTransformer } from './transformer/json.transformer';
import { EventTransformer } from './transformer/transformer.inteface';
import { handleResponse, handleBroadcastResponse } from './response/ws-response.handler';
import {
  extendClientWith,
  handleServerBrokenConnections,
  handleClientBrokenConnection,
  handleClientValidationError,
} from './websocket.helper';
import { WebSocketIncomingData, WebSocketClient } from './websocket.interface';
import { errorHandler } from './error/ws-error.handler';

export interface WebSocketListenerConfig<
  Event extends any,
  OutgoingEvent extends any,
  IncomingError extends Error = Error
> {
  effects?: WebSocketEffect<Event, OutgoingEvent>[];
  middlewares?: WebSocketMiddleware<Event, Event>[];
  error?: WebSocketErrorEffect<IncomingError, Event, OutgoingEvent>;
  eventTransformer?: EventTransformer<WebSocketIncomingData, Event>;
  connection?: WebSocketConnectionEffect;
}

export const webSocketListener = <Event, OutgoingEvent, IncomingError extends Error>({
  error,
  effects = [],
  middlewares = [],
  eventTransformer = jsonTransformer as EventTransformer<any, any>,
  connection = req$ => req$,
}: WebSocketListenerConfig<Event, OutgoingEvent, IncomingError> = {}) => {
  const combinedEffects = combineEffects(...effects);
  const combinedMiddlewares = combineMiddlewares(...middlewares);

  const onConnection = (server: WebSocket.Server) => (client: WebSocketClient, req: http.IncomingMessage) => {
    const extendedClient = extendClientWith({
      sendResponse: handleResponse(client, server, eventTransformer),
      sendBroadcastResponse: handleBroadcastResponse(client, server, eventTransformer),
      isAlive: true,
    })(client);

    const eventSubject$ = new Subject<WebSocketIncomingData>();
    const event$ = eventSubject$.pipe(map(eventTransformer.decode));
    const middlewares$ = combinedMiddlewares(event$, extendedClient);
    const effects$ = combinedEffects(middlewares$, extendedClient).pipe(
      tap(extendedClient.sendResponse),
      catchError(errorHandler(event$, extendedClient, error)),
    );

    const streamSubscription = connection(of(req), extendedClient).pipe(
      first(),
      mergeMapTo(effects$),
      catchError(handleClientValidationError(extendedClient))
    ).subscribe();

    client.on('message', event => eventSubject$.next(event));
    client.on('close', () => streamSubscription.unsubscribe());

    return handleClientBrokenConnection(extendedClient);
  };

  return (httpServer?: http.Server) => {
    const serverOptions: WebSocket.ServerOptions = httpServer
      ? { server: httpServer }
      : { noServer: true };

    const server = new WebSocket.Server(serverOptions);
    server.on('connection', onConnection(server));
    return handleServerBrokenConnections(server);
  };
};
