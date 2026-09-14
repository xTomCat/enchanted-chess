// Move search for singleplayer bot. Uses Negamax w/ alpha-beta pruning. 
// Not perfect, doesn't check if a move leaves king in check, would be very expensive for now. capturing king has a high score, so should avoid hanging own king
// for the same reason the algorithm wants to take the opponent's king.

const PieceMovement = require('./public/shared/pieceMovement.js');

const CardDefinitions = require('./public/shared/cardDefinitions.js');

const VALUE = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };
const MATE = 1e6;
const MAX_DEPTH = 3;
const BUDGET_MS = 250;
const MIN_CARD_VALUE = 300; // do not spend a card on anything cheaper than a knight

const other = color => (color === 'white' ? 'black' : 'white');
const worth = piece => (piece ? VALUE[piece.type] : 0);
const clone = board => board.map(col => col.map(tile => ({ ...tile, piece: tile.piece && { ...tile.piece } })));

let nodes = 0;

function evaluate(board, color) {
  let score = 0;
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const piece = board[x][y].piece;
      if (!piece) continue;
      const centre = (3.5 - Math.abs(3.5 - x)) + (3.5 - Math.abs(3.5 - y));
      let value = VALUE[piece.type] + (piece.type === 'king' ? 0 : centre * 4);
      if (piece.type === 'pawn') value += (piece.color === 'white' ? 6 - y : y - 1) * 8;
      score += piece.color === color ? value : -value;
    }
  }
  return score;
}

function movesFor(board, color) {
  const moves = [];
  const board_ = { getBoard: () => board, getWidth: () => 8, getHeight: () => 8 };
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const piece = board[x][y].piece;
      if (!piece || piece.color !== color) continue;
      for (const move of PieceMovement.getAvailableMoves(board_, x, y, piece)) {
        moves.push({ from: { x, y }, to: { x: move.x, y: move.y }, captured: board[move.x][move.y].piece });
      }
    }
  }
  return moves.sort((a, b) => worth(b.captured) - worth(a.captured));
}

function make(board, move) {
  const piece = board[move.from.x][move.from.y].piece;
  board[move.to.x][move.to.y].piece = piece;
  board[move.from.x][move.from.y].piece = null;
  return piece;
}

function unmake(board, move, piece) {
  board[move.from.x][move.from.y].piece = piece;
  board[move.to.x][move.to.y].piece = move.captured || null;
}

function negamax(board, color, depth, alpha, beta) {
  nodes++;
  if (depth === 0) return evaluate(board, color);
  let best = -Infinity;
  for (const move of movesFor(board, color)) {
    if (move.captured && move.captured.type === 'king') return MATE;
    const piece = make(board, move);
    const score = -negamax(board, other(color), depth - 1, -beta, -alpha);
    unmake(board, move, piece);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? evaluate(board, color) : best;
}

// Returns every move for a color, ranked best -> worst
function rankedMoves(game, color) {
  const board = clone(game.getBoard());
  const started = Date.now();
  const moves = movesFor(board, color);
  let depth = 0;
  nodes = 0;

  moves.forEach((_, i) => { const j = Math.floor(Math.random() * (i + 1)); [moves[i], moves[j]] = [moves[j], moves[i]]; });

  for (let d = 1; d <= MAX_DEPTH; d++) {
    for (const move of moves) {
      if (move.captured && move.captured.type === 'king') { move.score = MATE; continue; }
      const piece = make(board, move);
      move.score = -negamax(board, other(color), d - 1, -Infinity, Infinity);
      unmake(board, move, piece);
    }
    depth = d;
    if (Date.now() - started > BUDGET_MS) break;
  }

  moves.sort((a, b) => b.score - a.score);
  console.log(`AI (${color}): depth ${depth}, ${nodes} nodes, ${Date.now() - started}ms`);
  return moves;
}

function bestCardTarget(card, game, player) {
  if (card.cost > player.energy) return null;
  const board = game.getBoard();
  let best = null;
  for (const tile of CardDefinitions.getPlayTiles(card.name, game, player.color)) {
    const piece = board[tile.x][tile.y].piece;
    if (piece && (!best || VALUE[piece.type] > VALUE[best.piece.type])) best = { x: tile.x, y: tile.y, piece };
  }
  return best && VALUE[best.piece.type] >= MIN_CARD_VALUE ? best : null;
}

module.exports = { rankedMoves, bestCardTarget };
