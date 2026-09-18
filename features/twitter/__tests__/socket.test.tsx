import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import { useMessenger } from '../useMessenger';
class TestSocket {
  static instances: TestSocket[] = [];
  readyState = 0;
  onopen = () => {};
  onclose = (_event: { code: number }) => {};
  onmessage = (_event: { data: string }) => {};
  onerror = () => {};
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = 3;
    this.onclose({ code: 1006 });
  });
  constructor(public url: string) {
    TestSocket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen();
  }
  event(value: unknown) {
    this.onmessage({ data: JSON.stringify(value) });
  }
}
const endpoints = { api: 'http://test', socket: 'ws://test' };
const session = { token: 'test-token', user_id: 'alice' };
const expired = jest.fn();
let tree: renderer.ReactTestRenderer;
let result: ReturnType<typeof useMessenger>;
function Harness({ active = true }: { active?: boolean }) {
  result = useMessenger(endpoints, session, active, expired);
  return null;
}
beforeEach(() => {
  jest.useFakeTimers();
  TestSocket.instances = [];
  expired.mockClear();
  globalThis.WebSocket = TestSocket as unknown as typeof WebSocket;
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  globalThis.fetch = jest
    .fn()
    .mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(url.endsWith('/unread') ? {} : []),
    }));
});
afterEach(async () => {
  await act(async () => tree.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});
test('authenticates over the socket and reports inactive presence when the tab is hidden', async () => {
  await act(async () => {
    tree = renderer.create(<Harness />);
  });
  const socket = TestSocket.instances[0];
  act(() => socket.open());
  expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'auth', token: 'test-token' }));
  act(() => socket.event({ type: 'ready', users: ['bob'] }));
  expect(result.connected).toBe(true);
  expect(result.presence).toEqual(['bob']);
  await act(async () => tree.update(<Harness active={false} />));
  expect(socket.send).toHaveBeenLastCalledWith(JSON.stringify({ type: 'presence', active: false }));
});
test('reconnects after a dropped connection and expires invalid sessions instead of retrying', async () => {
  await act(async () => {
    tree = renderer.create(<Harness />);
  });
  act(() => TestSocket.instances[0].close());
  await act(async () => jest.advanceTimersByTime(1000));
  expect(TestSocket.instances).toHaveLength(2);
  act(() => TestSocket.instances[1].onclose({ code: 4001 }));
  expect(expired).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(5000));
  expect(TestSocket.instances).toHaveLength(2);
});
