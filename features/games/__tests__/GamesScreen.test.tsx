import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ScrollView, StyleSheet } from 'react-native';
import GamesScreen from '../GamesScreen';

jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: () => 'light' }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('opens a game, plays, restarts, and returns to the game chooser', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<GamesScreen />);
  });
  const button = (label: string) => tree.root.findAllByProps({ accessibilityLabel: label })[0];
  const text = (value: string) => tree.root.findAll((node) => node.props.children === value)[0];
  try {
    await act(async () => button('Играть в крестики-нолики').props.onPress());
    await act(async () => button('Строка 1, столбец 1: пусто').props.onPress());
    expect(button('Строка 1, столбец 1: крестик').props.accessibilityState.disabled).toBe(true);
    expect(button('Строка 2, столбец 2: пусто').props.accessibilityState.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(350));
    expect(button('Строка 2, столбец 2: нолик')).toBeDefined();
    // Use the enclosing accessible button rather than the text's native host node.
    const pressText = (value: string) => {
      let node = text(value);
      while (node && !node.props.onPress) node = node.parent!;
      node.props.onPress();
    };
    await act(async () => pressText('Начать заново'));
    expect(button('Строка 1, столбец 1: пусто').props.accessibilityState.disabled).toBe(false);
    await act(async () => pressText('Телефон'));
    await act(async () => jest.advanceTimersByTime(350));
    expect(button('Строка 2, столбец 2: крестик')).toBeDefined();
    await act(async () => pressText('Все игры'));
    expect(button('Играть в крестики-нолики')).toBeDefined();
  } finally {
    await act(async () => tree.unmount());
  }
});

test('empty board has explicit dimensions and restart stays outside the scroll area above tabs', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<GamesScreen />);
  });
  const button = (label: string) => tree.root.findAllByProps({ accessibilityLabel: label })[0];
  try {
    await act(async () => button('Играть в крестики-нолики').props.onPress());
    const scroll = tree.root.findByType(ScrollView);
    await act(async () =>
      scroll.props.onLayout({ nativeEvent: { layout: { width: 320, height: 420 } } }),
    );
    const board = tree.root.findAllByProps({ testID: 'game-board' })[0];
    const size = StyleSheet.flatten(board.props.style);
    expect(size.width).toBe(size.height);
    expect(size.width).toBeGreaterThanOrEqual(156);
    expect(size.width).toBeLessThanOrEqual(288);
    expect(scroll.findAllByProps({ accessibilityLabel: 'Начать заново' })).toHaveLength(0);
    expect(button('Начать заново')).toBeDefined();
    await act(async () => button('Строка 1, столбец 1: пусто').props.onPress());
    await act(async () => button('Начать заново').props.onPress());
    await act(async () => jest.advanceTimersByTime(500));
    expect(button('Строка 1, столбец 1: пусто').props.accessibilityState.disabled).toBe(false);
    expect(button('Строка 2, столбец 2: пусто').props.accessibilityState.disabled).toBe(false);
  } finally {
    await act(async () => tree.unmount());
  }
});
