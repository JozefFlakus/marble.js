import { matchType, mapToAction, mapToServer, broadcast } from './index';

test('exposed operators are available', () => {
  expect(broadcast).toBeDefined();
  expect(matchType).toBeDefined();
  expect(mapToAction).toBeDefined();
  expect(mapToServer).toBeDefined();
});
