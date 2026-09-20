import { Chess } from 'chess.js';
import { chessState, chessStatus } from '../chess';

test('turns, checkmate, and undo are reflected in the Russian game status', () => {
  const game = new Chess();
  expect(chessStatus(chessState(game))).toBe('Ход белых');
  game.move('f3');
  expect(chessStatus(chessState(game))).toBe('Ход чёрных');
  ['e5', 'g4', 'Qh4#'].forEach((move) => game.move(move));
  expect(chessStatus(chessState(game))).toBe('Мат. Победили чёрные');
  game.undo();
  expect(chessState(game).isGameOver).toBe(false);
});
test('castling and en passant are legal and move all affected pieces', () => {
  const castle = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  castle.move({ from: 'e1', to: 'g1' });
  expect(castle.get('f1')?.type).toBe('r');
  expect(castle.get('h1')).toBeUndefined();
  const game = new Chess();
  ['e4', 'a6', 'e5', 'd5', 'exd6'].forEach((move) => game.move(move));
  expect(game.get('d5')).toBeUndefined();
  expect(game.get('d6')?.color).toBe('w');
});
test('pawn promotion supports a knight and stalemate is a draw', () => {
  const game = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
  game.move({ from: 'a7', to: 'a8', promotion: 'n' });
  expect(game.get('a8')?.type).toBe('n');
  const stalemate = new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
  expect(chessStatus(chessState(stalemate))).toBe('Ничья — пат');
});
test('repetition survives undo and illegal moves do not change the position', () => {
  const game = new Chess();
  const fen = game.fen();
  expect(() => game.move({ from: 'e2', to: 'e5' })).toThrow();
  expect(game.fen()).toBe(fen);
  ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'].forEach((move) => game.move(move));
  expect(chessStatus(chessState(game))).toBe('Ничья — повторение позиции');
  game.undo();
  expect(chessState(game).isGameOver).toBe(false);
  game.move('Ng8');
  expect(chessState(game).isThreefoldRepetition).toBe(true);
});
