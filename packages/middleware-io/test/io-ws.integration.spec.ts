import { createWebSocketsTestBed } from '@marblejs/websockets/dist/+internal';
import { app } from './io-ws.integration';
import { createContext } from '@marblejs/core';

describe('@marblejs/middleware-io - WebSocket integration', () => {
  const testBed = createWebSocketsTestBed();

  beforeEach(testBed.bootstrap);
  afterEach(testBed.teardown);

  test('[POST_USER] sends user object', done => {
    // given
    const user = { id: 'id', age: 100, };
    const event = JSON.stringify({ type: 'POST_USER', payload: user });
    const server = testBed.getServer();
    const targetClient = testBed.getClient();
    const context = createContext();

    // when
    app({ server }).run(context);
    targetClient.once('open', () => targetClient.send(event));

    // then
    targetClient.once('message', message => {
      expect(message).toEqual(event);
      done();
    });
  });

  test('[POST_USER] throws an error if incoming object is invalid', done => {
    // given
    const server = testBed.getServer();
    const targetClient = testBed.getClient();
    const context = createContext();
    const user = { id: 'id', age: '100', };
    const event = JSON.stringify({ type: 'POST_USER', payload: user });
    const expectedError = {
      type: 'POST_USER',
      error: {
        message: 'Validation error',
        data: [{ path: 'age', expected: 'number', got: '"100"' }],
      },
    };

    // when
    app({ server }).run(context);
    targetClient.once('open', () => targetClient.send(event));

    // then
    targetClient.once('message', message => {
      const parsedMessage = JSON.parse(message);
      expect(parsedMessage).toEqual(expectedError);
      done();
    });
  });
});
