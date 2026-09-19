export type Mark = 'X' | 'O';
export type Board = (Mark | null)[];
export const emptyBoard = (): Board => Array(9).fill(null);
const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function outcome(board: Board): { winner: Mark | 'draw'; line: number[] } | null {
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return board.every(Boolean) ? { winner: 'draw', line: [] } : null;
}
const opposite = (mark: Mark): Mark => (mark === 'X' ? 'O' : 'X');
export function computerMove(board: Board, mark: Mark): Board {
  if (outcome(board)) return board;
  const available = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter((index) => !board[index]);
  // Finish a winning line, block the opponent, then prefer centre and corners.
  const winningMove = (player: Mark) =>
    available.find((index) => {
      const next = [...board];
      next[index] = player;
      return outcome(next)?.winner === player;
    });
  const index = winningMove(mark) ?? winningMove(opposite(mark)) ?? available[0];
  const next = [...board];
  next[index] = mark;
  return next;
}
export function startGame(human: Mark): Board {
  return human === 'X' ? emptyBoard() : computerMove(emptyBoard(), 'X');
}
export function playTurn(board: Board, index: number, human: Mark): Board {
  if (index < 0 || index >= 9 || board[index] || outcome(board)) return board;
  const next = [...board];
  next[index] = human;
  return computerMove(next, opposite(human));
}

export function nextMark(board: Board): Mark {
  return board.filter((mark) => mark === 'X').length ===
    board.filter((mark) => mark === 'O').length
    ? 'X'
    : 'O';
}
export function playHumanMove(board: Board, index: number, human: Mark): Board {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 9 ||
    board[index] ||
    outcome(board) ||
    nextMark(board) !== human
  )
    return board;
  const next = [...board];
  next[index] = human;
  return next;
}
