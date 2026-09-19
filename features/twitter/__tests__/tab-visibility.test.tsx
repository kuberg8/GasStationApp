import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TwitterScreen from '../TwitterScreen';
import { ChatList } from '../ChatList';
import { Conversation } from '../Conversation';

const mockSetOptions = jest.fn();
const mockNavigation = { setOptions: mockSetOptions };
jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation }));
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
jest.mock('../AuthProvider', () => ({
  useAuth: () => ({
    endpoints: { api: 'http://test', socket: 'ws://test' },
    session: { user_id: 'alice', token: 'token' },
  }),
}));
jest.mock('../useMessenger', () => ({ useMessenger: () => ({}) }));
jest.mock('../ChatList', () => ({ ChatList: () => null }));
jest.mock('../Conversation', () => ({ Conversation: () => null }));
jest.mock('../ui', () => ({ Avatar: () => null, styles: {} }));
jest.mock('../theme', () => ({ useTwitterTheme: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

test('hides tabs in general and private chats and restores them on back and unmount', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<TwitterScreen />); });
  expect(mockSetOptions).toHaveBeenLastCalledWith({ tabBarStyle: undefined });
  for (const peer of [null, { _id: 'bob', first_name: 'Bob' }]) {
    await act(async () => tree.root.findByType(ChatList).props.onSelect(peer));
    expect(mockSetOptions).toHaveBeenLastCalledWith({ tabBarStyle: { display: 'none' } });
    await act(async () => tree.root.findByType(Conversation).props.onBack());
    expect(mockSetOptions).toHaveBeenLastCalledWith({ tabBarStyle: undefined });
  }
  await act(async () => tree.root.findByType(ChatList).props.onSelect(null));
  await act(async () => tree.unmount());
  expect(mockSetOptions).toHaveBeenLastCalledWith({ tabBarStyle: undefined });
});
