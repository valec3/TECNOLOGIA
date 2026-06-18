// Helper functions for geometric calculations in the map editor

export function calcBloques(coords, maxVal) {
  const sorted = [...coords].sort((a, b) => a - b);
  const intervals = [];
  let prev = 0;
  sorted.forEach(v => {
    intervals.push([prev, v]);
    prev = v;
  });
  intervals.push([prev, maxVal]);

  const rangos = [];
  intervals.forEach(([A, B]) => {
    const start = A === 0 ? A + 40 : A + 70;
    const end = B === maxVal ? B - 40 : B - 70;
    if (start < end - 10) {
      rangos.push([start, end]);
    }
  });
  return rangos;
}

// Generate block objects (cuadras) from ranger config
export function generateBlocksFromRanges(rangoX, rangoY) {
  const blocks = [];
  (rangoX || []).forEach(([x_min, x_max], xIdx) => {
    (rangoY || []).forEach(([y_min, y_max], yIdx) => {
      blocks.push({
        id: `block-auto-${x_min}-${y_min}-${xIdx}-${yIdx}`,
        x: x_min,
        y: y_min,
        w: x_max - x_min,
        h: y_max - y_min
      });
    });
  });
  return blocks;
}

// Generate default block objects (cuadras) from street layout coords
export function generateDefaultBlocks(xCoords, yCoords, width = 800, height = 800) {
  const rx = calcBloques(xCoords, width);
  const ry = calcBloques(yCoords, height);
  const blocks = [];
  rx.forEach(([rx_min, rx_max], xIdx) => {
    ry.forEach(([ry_min, ry_max], yIdx) => {
      blocks.push({
        id: `block-def-${rx_min}-${ry_min}-${xIdx}-${yIdx}`,
        x: rx_min,
        y: ry_min,
        w: rx_max - rx_min,
        h: ry_max - ry_min
      });
    });
  });
  return blocks;
}

// Get the 4 corner houses for a given block (cuadra)
export function getCornerHousesForBlock(block, colorTheme = '#00f0ff') {
  const { x, y, w, h } = block;
  // Make sure block size is at least 50x50 to draw houses
  if (w < 50 || h < 50) return [];
  return [
    { x, y }, // TOP LEFT
    { x: x + w - 50, y }, // TOP RIGHT
    { x, y: y + h - 50 }, // BOTTOM LEFT
    { x: x + w - 50, y: y + h - 50 } // BOTTOM RIGHT
  ];
}

// Calculate intersection coordinates dynamically from streets
export function generateIntersections(xCoords, yCoords, nombresAvenidas = {}) {
  const intersecciones = [];
  yCoords.forEach((y, yIdx) => {
    xCoords.forEach((x, xIdx) => {
      const hName = nombresAvenidas[`H${yIdx + 1}`] || `H${yIdx + 1}`;
      const vName = nombresAvenidas[`V${xIdx + 1}`] || `V${xIdx + 1}`;
      const shortName = `CRUCE\n(${hName.substring(0, 6)} & ${vName.substring(0, 6)})`;
      intersecciones.push({
        pos: [x, y],
        nombre: shortName
      });
    });
  });
  return intersecciones;
}
