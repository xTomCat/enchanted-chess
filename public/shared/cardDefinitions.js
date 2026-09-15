// Universal module that works in both Node.js and browser
(function(exports) {

  const DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const PLACEHOLDER_ART = "Assets/backofcard.png";

  let PieceClass = null;
  const makePiece = (type, color) => new PieceClass(type, color);

  function tilesWhere(board, match) {
    const grid = board.getBoard();
    const tiles = [];
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        if (match(grid[x][y].piece, x, y)) tiles.push({ x, y });
      }
    }
    return tiles;
  }

  const ownHalf = (y, color) => color === "white" ? y >= 4 : y <= 3;
  const mine = (piece, color) => piece && piece.color === color;

  function fireballTiles(board, color) {
    const grid = board.getBoard();
    const tiles = [];
    for (const from of tilesWhere(board, piece => mine(piece, color))) {
      for (const [dx, dy] of DIRECTIONS) {
        let x = from.x + dx, y = from.y + dy;
        while (grid[x] && grid[x][y]) {
          const target = grid[x][y].piece;
          if (target) {
            if (target.color !== color && target.type !== "king") tiles.push({ x, y });
            break;
          }
          x += dx; y += dy;
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
      image: PLACEHOLDER_ART,
      description: "This card does nothing.<br> It can be played, but has no effect.<br><br>Cost: 1"
    },
    {
      id: 2,
      name: "Fireball",
      flash: [255, 90, 30],
      cost: 3,
      image: "Assets/fireballcard.png",
      description: "Eliminates 1 enemy piece within<br>eyesight of any friendly piece.<br><br>Cost: 3",
      tiles: fireballTiles,
      effect: (board, x, y) => board.setTileData(x, y, { piece: null })
    },
    {
      id: 3,
      name: "Summon Pawn",
      flash: [90, 255, 130],
      cost: 3,
      image: "Assets/summoncard.png",
      description: "Places a new pawn on any empty<br>tile in your own half.<br><br>Cost: 3",
      tiles: (board, color) => tilesWhere(board, (piece, x, y) => !piece && ownHalf(y, color)),
      effect: (board, x, y, color) => board.setTileData(x, y, { piece: makePiece("pawn", color) })
    },
    {
      id: 4,
      name: "Blink",
      flash: [120, 190, 255],
      cost: 4,
      image: "Assets/blinkcard.png",
      description: "Teleports a friendly piece to an<br>empty tile up to 2 squares away.<br>Kings cannot blink.<br><br>Cost: 4",
      tiles: (board, color) => tilesWhere(board, piece => mine(piece, color) && piece.type !== "king"),
      originTiles: (board, color, origin) => tilesWhere(board, (piece, x, y) =>
        !piece && Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) <= 2),
      effect: (board, x, y, color, origin) => {
        const piece = board.getTileData(origin.x, origin.y).piece;
        board.setTileData(origin.x, origin.y, { piece: null });
        board.setTileData(x, y, { piece });
      }
    },
    {
      id: 5,
      name: "Transmute",
      flash: [235, 140, 255],
      cost: 4,
      image: PLACEHOLDER_ART,
      description: "Turns one of your pawns into<br>a knight or a bishop.<br><br>Cost: 4",
      choices: ["knight", "bishop"],
      prompt: "Transmute into",
      tiles: (board, color) => tilesWhere(board, piece => mine(piece, color) && piece.type === "pawn"),
      effect: (board, x, y, color, choice) => board.setTileData(x, y, { piece: makePiece(choice, color) })
    }
  ];

  const byName = name => CARDS.find(card => card.name === name);

  function getPlayTiles(name, board, color, origin) {
    const card = byName(name);
    if (!card) return [];
    if (origin && card.originTiles) return card.originTiles(board, color, origin);
    return card.tiles ? card.tiles(board, color) : [];
  }

  const holds = (tiles, x, y) => tiles.some(tile => tile.x === x && tile.y === y);

  function isValidTarget(name, board, x, y, color, extra) {
    const card = byName(name);
    if (!card) return false;
    if (card.choices && !card.choices.includes(extra)) return false;
    if (card.originTiles) {
      if (!extra || !holds(card.tiles(board, color), extra.x, extra.y)) return false;
      return holds(card.originTiles(board, color, extra), x, y);
    }
    return !card.tiles || holds(card.tiles(board, color), x, y);
  }

  function applyEffect(name, board, x, y, color, extra) {
    const card = byName(name);
    if (!card || !isValidTarget(name, board, x, y, color, extra)) return false;
    if (card.effect) card.effect(board, x, y, color, extra);
    return true;
  }

  exports.CARDS = CARDS;
  exports.byName = byName;
  exports.getPlayTiles = getPlayTiles;
  exports.isValidTarget = isValidTarget;
  exports.applyEffect = applyEffect;
  exports.setPieceClass = cls => { PieceClass = cls; };

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.CardDefinitions = {}));
