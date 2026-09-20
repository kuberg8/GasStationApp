import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { Conversation } from '../Conversation';
import { createOutbox } from '../outbox';
import { createTwitterApi, Post } from '../api';
import { MessengerState } from '../useMessenger';
jest.mock('../KeyboardChatView', () => ({
  KeyboardChatView: ({ children, composer }: any) => require('react').createElement(require('react-native').View, {}, children, composer),
}));
jest.mock('../theme', () => ({ useTwitterTheme: () => ({}) }));
jest.mock('../ui', () => ({
  Avatar: () => null, Notice: () => null, styles: {}, Button: () => null,
  IconButton: ({ label, ...props }: any) => require('react').createElement(require('react-native').Pressable, { ...props, accessibilityLabel: label }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 34 }),
}));
test('clears the input immediately and shows a failed bubble without replacing the next draft', async () => {
  let reject!: (error: Error) => void;
  const api = createTwitterApi({ api: 'http://test', socket: 'ws://test' });
  api.posts = jest.fn().mockResolvedValue({ posts: [], nextCursor: null });
  api.receipt = jest.fn().mockResolvedValue({ position: null });
  const outbox = createOutbox('alice', () => new Promise<Post>((_, no) => { reject = no; }));
  const messenger = { api, outbox, events: [], revision: 0, refresh: jest.fn(),
    sendTyping: jest.fn(), presence: [], typingPeers: [] } as unknown as MessengerState;
  const drafts = { current: {} };
  let tree!: renderer.ReactTestRenderer;
  try {
    await act(async () => { tree = renderer.create(<Conversation messenger={messenger}
      peer={null} userId="alice" active onBack={jest.fn()} drafts={drafts} />); });
    const input = () => tree.root.findByType(TextInput);
    await act(async () => input().props.onChangeText('Мгновенно'));
    await act(async () => tree.root.findAllByProps({ label: 'Отправить сообщение' })[0].props.onPress());
    expect(input().props.value).toBe('');
    expect(input().props.editable).toBe(true);
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Отправляется' }).length).toBeGreaterThan(0);
    await act(async () => input().props.onChangeText('Следующее'));
    await act(async () => reject(new Error('offline')));
    expect(input().props.value).toBe('Следующее');
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Не доставлено. Повторить отправку' }).length).toBeGreaterThan(0);
  } finally { await act(async () => tree?.unmount()); }
});
