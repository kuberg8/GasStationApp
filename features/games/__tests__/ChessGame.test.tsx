import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, ScrollView } from 'react-native';
import ChessGame from '../ChessGame';

jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
// The native canvas is mocked; moves and position resets use the real chess.js rules.
jest.mock('react-native-chessboard', () => {
  const React = require('react');
  const { Chess } = require('chess.js');
  return { __esModule: true, default: React.forwardRef((props: any, ref: any) => {
    const [game] = React.useState(() => new Chess());
    React.useImperativeHandle(ref, () => ({ resetBoard: (fen: string) => game.load(fen) }));
    return React.createElement('ChessCanvas', { ...props, play: (san: string) => {
      const move = game.move(san);
      props.onMove({ move });
    } });
  }) };
});

test('plays a complete game, preserves history through repeated undo, flips and resets', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<ChessGame active />); });
  const canvas = () => tree.root.findByType('ChessCanvas' as any);
  const button = (label: string) => tree.root.findAllByProps({ accessibilityLabel: label })[0];
  const hasText = (value: string) => tree.root.findAll((node) => node.props.children === value).length > 0;
  try {
    expect(button('Назад ход').props.disabled).toBe(true);
    for (const move of ['f3', 'e5', 'g4', 'Qh4#']) await act(async () => canvas().props.play(move));
    expect(hasText('Мат. Победили чёрные')).toBe(true);
    expect(canvas().props.gestureEnabled).toBe(false);
    await act(async () => button('Назад ход').props.onPress());
    await act(async () => button('Назад ход').props.onPress());
    expect(hasText('Ход белых')).toBe(true);
    expect(button('Назад ход').props.disabled).toBe(false);
    await act(async () => canvas().props.play('Nc3'));
    expect(hasText('Ход чёрных')).toBe(true);
    await act(async () => button('Повернуть').props.onPress());
    expect(canvas().props.flipped).toBe(true);
    const alert = jest.spyOn(Alert, 'alert');
    await act(async () => button('Новая партия').props.onPress());
    await act(async () => alert.mock.calls[0][2]![1].onPress!());
    expect(hasText('Ход белых')).toBe(true);
    expect(button('Назад ход').props.disabled).toBe(true);
    expect(tree.root.findByType(ScrollView).findAllByProps({ accessibilityLabel: 'Новая партия' })).toHaveLength(0);
    await act(async () => tree.update(<ChessGame active={false} />));
    expect(canvas().props.gestureEnabled).toBe(false);
  } finally {
    await act(async () => tree.unmount());
    jest.restoreAllMocks();
  }
});
