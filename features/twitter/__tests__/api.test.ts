import { ApiError, createTwitterApi, mergePosts, normalizeEndpoints, Post, position } from '../api';
const endpoints = normalizeEndpoints('https://twitter.example/');
const post = (id: string, created_at: number, message = id): Post => ({
  _id: id,
  message,
  created_at,
  user: { _id: 'alice', first_name: 'Alice' },
  recipient: 'bob',
});
const fetchMock = jest.fn();
beforeEach(() => {
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
});
function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok: status < 400,
    status,
    text: async () => JSON.stringify(data),
  });
}
test('uses the existing backend login and bearer-token contracts', async () => {
  respond({ token: 'session-token', user_id: 'alice' });
  const result = await createTwitterApi(endpoints).login('alice@example.com', 'password');
  expect(result.user_id).toBe('alice');
  expect(fetchMock).toHaveBeenLastCalledWith(
    'https://twitter.example/auth/login',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com', password: 'password' }),
    }),
  );
  respond({ posts: [], nextCursor: 'opaque-cursor' });
  await createTwitterApi(endpoints, result.token).posts('bob', 'cursor+=');
  expect(fetchMock).toHaveBeenLastCalledWith(
    'https://twitter.example/posts?peer=bob&before=cursor%2B%3D',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
    }),
  );
});
test('general messages have a null recipient and read responses may be empty', async () => {
  const api = createTwitterApi(endpoints, 'token');
  respond({ post: post('1', 1000) });
  await api.send('hello');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    message: 'hello',
    recipient: null,
  });
  respond(undefined, 204);
  await expect(api.read('', '1')).resolves.toBeUndefined();
  expect(fetchMock.mock.calls[1][0]).toBe('https://twitter.example/chats/general/read');
});
test('expires an authenticated session but not a failed login', async () => {
  const expired = jest.fn();
  respond({ message: 'Сессия истекла' }, 403);
  await expect(createTwitterApi(endpoints, 'token', expired).chats()).rejects.toBeInstanceOf(
    ApiError,
  );
  expect(expired).toHaveBeenCalledTimes(1);
  respond({ message: 'Неверный пароль' }, 400);
  await expect(createTwitterApi(endpoints, undefined, expired).login('a', 'b')).rejects.toThrow(
    'Неверный пароль',
  );
  expect(expired).toHaveBeenCalledTimes(1);
});
test('preserves error text and handles a network failure', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(createTwitterApi(endpoints).chats()).rejects.toThrow('Не удалось связаться');
});
test('merges realtime edits without duplicates and orders equal timestamps by ID', () => {
  const merged = mergePosts(
    [post('a', 1000), post('b', 1000)],
    [post('a', 1000, 'edited'), post('c', 2000)],
  );
  expect(merged.map((value) => value._id)).toEqual(['c', 'b', 'a']);
  expect(merged[2].message).toBe('edited');
  expect(position(post('a', 1000))).toBe('0000000000001000:a');
});
test('normalizes local/hosted endpoints and rejects credentials and non-http schemes', () => {
  expect(normalizeEndpoints('http://192.168.1.2:3000/')).toEqual({
    api: 'http://192.168.1.2:3000',
    socket: 'ws://192.168.1.2:3000',
  });
  expect(endpoints.socket).toBe('wss://twitter.example');
  expect(() => normalizeEndpoints('file:///tmp')).toThrow();
  expect(() => normalizeEndpoints('https://user:password@example.com')).toThrow();
});
