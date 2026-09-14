// Universal module that works in both Node.js and browser
(function(exports) {

  const DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

  function fireballTiles(board, color) {
    const grid = board.getBoard();
    const tiles = [];
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const piece = grid[x][y].piece;
        if (!piece || piece.color !== color) continue;
        for (const [dx, dy] of DIRECTIONS) {
          let nx = x + dx, ny = y + dy;
          while (grid[nx] && grid[nx][ny]) {
            const target = grid[nx][ny].piece;
            if (target) {
              if (target.color !== color && target.type !== "king") tiles.push({ x: nx, y: ny });
              break;
            }
            nx += dx; ny += dy;
          }
        }
      }
    }
    return tiles;
  }

  const CARDS = [
    {
      id: 1,
      name: "Placeholder",
      cost: 1,
      image: "Assets/backofcard.png",
      description: "This card does nothing.<br> It can be played, but has no effect.<br><br>Cost: 1"
    },
    {
      id: 2,
      name: "Fireball",
      cost: 3,
      image: "Assets/fireballcard.png",
      description: "Eliminates 1 enemy piece within<br>eyesight of any friendly piece.<br><br>Cost: 3",
      tiles: fireballTiles,
      effect: (board, x, y) => board.setTileData(x, y, { piece: null })
    }
  ];

  const byName = name => CARDS.find(card => card.name === name);
  const byId = id => CARDS.find(card => card.id === id);

  function getPlayTiles(name, board, color) {
    const card = byName(name);
    return card && card.tiles ? card.tiles(board, color) : [];
  }

  function isValidTarget(name, board, x, y, color) {
    const card = byName(name);
    if (!card) return false;
    return !card.tiles || card.tiles(board, color).some(tile => tile.x === x && tile.y === y);
  }

  function applyEffect(name, board, x, y, color) {
    const card = byName(name);
    if (!card || !isValidTarget(name, board, x, y, color)) return false;
    if (card.effect) card.effect(board, x, y, color);
    return true;
  }

  exports.CARDS = CARDS;
  exports.byName = byName;
  exports.byId = byId;
  exports.getPlayTiles = getPlayTiles;
  exports.isValidTarget = isValidTarget;
  exports.applyEffect = applyEffect;

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.CardDefinitions = {}));
