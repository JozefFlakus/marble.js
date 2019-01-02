import { EventEmitter } from 'events';
import { TimeoutError } from 'rxjs';
import { Marbles } from '@marblejs/core/dist/+internal';
import { MarbleWebSocketClient, WebSocketStatus, WebSocketServer } from '../../websocket.interface';
import { WebSocketConnectionError } from '../../error/ws-error.model';
import {
  handleClientValidationError,
  handleClientBrokenConnection,
  handleServerBrokenConnections,
  HEART_BEAT_TERMINATE_INTERVAL,
} from '../websocket.helper';

class WebSocketClientMock extends EventEmitter {
  isAlive = false;
  ping = jest.fn();
  close = jest.fn();
  terminate = jest.fn();
}

describe('#handleServerBrokenConnections', () => {
  test('heartbeats', () => {
    // given
    const server = { clients: [new WebSocketClientMock()] };

    // when
    jest.spyOn(global, 'setInterval').mockImplementation(jest.fn(cb => cb()));
    server.clients.forEach(client => client.isAlive = true);
    handleServerBrokenConnections(server as any as WebSocketServer);

    // then
    server.clients.forEach(client => {
      expect(client.isAlive).toEqual(false);
      expect(client.ping).toHaveBeenCalled();
    });
  });

  test('terminates dead connections', () => {
    // given
    const server = { clients: [
      new WebSocketClientMock(),
      new WebSocketClientMock(),
    ] };

    // when
    jest.spyOn(global, 'setInterval').mockImplementation(jest.fn(cb => cb()));
    server.clients[0].isAlive = true;
    server.clients[1].isAlive = false;
    handleServerBrokenConnections(server as any as WebSocketServer);

    // then
    expect(server.clients[0].terminate).not.toHaveBeenCalled();
    expect(server.clients[1].terminate).toHaveBeenCalled();
  });
});

describe('#handleClientBrokenConnection', () => {
  test('heartbeats and closes stream', () => {
    // given
    const scheduler = Marbles.createTestScheduler();
    const client = new WebSocketClientMock() as any as MarbleWebSocketClient;
    const isAlive = true;

    // when
    const brokenConnection$ = handleClientBrokenConnection(client, scheduler);
    scheduler.schedule(() => client.emit('open'),    100);
    scheduler.schedule(() => client.isAlive = false, 150);
    scheduler.schedule(() => client.emit('ping'),    200);
    scheduler.schedule(() => client.isAlive = false, 250);
    scheduler.schedule(() => client.emit('pong'),    300);
    scheduler.schedule(() => client.emit('close'),   400);

    // then
    scheduler.run(({ expectObservable, flush }) => {
      expectObservable(brokenConnection$).toBe(
        '100ms a 99ms b 99ms c 99ms |',
        { a: isAlive, b: isAlive, c: isAlive },
      );
      flush();
      expect(client.terminate).not.toHaveBeenCalled();
    });
  });

  test('terminates if heartbeat is timed out', () => {
    // given
    const scheduler = Marbles.createTestScheduler();
    const client = new WebSocketClientMock() as any as MarbleWebSocketClient;
    const timeoutError = new TimeoutError();
    const isAlive = true;

    // when
    const brokenConnection$ = handleClientBrokenConnection(client, scheduler);
    scheduler.schedule(() => client.emit('open'), 100);

    // then
    scheduler.run(({ expectObservable, flush }) => {
      expectObservable(brokenConnection$).toBe(
        `100ms a ${HEART_BEAT_TERMINATE_INTERVAL - 1}ms #`,
        { a: isAlive },
        timeoutError,
      );
      flush();
      expect(client.terminate).toHaveBeenCalled();
    });
  });
});

describe('#handleClientValidationError', () => {
  test('closes connection with defined closing code', () => {
    // given
    const error = new WebSocketConnectionError('test', WebSocketStatus.NORMAL_CLOSURE);
    const client = new WebSocketClientMock() as any as MarbleWebSocketClient;

    // when
    client.isAlive = true;
    handleClientValidationError(client)(error);

    // then
    expect(client.isAlive).toEqual(false);
    expect(client.close).toHaveBeenCalledWith(error.status, error.message);
  });

  test('closes connection with defined closing code', () => {
    // given
    const error = new Error('test') as WebSocketConnectionError;
    const client = new WebSocketClientMock() as any as MarbleWebSocketClient;

    // when
    client.isAlive = true;
    handleClientValidationError(client)(error);

    // then
    expect(client.isAlive).toEqual(false);
    expect(client.close).toHaveBeenCalledWith(WebSocketStatus.INTERNAL_ERROR, error.message);
  });
});
