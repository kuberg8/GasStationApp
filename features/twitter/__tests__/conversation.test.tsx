import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { createTwitterApi, Post } from '../api';
import { MessengerState, useConversation } from '../useMessenger';
const post = (id: string): Post => ({
  _id: id,
  message: id,
  created_at: 1000,
  user: { _id: 'alice', first_name: 'Alice' },
  recipient: null,
});
let state: ReturnType<typeof useConversation>;
let tree: renderer.ReactTestRenderer;
function Harness({ messenger }: { messenger: MessengerState }) {
  state = useConversation(messenger, '');
  return null;
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
test('applies every event in a burst, scoped to the open conversation', async () => {
  const api = createTwitterApi({ api: 'http://test', socket: 'ws://test' });
  api.posts = jest.fn().mockResolvedValue({ posts: [post('a')], nextCursor: null });
  api.receipt = jest.fn().mockResolvedValue({ position: null });
  const messenger = {
    api,
    events: [],
    revision: 0,
    refresh: jest.fn(),
  } as unknown as MessengerState;
  await act(async () => {
    tree = renderer.create(<Harness messenger={messenger} />);
    await flush();
  });
  await act(async () =>
    tree.update(
      <Harness
        messenger={{
          ...messenger,
          events: [
            { sequence: 1, type: 'posts:changed', action: 'created', peerId: '', post: post('b') },
            { sequence: 2, type: 'posts:changed', action: 'created', peerId: '', post: post('c') },
            {
              sequence: 3,
              type: 'posts:changed',
              action: 'created',
              peerId: 'other',
              post: post('private'),
            },
          ],
        }}
      />,
    ),
  );
  expect(state.page?.posts.map((value) => value._id)).toEqual(['c', 'b', 'a']);
});
test('a late history response cannot resurrect a cleared conversation', async () => {
  let resolve: (value: unknown) => void = () => {};
  const api = createTwitterApi({ api: 'http://test', socket: 'ws://test' });
  api.posts = jest.fn().mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  api.receipt = jest.fn().mockResolvedValue({ position: null });
  const messenger = {
    api,
    events: [],
    revision: 0,
    refresh: jest.fn(),
  } as unknown as MessengerState;
  await act(async () => {
    tree = renderer.create(<Harness messenger={messenger} />);
  });
  await act(async () =>
    tree.update(
      <Harness
        messenger={{ ...messenger, events: [{ sequence: 1, type: 'chat:deleted', peerId: '' }] }}
      />,
    ),
  );
  await act(async () => {
    resolve({ posts: [post('old')], nextCursor: null });
    await flush();
  });
  expect(state.page?.posts).toEqual([]);
});
