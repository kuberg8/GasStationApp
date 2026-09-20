import { Chess } from 'chess.js';
import type { ChessboardState } from 'react-native-chessboard';

export function chessState(game = new Chess()): ChessboardState {
  return {
    fen: game.fen(),
    history: game.history({ verbose: true }),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    isStalemate: game.isStalemate(),
    isThreefoldRepetition: game.isThreefoldRepetition(),
    isInsufficientMaterial: game.isInsufficientMaterial(),
    isGameOver: game.isGameOver(),
  };
}

export function chessStatus(state: ChessboardState): string {
  const white = state.fen.split(' ')[1] === 'w';
  if (state.isCheckmate) return `Мат. Победили ${white ? 'чёрные' : 'белые'}`;
  if (state.isStalemate) return 'Ничья — пат';
  if (state.isThreefoldRepetition) return 'Ничья — повторение позиции';
  if (state.isInsufficientMaterial) return 'Ничья — недостаточно фигур';
  if (state.isDraw) return 'Ничья';
  return `${state.isCheck ? 'Шах! ' : ''}Ход ${white ? 'белых' : 'чёрных'}`;
}
