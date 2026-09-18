import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Chat, createTwitterApi, Endpoints, mergePosts, Page, Post, Session } from './api';

type Event = {
  type: string;
  users?: string[];
  peerId?: string | null;
  userId?: string;
  active?: boolean;
  position?: string;
  action?: string;
  post?: Post;
};
export function useMessenger(
  endpoints: Endpoints,
  session: Session,
  active: boolean,
  onExpired: () => void,
) {
  const api = useMemo(
    () => createTwitterApi(endpoints, session.token, onExpired),
    [endpoints, session.token, onExpired],
  );
  const [chats, setChats] = useState<Chat[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, { peer: string; until: number }>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [events, setEvents] = useState<(Event & { sequence: number })[]>([]);
  const eventSequence = useRef(0);
  const ws = useRef<WebSocket | null>(null);
  const mounted = useRef(true);
  const listRequest = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const lastTyping = useRef<Record<string, number>>({});
  const refresh = useCallback(async () => {
    const request = ++listRequest.current;
    try {
      const [nextChats, nextUnread] = await Promise.all([api.chats(), api.unread()]);
      if (mounted.current && request === listRequest.current) {
        setChats(nextChats);
        setUnread(nextUnread);
        setError('');
      }
    } catch (e) {
      if (mounted.current && request === listRequest.current) setError((e as Error).message);
    } finally {
      if (mounted.current && request === listRequest.current) setLoading(false);
    }
  }, [api]);
  const sendTyping = useCallback((peer: string, value: boolean) => {
    const socket = ws.current;
    if (socket?.readyState !== 1) return;
    const now = Date.now();
    if (value && now - (lastTyping.current[peer] || 0) < 1500) return;
    lastTyping.current[peer] = value ? now : 0;
    socket.send(JSON.stringify({ type: 'typing', peerId: peer, active: value }));
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      listRequest.current++;
    };
  }, [refresh]);
  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let online = false;
    let appActive = AppState.currentState === 'active';
    let lastReply = Date.now();
    let retry: ReturnType<typeof setTimeout>;
    let refreshTimer: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!disposed && appActive) void refresh();
      }, 250);
    };
    const sendPresence = () => {
      if (ws.current?.readyState === 1)
        ws.current.send(
          JSON.stringify({ type: 'presence', active: appActive && activeRef.current }),
        );
    };
    const connect = () => {
      if (disposed || !appActive) return;
      const socket = new WebSocket(endpoints.socket);
      ws.current = socket;
      lastReply = Date.now();
      socket.onopen = () => {
        if (!disposed) socket.send(JSON.stringify({ type: 'auth', token: session.token }));
      };
      socket.onmessage = (message) => {
        if (disposed || socket !== ws.current) return;
        try {
          const data: Event = JSON.parse(String(message.data));
          lastReply = Date.now();
          if (data.type === 'ready') {
            online = true;
            attempt = 0;
            setConnected(true);
            setPresence(data.users || []);
            sendPresence();
            scheduleRefresh();
            setRevision((value) => value + 1);
          } else if (data.type === 'presence') setPresence(data.users || []);
          else if (data.type === 'typing')
            setTyping((previous) => {
              const next = { ...previous };
              const key = `${data.peerId || ''}:${data.userId}`;
              if (data.active) next[key] = { peer: data.peerId || '', until: Date.now() + 5500 };
              else delete next[key];
              return next;
            });
          else if (
            ['posts:changed', 'chat:deleted', 'chat:read', 'unread:changed'].includes(data.type)
          ) {
            const next = { ...data, sequence: ++eventSequence.current };
            setEvents((previous) => [...previous.slice(-127), next]);
            scheduleRefresh();
          }
        } catch {
          /* Ignore malformed socket events; HTTP refresh remains available. */
        }
      };
      socket.onerror = () => socket.close();
      socket.onclose = (close) => {
        if (disposed || socket !== ws.current) return;
        online = false;
        setConnected(false);
        setPresence([]);
        setTyping({});
        if (close.code === 4001) {
          onExpired();
          return;
        }
        retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
      };
    };
    connect();
    const subscription = AppState.addEventListener('change', (state) => {
      appActive = state === 'active';
      sendPresence();
      if (appActive) {
        void refresh();
        setRevision((value) => value + 1);
        if (!ws.current || ws.current.readyState > 1) {
          clearTimeout(retry);
          connect();
        }
      }
    });
    const heartbeat = setInterval(() => {
      if (!appActive) return;
      if (Date.now() - lastReply > 45000) {
        ws.current?.close();
        return;
      }
      if (online) sendPresence();
    }, 15000);
    const fallback = setInterval(() => {
      if (appActive && activeRef.current && !online) {
        void refresh();
        setRevision((value) => value + 1);
      }
    }, 30000);
    const expiry = setInterval(
      () =>
        setTyping((previous) => {
          const next = Object.fromEntries(
            Object.entries(previous).filter(([, value]) => value.until > Date.now()),
          );
          return Object.keys(next).length === Object.keys(previous).length ? previous : next;
        }),
      1000,
    );
    return () => {
      disposed = true;
      subscription.remove();
      clearTimeout(retry);
      clearTimeout(refreshTimer);
      clearInterval(heartbeat);
      clearInterval(fallback);
      clearInterval(expiry);
      ws.current?.close();
      ws.current = null;
    };
  }, [api, endpoints.socket, session.token, refresh, onExpired]);
  useEffect(() => {
    if (ws.current?.readyState === 1)
      ws.current.send(
        JSON.stringify({ type: 'presence', active: active && AppState.currentState === 'active' }),
      );
    if (active) {
      void refresh();
      setRevision((value) => value + 1);
    }
  }, [active, refresh]);
  return {
    api,
    chats,
    unread,
    connected,
    presence,
    typingPeers: Object.values(typing).map((value) => value.peer),
    loading,
    error,
    refresh,
    events,
    revision,
    sendTyping,
  };
}
export type MessengerState = ReturnType<typeof useMessenger>;

export function useConversation(messenger: MessengerState, peer: string) {
  const { api, events, revision } = messenger;
  const seenEvent = useRef(events.at(-1)?.sequence || 0);
  const [page, setPage] = useState<Page | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const sequence = useRef(0);
  const change = useRef(0);
  const alive = useRef(true);
  const pageRef = useRef(page);
  pageRef.current = page;
  const olderBusy = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const version = change.current;
    try {
      const [next, read] = await Promise.all([api.posts(peer), api.receipt(peer)]);
      if (alive.current && request === sequence.current && version === change.current) {
        setPage({ ...next, posts: mergePosts([], next.posts) });
        setReceipt((previous) =>
          previous && (!read.position || previous > read.position) ? previous : read.position,
        );
        setError('');
      }
    } catch (e) {
      if (alive.current && request === sequence.current) setError((e as Error).message);
    } finally {
      if (alive.current && request === sequence.current) setLoading(false);
    }
  }, [api, peer]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, [refresh, revision]);
  useEffect(() => {
    for (const event of events) {
      if (event.sequence <= seenEvent.current) continue;
      seenEvent.current = event.sequence;
      if ((event.peerId || '') !== peer) continue;
      if (event.type === 'chat:read')
        setReceipt((previous) =>
          !previous || (event.position && event.position > previous)
            ? event.position || null
            : previous,
        );
      if (event.type === 'chat:deleted') {
        change.current++;
        setPage({ posts: [], nextCursor: null });
      }
      if (event.type === 'posts:changed') {
        change.current++;
        if (event.post && pageRef.current) {
          const post = event.post;
          setPage((previous) =>
            previous
              ? {
                  ...previous,
                  posts:
                    event.action === 'deleted'
                      ? previous.posts.filter((item) => item._id !== post._id)
                      : mergePosts(previous.posts, [post]),
                }
              : previous,
          );
        } else void refresh();
      }
    }
  }, [events, peer, refresh]);
  const loadOlder = async () => {
    const cursor = pageRef.current?.nextCursor;
    if (!cursor || olderBusy.current) return;
    olderBusy.current = true;
    setOlderLoading(true);
    const version = change.current;
    const generation = sequence.current;
    try {
      const next = await api.posts(peer, cursor);
      if (alive.current && version === change.current && generation === sequence.current)
        setPage((previous) => ({
          nextCursor: next.nextCursor,
          posts: mergePosts(next.posts, previous?.posts || []),
        }));
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      olderBusy.current = false;
      if (alive.current) setOlderLoading(false);
    }
  };
  const apply = (post: Post, remove = false) => {
    change.current++;
    setPage((previous) => ({
      nextCursor: previous?.nextCursor || null,
      posts: remove
        ? (previous?.posts || []).filter((item) => item._id !== post._id)
        : mergePosts(previous?.posts || [], [post]),
    }));
    void messenger.refresh();
  };
  return { page, receipt, error, loading, olderLoading, loadOlder, refresh, apply };
}
