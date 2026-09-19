import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Keyboard, KeyboardEvent, Platform, StyleSheet } from 'react-native';
import { Conversation } from '../Conversation';
import { MessengerState } from '../useMessenger';

jest.mock('../theme', () => ({ useTwitterTheme: () => ({}) }));
jest.mock('../ui', () => ({
  Avatar: () => null, Button: () => null, IconButton: () => null,
  Notice: () => null, styles: {},
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 34 }),
}));
jest.mock('../useMessenger', () => ({
  useConversation: () => ({ loading: true, page: null }),
}));

test('keeps the composer above the home indicator and removes only the safe inset for the keyboard', async () => {
  const listeners: Record<string, () => void> = {};
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
  const addListener = Keyboard.addListener.bind(Keyboard);
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    listeners[event] = () => callback({} as KeyboardEvent);
    return addListener(event, callback);
  });
  const messenger = {
    api: {}, sendTyping: jest.fn(), refresh: jest.fn(),
    presence: [], typingPeers: [],
  } as unknown as MessengerState;
  let tree!: renderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = renderer.create(<Conversation messenger={messenger} peer={null}
        userId="alice" onBack={jest.fn()} active drafts={{ current: {} }} />);
    });
    const bottomPadding = () => StyleSheet.flatten(
      tree.root.findAllByProps({ testID: 'message-composer' })[0].props.style,
    ).paddingBottom;
    expect(bottomPadding()).toBe(46);
    await act(async () => listeners[Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow']());
    expect(bottomPadding()).toBe(12);
    await act(async () => listeners[Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide']());
    expect(bottomPadding()).toBe(46);
  } finally {
    await act(async () => tree?.unmount());
    jest.restoreAllMocks();
  }
});
