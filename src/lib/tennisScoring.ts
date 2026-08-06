import type { Match } from './types';

/**
 * Padel "default" (tennis-style) scoring helpers.
 *
 * Each match is played as a sequence of games ("set points"):
 *   - Within a game, points run 0 → 15 → 30 → 40.
 *   - After 40 (deuce) a side must win by 2 (advantage, then set point).
 *   - Winning a game awards the winning side 1 set point and resets the
 *     game points back to 0 – 0.
 *
 * The primary scoreboard shows SET POINTS (games won); the secondary
 * display shows the current game in tennis notation.
 */

const TENNIS_POINT_LABELS = ['0', '15', '30', '40'] as const;

/** Convert raw points (0…3) into tennis labels; show tally above 40. */
export function tennisPointLabel(rawPoints: number): string {
  if (rawPoints >= 0 && rawPoints <= 3) return TENNIS_POINT_LABELS[rawPoints];
  return String(rawPoints);
}

export type TennisGameStatus =
  | { state: 'playing' }
  | { state: 'deuce' }
  | { state: 'advantage'; side: 1 | 2 }
  | { state: 'win'; side: 1 | 2 };

/**
 * Determines the live state of a tennis-style game given each side's raw
 * point count. A side wins the game when it has >= 4 points and leads by 2.
 */
export function tennisGameStatus(score1: number, score2: number): TennisGameStatus {
  const diff = score1 - score2;
  const max = Math.max(score1, score2);

  if (max >= 4 && Math.abs(diff) >= 2) {
    return { state: 'win', side: diff > 0 ? 1 : 2 };
  }

  if (score1 >= 3 && score2 >= 3) {
    if (diff === 0) return { state: 'deuce' };
    return { state: 'advantage', side: diff > 0 ? 1 : 2 };
  }

  return { state: 'playing' };
}

/** Short textual summary of a game state (Deuce / Adv / Set Point / ''). */
export function tennisGameStatusText(status: TennisGameStatus): string {
  switch (status.state) {
    case 'deuce':
      return 'Deuce';
    case 'advantage':
      return 'Adv';
    case 'win':
      return 'Set Point';
    default:
      return '';
  }
}

/** The displayed label for one side within the current game (uses "A" on adv). */
export function tennisSideLabel(rawPoints: number, side: 1 | 2, status: TennisGameStatus): string {
  if (status.state === 'advantage' && status.side === side) return 'A';
  return tennisPointLabel(rawPoints);
}

/** True if the current game is complete (one side won). */
export function isTennisGameComplete(score1: number, score2: number): boolean {
  return tennisGameStatus(score1, score2).state === 'win';
}

/**
 * Applies a point to the raw game scores. Returns the updated game scores and,
 * if the game has just finished, the winning side (game points already reset
 * to 0 for the next game).
 */
export function applyTennisPoint(
  game1: number,
  game2: number,
  side: 1 | 2
): { game1: number; game2: number; wonSide: 1 | 2 | null } {
  const next1 = side === 1 ? game1 + 1 : game1;
  const next2 = side === 2 ? game2 + 1 : game2;

  const status = tennisGameStatus(next1, next2);
  if (status.state === 'win') {
    return { game1: 0, game2: 0, wonSide: status.side };
  }
  return { game1: next1, game2: next2, wonSide: null };
}

/** Validate a recorded (completed) tennis match score is sane for display. */
export function isSaneTennisMatch(match: Match): boolean {
  return (
    match.score1 !== null &&
    match.score2 !== null &&
    match.score1 >= 0 &&
    match.score2 >= 0
  );
}
