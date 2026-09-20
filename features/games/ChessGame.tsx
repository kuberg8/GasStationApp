import React, { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Chess } from 'chess.js';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';
import { useGameColors } from './theme';
import { chessState, chessStatus } from './chess';

export default function ChessGame({ active }: { active: boolean }) {
  const colors = useGameColors();
  const board = useRef<ChessboardRef>(null);
  const [game] = useState(() => new Chess());
  const [state, setState] = useState(chessState);
  const [flipped, setFlipped] = useState(false);
  const [round, setRound] = useState(0);
  const [error, setError] = useState('');
  const [viewport, setViewport] = useState({ width: 320, height: 480 });
  const [headerHeight, setHeaderHeight] = useState(120);
  const boardSize =
    Math.floor(
      Math.max(200, Math.min(440, viewport.width - 24, viewport.height - headerHeight - 24)) /
        8,
    ) * 8;
  const lastMove = state.history.at(-1);
  const reset = () => {
    game.reset();
    setRound((value) => value + 1);
    setState(chessState());
    setError('');
  };
  const newGame = () => {
    if (!state.history.length || state.isGameOver) {
      reset();
      return;
    }
    Alert.alert('Начать новую партию?', 'Текущая партия будет сброшена.', [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Новая партия', onPress: reset },
    ]);
  };
  const undo = () => {
    if (!board.current) return;
    // Keep the full history in our rules engine: the board's reset API loads
    // a FEN and discards its internal history (including repetition counts).
    game.undo();
    board.current.resetBoard(game.fen());
    setState(chessState(game));
    setError('');
  };
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        onLayout={({ nativeEvent }) => setViewport(nativeEvent.layout)}
      >
        <View
          style={styles.header}
          onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}
        >
          <Text style={[styles.title, { color: colors.text }]}>Шахматы</Text>
          <Text style={{ color: colors.icon, fontSize: 13 }}>
            Вдвоём на одном телефоне · Перетаскивайте фигуры
          </Text>
          <View style={[styles.status, { backgroundColor: colors.surface }]}>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.turn, { color: colors.text }]}
            >
              {chessStatus(state)}
            </Text>
            <Text style={{ color: colors.icon, fontSize: 13 }}>
              {error ||
                (lastMove
                  ? `Последний ход: ${lastMove.from} → ${lastMove.to}`
                  : 'Белые начинают партию')}
            </Text>
          </View>
        </View>
        <View
          testID="chess-board-container"
          style={{ width: boardSize, height: boardSize, alignSelf: 'center' }}
        >
          <Chessboard
            key={round}
            ref={board}
            boardSize={boardSize}
            flipped={flipped}
            gestureEnabled={active && !state.isGameOver}
            fontSource={require('../../assets/fonts/SpaceMono-Regular.ttf')}
            colors={{
              white: '#EDE7D9',
              black: '#77958A',
              lastMoveHighlight: '#F4D35E88',
              checkmateHighlight: '#E76F51',
              promotionPieceButton: '#EDE7D9',
            }}
            onMove={({ move }) => {
              try {
                game.move({ from: move.from, to: move.to, promotion: move.promotion });
                setState(chessState(game));
                setError('');
              } catch {
                board.current?.resetBoard(game.fen());
                setError('Ход не выполнен. Попробуйте ещё раз.');
              }
            }}
            onIllegalMove={() => setError('Недопустимый ход. Выберите другую клетку.')}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {(
          [
            {
              label: 'Назад ход',
              icon: 'undo',
              onPress: undo,
              disabled: !state.history.length,
            },
            {
              label: 'Повернуть',
              icon: 'flip-camera-android',
              onPress: () => setFlipped((value) => !value),
              disabled: false,
            },
            { label: 'Новая партия', icon: 'refresh', onPress: newGame, disabled: false },
          ] as const
        ).map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: action.disabled }}
            disabled={action.disabled}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: colors.surface,
                opacity: action.disabled ? 0.4 : pressed ? 0.65 : 1,
              },
            ]}
          >
            <MaterialIcons name={action.icon} size={22} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 12, textAlign: 'center' }}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { gap: 8 },
  title: { fontSize: 26, fontWeight: '700' },
  turn: { fontSize: 18, fontWeight: '600' },
  status: { padding: 12, borderRadius: 14, gap: 4 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  action: {
    flex: 1,
    minHeight: 60,
    padding: 8,
    borderRadius: 12,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
