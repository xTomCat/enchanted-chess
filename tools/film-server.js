const path = require('path');

const SEED = Number(process.argv[2]) || 20260917;

function seeded(seed) {
  let state = (seed >>> 0) || 1;
  return function () {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;  state >>>= 0;
    return state / 4294967296;
  };
}

const ChessAI = require(path.resolve('chessAI.js'));
const search = ChessAI.rankedMoves;
const plies = new WeakMap();

ChessAI.rankedMoves = function (game, colour, options) {
  const ply = (plies.get(game) || 0) + 1;
  plies.set(game, ply);
  const real = Math.random;
  Math.random = seeded(SEED + ply);
  try {
    return search.call(this, game, colour, options);
  } finally {
    Math.random = real;
  }
};

console.log('film server: bot shuffle seeded with ' + SEED);
require(path.resolve('server.js'));
