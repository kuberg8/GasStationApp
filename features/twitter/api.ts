export type User = { _id: string; first_name: string; last_name?: string };
export type Session = { token: string; user_id: string };
export type Post = {
  clientMessageId?: string;
  _id: string;
  message: string;
  created_at: number;
  user: User;
  recipient: string | null;
};
export type Chat = { peer: User; message: string; created_at: number };
export type Page = { posts: Post[]; nextCursor: string | null };
export type Endpoints = { api: string; socket: string };
export type Receipt = { position: string | null };
export const userName = (user?: User | null) =>
  [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Участник';
export const position = (post: Post) => `${String(post.created_at).padStart(16, '0')}:${post._id}`;
export function mergePosts(previous: Post[], incoming: Post[]) {
  const byId = new Map(previous.map((post) => [post._id, post]));
  incoming.forEach((post) => byId.set(post._id, post));
  return [...byId.values()].sort((a, b) => position(b).localeCompare(position(a)));
}
export function normalizeEndpoints(api: string, socket?: string): Endpoints {
  const url = new URL(api.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Укажите адрес сервера: https://example.com или http://192.168.1.10:3000');
  }
  const ws = new URL(socket?.trim() || api.trim().replace(/^http/, 'ws'));
  if (
    !['ws:', 'wss:'].includes(ws.protocol) ||
    ws.username ||
    ws.password ||
    ws.search ||
    ws.hash
  ) {
    throw new Error('Адрес WebSocket должен начинаться с ws:// или wss://');
  }
  return { api: url.toString().replace(/\/$/, ''), socket: ws.toString().replace(/\/$/, '') };
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function createTwitterApi(endpoints: Endpoints, token?: string, onExpired?: () => void) {
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${endpoints.api}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        /* Plain-text Express errors are valid too. */
      }
      if (!response.ok) {
        if (token && [401, 403].includes(response.status)) onExpired?.();
        throw new ApiError(
          data?.message || `Ошибка сервера (${response.status}). Попробуйте ещё раз.`,
          response.status,
        );
      }
      if (data === undefined)
        throw new Error('Сервер вернул неожиданный ответ. Проверьте адрес API.');
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && !['AbortError', 'TypeError'].includes(error.name)) throw error;
      throw new Error('Не удалось связаться с сервером. Проверьте подключение и адрес сервера.');
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    login: (email: string, password: string) =>
      request<Session>('/auth/login', 'POST', { email, password }),
    register: (email: string, password: string, first_name: string, last_name: string) =>
      request<{ message: string }>('/auth/registration', 'POST', {
        email,
        password,
        first_name,
        last_name,
      }),
    chats: () => request<Chat[]>('/chats'),
    users: (q: string) => request<User[]>(`/chats/users?q=${encodeURIComponent(q)}`),
    unread: () => request<Record<string, number>>('/chats/unread'),
    posts: (peer = '', before?: string | null) => {
      const params = new URLSearchParams();
      if (peer) params.set('peer', peer);
      if (before) params.set('before', before);
      return request<Page>(`/posts?${params}`);
    },
    send: (message: string, peer = '', clientMessageId?: string) =>
      request<{ post: Post }>('/posts', 'POST', { message, recipient: peer || null, ...(clientMessageId ? { clientMessageId } : {}) }),
    edit: (id: string, message: string) =>
      request<{ post: Post }>(`/posts/${encodeURIComponent(id)}`, 'PUT', { message }),
    remove: (id: string) => request<{ post: Post }>(`/posts/${encodeURIComponent(id)}`, 'DELETE'),
    removeChat: (peer: string, scope: 'self' | 'both') =>
      request(`/chats/${encodeURIComponent(peer)}`, 'DELETE', { scope }),
    read: (peer: string, messageId: string) =>
      request<void>(`/chats/${encodeURIComponent(peer || 'general')}/read`, 'POST', { messageId }),
    receipt: (peer: string) =>
      peer
        ? request<Receipt>(`/chats/${encodeURIComponent(peer)}/read`)
        : Promise.resolve({ position: null }),
  };
}
export type TwitterApi = ReturnType<typeof createTwitterApi>;
