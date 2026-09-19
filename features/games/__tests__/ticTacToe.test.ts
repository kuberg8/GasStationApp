import {
  Board,
  computerMove,
  playHumanMove,
  emptyBoard,
  outcome,
  playTurn,
  startGame,
} from '../ticTacToe';

test.each([
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
])('recognizes the winning line %i %i %i', (a, b, c) => {
  const board = emptyBoard();
  [a, b, c].forEach((index) => {
    board[index] = 'X';
  });
  expect(outcome(board)).toEqual({ winner: 'X', line: [a, b, c] });
});
test('recognizes a draw and does not allow further moves', () => {
  const board: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  expect(outcome(board)?.winner).toBe('draw');
  expect(playTurn(board, 0, 'X')).toBe(board);
});
test('computer finishes its own line before blocking and blocks an opponent otherwise', () => {
  expect(computerMove(['O', 'O', null, 'X', 'X', null, null, null, null], 'O')[2]).toBe('O');
  expect(computerMove(['X', 'X', null, null, 'O', null, null, null, null], 'O')[2]).toBe('O');
});
test('human win ends the round without an extra computer move', () => {
  const board: Board = ['X', 'X', null, 'O', 'O', null, null, null, null];
  const next = playTurn(board, 2, 'X');
  expect(outcome(next)?.winner).toBe('X');
  expect(next.filter(Boolean)).toHaveLength(5);
  expect(board[2]).toBeNull();
});
test('occupied squares cannot be replayed and each valid turn includes the computer', () => {
  const board = startGame('O');
  expect(board.filter(Boolean)).toEqual(['X']);
  expect(playTurn(board, 4, 'O')).toBe(board);
  expect(playTurn(board, 0, 'O').filter(Boolean)).toHaveLength(3);
  expect(startGame('X')).toEqual(emptyBoard());
});

test('rejects a second human move until the computer responds', () => {
  const first = playHumanMove(emptyBoard(), 0, 'X');
  expect(playHumanMove(first, 1, 'X')).toBe(first);
  expect(playHumanMove(emptyBoard(), 0, 'O')).toEqual(emptyBoard());
  const reply = computerMove(first, 'O');
  expect(playHumanMove(reply, 1, 'X')[1]).toBe('X');
});
