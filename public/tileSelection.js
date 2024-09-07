let rayStart;
let rayEnd;

function getSelectedTile(mouseX, mouseY, chessBoardObject) {
  let chessBoard = chessBoardObject.getBoard();
  let width = _renderer.width;
  let height = _renderer.height;
  // convert mouse coordinates to NDC
  let xNDC = (2 * mouseX) / width - 1;
  let yNDC = 1 - (2 * mouseY) / height;

  
  let projMatrix = _renderer.uPMatrix.mat4;
  let viewMatrix = _renderer.uMVMatrix.mat4;

  // combined transformation matrix (from projection and modelView matrices)
  let combinedMatrix = mat4.create();
  mat4.multiply(combinedMatrix, projMatrix, viewMatrix);

  // invert the combined matrix
  let invCombinedMatrix = mat4.create();
  mat4.invert(invCombinedMatrix, combinedMatrix);

  // transform the NDC coordinates to world coordinates for the near and far points
  let nearPoint = vec3.transformMat4(vec3.create(), [xNDC, yNDC, -1], invCombinedMatrix);
  let farPoint = vec3.transformMat4(vec3.create(), [xNDC, yNDC, 1], invCombinedMatrix);
  // Normalize the ray direction
  let rayDir = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), farPoint, nearPoint));
  for (let x = 0; x < chessBoardObject.getWidth(); x++) {
    for (let y = 0; y < chessBoardObject.getHeight(); y++) {
      if (rayIntersectsTile(nearPoint, rayDir, chessBoardObject, x, y)) {
        return worldToBoardIndices(chessBoard[x][y].x, chessBoard[x][y].z, chessBoardObject);
      }
    }
  }

  return null;
}

function rayIntersectsTile(nearPoint, rayDir, chessBoardObject, x, y) {
  //Initialise relevant variables
  let chessBoard = chessBoardObject.getBoard();
  let tile = chessBoard[x][y];
  let tileSize = chessBoardObject.getTileSize();
  //Solve t for 0
  let t = -nearPoint[1] / rayDir[1];
  //If the raycast is going in the wrong direction, instantly returns false
  if (t < 0) {
    return false
  };
  //Calculation for the point of intersection
  let intersectPoint = vec3.create();
  vec3.scaleAndAdd(intersectPoint, nearPoint, rayDir, t);
  let epsilon = 0.0001; // small epsilon value to avoid problems with precision
  //calculate tile bounds based on the tile center coordinate and the tile size
  let minX = (tile.x) - tileSize / 2;
  let maxX = (tile.x) + tileSize / 2;
  let minZ = (tile.z) - tileSize / 2;
  let maxZ = (tile.z) + tileSize / 2;
  return (
    intersectPoint[0] >= minX - epsilon &&
    intersectPoint[0] <= maxX + epsilon &&
    intersectPoint[2] >= minZ - epsilon &&
    intersectPoint[2] <= maxZ + epsilon
  );
}

function drawFunnyLine() {
  
}