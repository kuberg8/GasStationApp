import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router/react-navigation';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  Board,
  Mark,
  computerMove,
  emptyBoard,
  nextMark,
  outcome,
  playHumanMove,
} from './ticTacToe';

function useGameColors() {
  const dark = useColorScheme() === 'dark';
  return {
    ...Colors[dark ? 'dark' : 'light'],
    surface: dark ? '#202B31' : '#EAF2F6',
    accent: dark ? '#7CD4F3' : '#087C9F',
    opponent: dark ? '#F7BC8A' : '#B6571D',
    winning: dark ? '#214E47' : '#D4EFE5',
  };
}

export default function GamesScreen() {
  const colors = useGameColors();
  const focused = useIsFocused();
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    if (!focused || !selected) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(false);
      return true;
    });
    return () => subscription.remove();
  }, [focused, selected]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      {selected ? (
        <View style={styles.screen}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelected(false)}
            style={styles.back}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 16 }}>Все игры</Text>
          </Pressable>
          <TicTacToe active={focused} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>НЕБОЛЬШОЙ ПЕРЕРЫВ</Text>
          <Text style={[styles.title, { color: colors.text }]}>Игры</Text>
          <Text style={[styles.description, { color: colors.icon }]}>
            Выберите мини-игру и сыграйте короткую партию.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Играть в крестики-нолики"
            onPress={() => setSelected(true)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View
              style={styles.preview}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <MaterialIcons name="close" size={52} color={colors.accent} />
              <MaterialIcons name="radio-button-unchecked" size={44} color={colors.opponent} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Крестики-нолики</Text>
            <Text style={[styles.description, { color: colors.icon }]}>
              Три в ряд — и победа. Соперник — ваш телефон.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={{ color: colors.icon, fontSize: 13 }}>1 игрок · Без интернета</Text>
              <View style={[styles.play, { backgroundColor: colors.accent }]}>
                <MaterialIcons name="play-arrow" size={22} color={colors.background} />
              </View>
            </View>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TicTacToe({ active }: { active: boolean }) {
  const colors = useGameColors();
  const [human, setHuman] = useState<Mark>('X');
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [round, setRound] = useState(0);
  const [viewport, setViewport] = useState({ width: 320, height: 480 });
  const [headerHeight, setHeaderHeight] = useState(180);
  const result = outcome(board);
  const started = board.some((cell) => cell === human);
  const thinking = !result && nextMark(board) !== human;
  const boardSize = Math.max(
    156,
    Math.min(340, viewport.width - 32, viewport.height - headerHeight - 24),
  );
  useEffect(() => {
    if (!active || !thinking) return;
    const timer = setTimeout(() => {
      setBoard((current) => computerMove(current, human === 'X' ? 'O' : 'X'));
    }, 350);
    return () => clearTimeout(timer);
  }, [active, thinking, human, round]);
  const restart = () => {
    setBoard(emptyBoard());
    setRound((value) => value + 1);
  };
  const status = result
    ? result.winner === 'draw'
      ? 'Ничья!'
      : result.winner === human
        ? 'Вы победили!'
        : 'Телефон победил'
    : thinking
      ? 'Телефон думает…'
      : 'Ваш ход';
  const chooseFirst = (mark: Mark) => {
    setHuman(mark);
    restart();
  };
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.gameContent}
        onLayout={({ nativeEvent }) => setViewport(nativeEvent.layout)}
      >
        <View
          style={styles.gameHeader}
          onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}
        >
          <Text style={[styles.gameTitle, { color: colors.text }]}>Крестики-нолики</Text>
          <Text style={[styles.description, { color: colors.icon }]}>
            Соберите три своих знака в ряд.
          </Text>
          <Text style={[styles.label, { color: colors.icon }]}>Первый ход</Text>
          <View style={styles.choices}>
            {(['X', 'O'] as const).map((mark) => (
              <Pressable
                key={mark}
                accessibilityRole="button"
                accessibilityState={{ selected: human === mark, disabled: started && !result }}
                disabled={started && !result}
                onPress={() => chooseFirst(mark)}
                style={[
                  styles.choice,
                  {
                    backgroundColor: human === mark ? colors.accent : colors.surface,
                    opacity: started && !result && human !== mark ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: human === mark ? colors.background : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {mark === 'X' ? 'Вы' : 'Телефон'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.status, { backgroundColor: colors.surface }]}>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.cardTitle, { color: colors.text }]}
            >
              {status}
            </Text>
            <Text style={{ color: colors.icon }}>
              Вы играете {human === 'X' ? 'крестиками' : 'ноликами'}
            </Text>
          </View>
        </View>
        <View
          testID="game-board"
          style={[styles.board, { width: boardSize, height: boardSize }]}
        >
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.boardRow}>
              {board.slice(row * 3, row * 3 + 3).map((mark, column) => {
                const index = row * 3 + column;
                return (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    accessibilityLabel={`Строка ${Math.floor(index / 3) + 1}, столбец ${(index % 3) + 1}: ${mark === 'X' ? 'крестик' : mark === 'O' ? 'нолик' : 'пусто'}`}
                    accessibilityState={{ disabled: !!mark || !!result || thinking || !active }}
                    disabled={!!mark || !!result || thinking || !active}
                    onPress={() => setBoard((current) => playHumanMove(current, index, human))}
                    style={({ pressed }) => [
                      styles.cell,
                      {
                        backgroundColor: result?.line.includes(index)
                          ? colors.winning
                          : colors.surface,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    {mark && (
                      <MaterialIcons
                        name={mark === 'X' ? 'close' : 'radio-button-unchecked'}
                        size={46}
                        color={mark === human ? colors.accent : colors.opponent}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.gameFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={result ? 'Сыграть ещё' : 'Начать заново'}
          onPress={restart}
          style={({ pressed }) => [
            styles.restart,
            { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <MaterialIcons name="refresh" size={22} color={colors.background} />
          <Text style={{ color: colors.background, fontSize: 16, fontWeight: '600' }}>
            {result ? 'Сыграть ещё' : 'Начать заново'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 24,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 16,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 12 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  description: { fontSize: 15, lineHeight: 23 },
  card: { borderRadius: 24, padding: 24, gap: 16, marginTop: 8 },
  preview: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 12 },
  cardTitle: { fontSize: 21, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
  },
  gameTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  gameContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 12,
  },
  gameHeader: { gap: 8 },
  gameFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  label: { fontSize: 13 },
  choices: { flexDirection: 'row', gap: 10 },
  choice: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { borderRadius: 14, padding: 10, gap: 4 },
  board: { gap: 8, alignSelf: 'center' },
  boardRow: { flex: 1, flexDirection: 'row', gap: 8 },
  cell: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  restart: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 50,
    padding: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
