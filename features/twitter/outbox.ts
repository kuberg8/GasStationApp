import type { Post } from './api';

export type OutgoingPost = Post & { deliveryStatus?: 'sending' | 'failed'; deliveryError?: string };
type Send = (message: string, peer: string, clientMessageId: string) => Promise<Post>;
let sequence = 0;

// Session-scoped: survives chat navigation, but never shares drafts between accounts.
export function createOutbox(userId: string, send: Send, onSent: (post: Post) => void = () => {}) {
  let snapshot: OutgoingPost[] = [];
  const listeners = new Set<() => void>();
  const publish = (next: OutgoingPost[]) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const attempt = async (post: OutgoingPost) => {
    const id = post.clientMessageId!;
    try {
      const result = await send(post.message, post.recipient || '', id);
      if (!result?._id) throw new Error('Сервер не подтвердил отправку.');
      // A socket acknowledgement or deleting the chat may already have removed this entry.
      if (!snapshot.some((item) => item.clientMessageId === id)) return;
      publish(snapshot.map((item) => item.clientMessageId === id ? { ...result, clientMessageId: id } : item));
      onSent(result);
    } catch (error) {
      publish(snapshot.map((item) => item.clientMessageId === id
        ? { ...item, deliveryStatus: 'failed', deliveryError: error instanceof Error ? error.message : 'Ошибка отправки' }
        : item));
    }
  };
  return {
    snapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    send(message: string, peer = '') {
      if (!message.trim()) return;
      const clientMessageId = `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      const post: OutgoingPost = {
        _id: `local:${clientMessageId}`, clientMessageId, message: message.trim(),
        created_at: Date.now(), recipient: peer || null,
        user: { _id: userId, first_name: 'Вы' }, deliveryStatus: 'sending',
      };
      publish([...snapshot, post]);
      void attempt(post);
    },
    retry(id: string) {
      const post = snapshot.find((item) => item._id === id);
      if (post?.deliveryStatus !== 'failed') return;
      const next: OutgoingPost = { ...post, deliveryStatus: 'sending', deliveryError: undefined };
      publish(snapshot.map((item) => item === post ? next : item));
      void attempt(next);
    },
    reconcile(posts: Post[]) {
      const next = snapshot.filter((item) => !posts.some((post) =>
        post._id === item._id || (post.clientMessageId && post.clientMessageId === item.clientMessageId && String(post.user._id) === userId)));
      if (next.length !== snapshot.length) publish(next);
    },
    remove(id: string) { publish(snapshot.filter((item) => item._id !== id)); },
    clearPeer(peer: string) { publish(snapshot.filter((item) => (item.recipient || '') !== peer)); },
  };
}

export function mergeOutgoing(posts: Post[], outgoing: OutgoingPost[], peer: string): OutgoingPost[] {
  return [...posts, ...outgoing.filter((item) => (item.recipient || '') === peer && !posts.some((post) =>
    post._id === item._id || (post.clientMessageId && post.clientMessageId === item.clientMessageId && String(post.user._id) === String(item.user._id))))];
}
