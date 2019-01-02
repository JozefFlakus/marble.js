import * as http from 'http';
import * as WebSocket from 'ws';
import { Subject, of, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { combineEffects, combineMiddlewares } from '@marblejs/core';
import * as WS from '../websocket.interface';
import * as WSHelper from './websocket.helper';
import * as WSEffect from '../effects/ws-effects.interface';
import { jsonTransformer } from '../transformer/json.transformer';
import { EventTransformer } from '../transformer/transformer.inteface';
import { handleResponse, handleBroadcastResponse } from '../response/ws-response.handler';
import { handleEffectsError } from '../error/ws-error.handler';
import { provideErrorEffect } from '../error/ws-error.provider';

type HandleIncomingMessage =
  (client: WS.MarbleWebSocketClient) =>
  () => void;

type HandleIncomingConnection =
  (server: WS.MarbleWebSocketServer) =>
  (client: WS.WebSocketClient, request: http.IncomingMessage) =>  void;

export interface WebSocketListenerConfig<IncomingEvent, OutgoingEvent, IncomingError extends Error = Error> {
  effects?: WSEffect.WebSocketEffect<IncomingEvent, OutgoingEvent>[];
  middlewares?: WSEffect.WebSocketMiddleware<IncomingEvent, IncomingEvent>[];
  error?: WSEffect.WebSocketErrorEffect<IncomingError, IncomingEvent, OutgoingEvent>;
  eventTransformer?: EventTransformer<IncomingEvent, any>;
  connection?: WSEffect.WebSocketConnectionEffect;
}

export const webSocketListener = <IncomingEvent, OutgoingEvent, IncomingError extends Error>(
  config: WebSocketListenerConfig<IncomingEvent, OutgoingEvent, IncomingError> = {}
) => {
  const {
    error,
    effects = [],
    middlewares = [],
    eventTransformer,
    connection = (req$: Observable<http.IncomingMessage>) => req$,
  } = config;

  const combinedMiddlewares = combineMiddlewares(...middlewares);
  const combinedEffects = combineEffects(...effects);
  const error$ = provideErrorEffect(error, eventTransformer);
  const providedTransformer: EventTransformer<any, any> = eventTransformer || jsonTransformer;

  const handleIncomingMessage: HandleIncomingMessage = client => () => {
    const subscribeMiddlewares = (input$: Observable<any>) =>
      input$.subscribe(
        event => eventSubject$.next(event),
        error => handleEffectsError(client, error$)(error),
      );

    const subscribeEffects = (input$: Observable<any>) =>
      input$.subscribe(
        event => client.sendResponse(event),
        error => handleEffectsError(client, error$)(error),
      );

    const onMessage = (event: WS.WebSocketData) => {
      if (middlewaresSub.closed) { middlewaresSub = subscribeMiddlewares(middlewares$); }
      if (effectsSub.closed) { effectsSub = subscribeEffects(effects$); }
      incomingEventSubject$.next(event);
    };

    const onClose = () => {
      client.removeListener('message', onMessage);
      middlewaresSub.unsubscribe();
      effectsSub.unsubscribe();
    };

    const incomingEventSubject$ = new Subject<WS.WebSocketData>();
    const eventSubject$ = new Subject<IncomingEvent>();
    const decodedEvent$ = incomingEventSubject$.pipe(map(providedTransformer.decode));
    const middlewares$ = combinedMiddlewares(decodedEvent$, client);
    const effects$ = combinedEffects(eventSubject$, client);

    let middlewaresSub = subscribeMiddlewares(middlewares$);
    let effectsSub = subscribeEffects(effects$);

    client.on('message', onMessage);
    client.once('close', onClose);
  };

  const handleIncomingConnection: HandleIncomingConnection = (server) => (client, req) => {
    const request$ = of(req);
    const extendedClient = WSHelper.extendClientWith({
      sendResponse: handleResponse(client, providedTransformer),
      sendBroadcastResponse: handleBroadcastResponse(server, providedTransformer),
      isAlive: true,
    })(client);

    connection(request$, extendedClient).subscribe(
      handleIncomingMessage(extendedClient),
      WSHelper.handleClientValidationError(extendedClient),
    );

    WSHelper.handleClientBrokenConnection(extendedClient).subscribe();
  };

  return (server?: http.Server) => {
    const serverOptions: WebSocket.ServerOptions = server ? { server } : { noServer: true };
    const webSocketServer = WSHelper.createWebSocketServer(serverOptions);
    const sendBroadcastResponse = handleBroadcastResponse(webSocketServer, providedTransformer);
    const extendedWebSocketServer = WSHelper.extendServerWith({ sendBroadcastResponse })(webSocketServer);

    extendedWebSocketServer.on('connection', handleIncomingConnection(extendedWebSocketServer));
    WSHelper.handleServerBrokenConnections(extendedWebSocketServer).subscribe();

    return extendedWebSocketServer;
  };
};
