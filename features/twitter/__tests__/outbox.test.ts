import { createOutbox, mergeOutgoing } from '../outbox';
import type { Post } from '../api';
const deferred = () => {
  let resolve!: (post: Post) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Post>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const confirmed = (id: string, clientMessageId: string, message = 'Hello'): Post => ({
  _id: id, clientMessageId, message, created_at: Date.now(), recipient: 'bob',
  user: { _id: 'alice', first_name: 'Alice' },
});
test('publishes immediately, allows overlapping sends and handles responses out of order', async () => {
  const first = deferred(), second = deferred();
  const send = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const outbox = createOutbox('alice', send);
  outbox.send('Hello', 'bob');
  outbox.send('Next', 'bob');
  const [a, b] = outbox.snapshot();
  expect(outbox.snapshot().map(p => p.deliveryStatus)).toEqual(['sending', 'sending']);
  second.resolve(confirmed('2', b.clientMessageId!, 'Next'));
  await flush();
  first.resolve(confirmed('1', a.clientMessageId!));
  await flush();
  expect(outbox.snapshot().map(p => p._id)).toEqual(['1', '2']);
  expect(outbox.snapshot().every(p => !p.deliveryStatus)).toBe(true);
});
test('keeps failed messages by conversation and retries once with the same request id', async () => {
  const retry = deferred();
  const send = jest.fn().mockRejectedValueOnce(new Error('offline')).mockReturnValue(retry.promise);
  const outbox = createOutbox('alice', send);
  outbox.send('Hello', 'bob');
  await flush();
  const failed = outbox.snapshot()[0];
  expect(failed.deliveryStatus).toBe('failed');
  expect(mergeOutgoing([], outbox.snapshot(), 'other')).toEqual([]);
  expect(mergeOutgoing([], outbox.snapshot(), 'bob')[0].message).toBe('Hello');
  outbox.retry(failed._id);
  outbox.retry(failed._id);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
  retry.resolve(confirmed('server', failed.clientMessageId!));
  await flush();
  expect(outbox.snapshot()[0]._id).toBe('server');
});
test('socket acknowledgement wins over a later HTTP failure without duplicates', async () => {
  const request = deferred();
  const outbox = createOutbox('alice', () => request.promise);
  outbox.send('Hello', 'bob');
  const server = confirmed('server', outbox.snapshot()[0].clientMessageId!);
  expect(mergeOutgoing([server], outbox.snapshot(), 'bob')).toEqual([server]);
  outbox.reconcile([server]);
  request.reject(new Error('timeout'));
  await flush();
  expect(outbox.snapshot()).toEqual([]);
});
test('clearing a conversation does not allow a late response to restore it', async () => {
  const request = deferred();
  const onSent = jest.fn();
  const outbox = createOutbox('alice', () => request.promise, onSent);
  outbox.send('Hello', 'bob');
  const id = outbox.snapshot()[0].clientMessageId!;
  outbox.clearPeer('bob');
  request.resolve(confirmed('server', id));
  await flush();
  expect(outbox.snapshot()).toEqual([]);
  expect(onSent).not.toHaveBeenCalled();
});
