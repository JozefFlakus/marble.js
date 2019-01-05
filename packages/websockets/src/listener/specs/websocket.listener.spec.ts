import { throwError, fromEvent, forkJoin } from 'rxjs';
import { tap, map, mergeMap, first, toArray, take } from 'rxjs/operators';
import { webSocketListener } from '../websocket.listener';
import { WebSocketEvent } from '../../websocket.interface';
import { WebSocketEffect, WebSocketMiddleware, WebSocketConnectionEffect } from '../../effects/ws-effects.interface';
import { WebSocketError, WebSocketConnectionError } from '../../error/ws-error.model';
import { EventTransformer } from '../../transformer/transformer.inteface';
import { createWebSocketsTestBed } from '../../+internal';

describe('WebSocket listener', () => {
  describe('JSON transformer', () => {
    const testBed = createWebSocketsTestBed(2);

    beforeEach(testBed.bootstrap);
    afterEach(testBed.teardown);

    test('echoes back', done => {
      // given
      const targetClient = testBed.getClient(0);
      const httpServer = testBed.getServer();
      const echo$: WebSocketEffect = event$ => event$;
      const event = JSON.stringify({ type: 'EVENT', payload: 'test' });
      const webSocketServer = webSocketListener({ effects: [echo$] });

      // when
      webSocketServer(httpServer);
      targetClient.once('open', () => targetClient.send(event));

      // then
      targetClient.once('message', message => {
        expect(message).toEqual(event);
        done();
      });
    });

    test('echoes back to all clients', done => {
      // given
      const echo$: WebSocketEffect = (event$, client) => event$.pipe(
        mergeMap(client.sendBroadcastResponse),
      );
      const event = JSON.stringify({ type: 'EVENT', payload: 'test' });
      const webSocketServer = webSocketListener({ effects: [echo$] });
      const httpServer = testBed.getServer();
      const targetClient = testBed.getClient(0);

      // when
      webSocketServer(httpServer);
      targetClient.on('open', () => targetClient.send(event));

      // then
      const client1$ = fromEvent(testBed.getClient(0), 'message').pipe(first());
      const client2$ = fromEvent(testBed.getClient(1), 'message').pipe(first());

      forkJoin(client1$, client2$).subscribe(([ message1, message2 ]: [any, any]) => {
        expect(message1.data).toEqual(event);
        expect(message2.data).toEqual(event);
        done();
      });
    });

    test('echoes back on upgraded http server', done => {
      // given
      const echo$: WebSocketEffect = event$ => event$;
      const event = JSON.stringify({ type: 'EVENT', payload: 'test' });
      const webSocketServer = webSocketListener({ effects: [echo$] })();
      const targetClient = testBed.getClient(0);
      const httpServer = testBed.getServer();

      // when
      httpServer.on('upgrade', (request, socket, head) => {
        webSocketServer.handleUpgrade(request, socket, head, ws => {
          webSocketServer.emit('connection', ws, request);
        });
      });

      targetClient.once('open', () => targetClient.send(event));

      // then
      targetClient.once('message', message => {
        expect(message).toEqual(event);
        done();
      });
    });

    test('passes through middlewares', done => {
      // given
      const incomingEvent = JSON.stringify({ type: 'EVENT', payload: 0 });
      const outgoingEvent = JSON.stringify({ type: 'EVENT', payload: 3 });
      const e$: WebSocketEffect = event$ => event$;
      const m$: WebSocketMiddleware = event$ => event$.pipe(
        map(event => event as WebSocketEvent<number>),
        tap(event => event.payload !== undefined && event.payload++)
      );
      const targetClient = testBed.getClient(0);
      const httpServer = testBed.getServer();
      const webSocketServer = webSocketListener({
        effects: [e$],
        middlewares: [m$, m$, m$],
      });

      // when
      webSocketServer(httpServer);
      targetClient.once('open', () => targetClient.send(incomingEvent));

      // then
      targetClient.once('message', message => {
        expect(message).toEqual(outgoingEvent);
        done();
      });
    });

    test('triggers default error effect in middlewares stream multiple times', done => {
      // given
      const incomingEvent = '{ some: wrong JSON object }';
      const outgoingEvent = JSON.stringify({
        type: 'ERROR',
        error: { message: 'Unexpected token s in JSON at position 2' },
      });
      const targetClient = testBed.getClient(0);
      const httpServer = testBed.getServer();
      const webSocketServer = webSocketListener();

      // when
      webSocketServer(httpServer);
      targetClient.once('open', () => {
        targetClient.send(incomingEvent);
        targetClient.send(incomingEvent);
      });

      // then
      fromEvent(targetClient, 'message')
        .pipe(take(2), toArray())
        .subscribe((messages: any[]) => {
          expect(messages[0].data).toEqual(outgoingEvent);
          expect(messages[1].data).toEqual(outgoingEvent);
          done();
        });
    });

    test('triggers default error effect in effects stream multiple times', done => {
      // given
      const incomingEvent = JSON.stringify({ type: 'EVENT' });
      const outgoingEvent = JSON.stringify({ type: 'EVENT', error: { message: 'test message' } });
      const effect$: WebSocketEffect = event$ => event$.pipe(
        mergeMap(event => throwError(new WebSocketError(event, 'test message'))),
      );
      const targetClient = testBed.getClient(0);
      const httpServer = testBed.getServer();
      const webSocketServer = webSocketListener({ effects: [effect$] });

      // when
      webSocketServer(httpServer);
      targetClient.once('open', () => {
        targetClient.send(incomingEvent);
        targetClient.send(incomingEvent);
      });

      // then
      fromEvent(targetClient, 'message')
        .pipe(take(2), toArray())
        .subscribe((messages: any[]) => {
          expect(messages[0].data).toEqual(outgoingEvent);
          expect(messages[1].data).toEqual(outgoingEvent);
          done();
        });
    });

    test('triggers connection error', done => {
      // given
      const error = new WebSocketConnectionError('Unauthorized', 4000);
      const connection$: WebSocketConnectionEffect = req$ => req$.pipe(mergeMap(() => throwError(error)));
      const webSocketServer = webSocketListener({ connection: connection$ });
      const targetClient = testBed.getClient(0);
      const httpServer = testBed.getServer();

      // when
      webSocketServer(httpServer);
      targetClient.once('open', () => targetClient.send('test'));

      // then
      targetClient.once('close', (status, message) => {
        expect(status).toEqual(error.status);
        expect(message).toEqual(error.message);
        done();
      });
    });
  });

  describe('binary transformer', () => {
    const testBed = createWebSocketsTestBed();

    beforeEach(testBed.bootstrap);
    afterEach(testBed.teardown);

    test('operates over binary events', done => {
      // given
      const targetClient = testBed.getClient();
      const decodedMessage = 'hello world';
      const eventTransformer: EventTransformer<any, Buffer> = {
        decode: event => event,
        encode: event => event,
      };
      const effect$: WebSocketEffect<Buffer, string> = event$ => event$.pipe(
        map(event => event.toString('utf8'))
      );
      const httpServer = testBed.getServer();
      const webSocketServer = webSocketListener({ effects: [effect$], eventTransformer });

      // when
      webSocketServer(httpServer);
      targetClient.once('open', () => {
        targetClient.send(Buffer.from(decodedMessage));
      });

      // then
      targetClient.once('message', incomingMessage => {
        expect(incomingMessage).toEqual(decodedMessage);
        done();
      });
    });
  });
});
