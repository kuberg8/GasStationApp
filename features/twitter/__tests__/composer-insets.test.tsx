import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { KeyboardChatView } from '../KeyboardChatView.native';
import { Conversation } from '../Conversation';
import { MessengerState } from '../useMessenger';

const mockKeyboard = { height: { value: 0 }, progress: { value: 0 } };
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  useAnimatedStyle: (style: () => object) => style(),
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardStickyView: require('react-native').View,
  useReanimatedKeyboardAnimation: () => mockKeyboard,
}));

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

test('keeps the composer spacing constant while the chat follows keyboard frames', async () => {
  const messenger = {
    api: {}, sendTyping: jest.fn(), refresh: jest.fn(),
    presence: [], typingPeers: [],
  } as unknown as MessengerState;
  let tree!: renderer.ReactTestRenderer;
  let dock!: renderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = renderer.create(<Conversation messenger={messenger} peer={null}
        userId="alice" onBack={jest.fn()} active drafts={{ current: {} }} />);
      dock = renderer.create(<KeyboardChatView testID="keyboard-dock" composer={null} />);
    });
    const composerStyle = StyleSheet.flatten(
      tree.root.findAllByProps({ testID: 'message-composer' })[0].props.style,
    );
    expect(composerStyle.padding).toBe(12);
    expect(composerStyle.paddingBottom).toBeUndefined();
    const sticky = dock.root.findAllByProps({ testID: 'keyboard-composer-dock' })[0];
    expect(sticky.props.offset).toEqual({ closed: -34, opened: 0 });
    await act(async () => {
      sticky.props.onLayout({ nativeEvent: { layout: { height: 72 } } });
    });
    // Opening, a keyboard height change, and reversing an interactive dismissal.
    for (const height of [0, 18, 90, 180, 320, 370, 210, 90, 160, 0]) {
      mockKeyboard.height.value = -height;
      mockKeyboard.progress.value = Math.min(height / 320, 1);
      await act(async () => {
        dock.update(<KeyboardChatView testID="keyboard-dock" composer={null} />);
      });
      const view = dock.root.findAllByProps({ testID: 'keyboard-chat-content' })
        .find((node) => node.props.style !== undefined)!;
      expect(StyleSheet.flatten(view.props.style).paddingBottom).toBe(72 + height + 34 * (1 - mockKeyboard.progress.value));
    }
  } finally {
    mockKeyboard.height.value = 0;
    mockKeyboard.progress.value = 0;
    await act(async () => { tree?.unmount(); dock?.unmount(); });
  }
});
