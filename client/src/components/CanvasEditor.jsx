import React, { useRef, useState, useEffect } from 'react';
import {
  generateIntersections,
  getCornerHousesForBlock,
  generateBlocksFromRanges,
  generateDefaultBlocks
} from '../geometryHelper';

export default function CanvasEditor({
  mapData,
  activeTool, // 'select' | 'street-h' | 'street-v' | 'block' | 'curve'
  selectedElement, // { type: 'street-h' | 'street-v' | 'block' | 'curve', index: number } or null
  onSelectElement,
  onUpdateGeometry, // Callback to update streets/blocks/curves lists
  tempMapName,
  tempColorTheme
}) {
  const svgRef = useRef(null);
  const [hoverCoord, setHoverCoord] = useState(null); // { x, y } in snapped coords
  const [dragState, setDragState] = useState(null); // { type, index, startX, startY, startVal }

  const width = mapData.width || 800;
  const height = mapData.height || 800;
  const colorTheme = tempColorTheme || mapData.color_tema || '#00f0ff';

  const config = mapData.config || {};
  const avHList = config.avenidas_horizontales || [];
  const avVList = config.avenidas_verticales || [];
  const curvesList = config.curvas || [];
  const nombresAvenidas = config.nombres_avenidas || {};

  // DYNAMIC FALLBACK:
  // If 'cuadras' is empty (old map format), generate it dynamically for rendering
  let blocksList = config.casas_config?.cuadras || [];
  if (blocksList.length === 0) {
    const rx = config.casas_config?.rango_x || [];
    const ry = config.casas_config?.rango_y || [];
    if (rx.length > 0 && ry.length > 0) {
      blocksList = generateBlocksFromRanges(rx, ry);
    } else {
      const xCoords = avVList.map(v => v.x);
      const yCoords = avHList.map(h => h.y);
      blocksList = generateDefaultBlocks(xCoords, yCoords, width, height);
    }
  }

  // Helper to convert screen mouse coordinates to SVG user units
  const getSVGCoords = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    return {
      x: Math.round(x),
      y: Math.round(y)
    };
  };

  const snapToGrid = (val) => {
    return Math.round(val / 10) * 10;
  };

  // Mouse move handler for canvas (hover guides and dragging)
  const handleMouseMove = (e) => {
    const coords = getSVGCoords(e);
    const snapped = {
      x: snapToGrid(coords.x),
      y: snapToGrid(coords.y)
    };

    if (snapped.x < 0) snapped.x = 0;
    if (snapped.x > width) snapped.x = width;
    if (snapped.y < 0) snapped.y = 0;
    if (snapped.y > height) snapped.y = height;

    setHoverCoord(snapped);

    // Handle active drag
    if (dragState) {
      const deltaX = coords.x - dragState.startX;
      const deltaY = coords.y - dragState.startY;

      if (dragState.type === 'street-h') {
        const newY = snapToGrid(dragState.startVal + deltaY);
        const clampedY = Math.max(40, Math.min(height - 40, newY));
        const newList = [...avHList];
        newList[dragState.index] = { ...newList[dragState.index], y: clampedY };
        onUpdateGeometry({ avenidas_horizontales: newList });
      } else if (dragState.type === 'street-v') {
        const newX = snapToGrid(dragState.startVal + deltaX);
        const clampedX = Math.max(40, Math.min(width - 40, newX));
        const newList = [...avVList];
        newList[dragState.index] = { ...newList[dragState.index], x: clampedX };
        onUpdateGeometry({ avenidas_verticales: newList });
      } else if (dragState.type === 'block') {
        const newX = snapToGrid(dragState.startXVal + deltaX);
        const newY = snapToGrid(dragState.startYVal + deltaY);
        const b = blocksList[dragState.index] || {};
        const clampedX = Math.max(0, Math.min(width - (b.w || 130), newX));
        const clampedY = Math.max(0, Math.min(height - (b.h || 130), newY));
        const newList = [...blocksList];
        newList[dragState.index] = { ...newList[dragState.index], x: clampedX, y: clampedY };
        onUpdateGeometry({ casas_config: { ...config.casas_config, cuadras: newList } });
      } else if (dragState.type === 'curve') {
        const newCx = snapToGrid(dragState.startCxVal + deltaX);
        const newCy = snapToGrid(dragState.startCyVal + deltaY);
        const clampedCx = Math.max(0, Math.min(width, newCx));
        const clampedCy = Math.max(0, Math.min(height, newCy));
        const newList = [...curvesList];
        newList[dragState.index] = { ...newList[dragState.index], cx: clampedCx, cy: clampedCy };
        onUpdateGeometry({ curvas: newList });
      }
    }
  };

  // Click on background canvas to add new elements or deselect
  const handleCanvasClick = (e) => {
    if (dragState) return;

    const coords = getSVGCoords(e);
    const snapped = {
      x: snapToGrid(coords.x),
      y: snapToGrid(coords.y)
    };

    if (activeTool === 'street-h') {
      if (snapped.y < 40 || snapped.y > height - 40) return;
      if (avHList.some(s => s.y === snapped.y)) return;

      const newList = [...avHList, { y: snapped.y, x_ini: 0, x_fin: width }];
      newList.sort((a, b) => a.y - b.y);
      onUpdateGeometry({ avenidas_horizontales: newList });
      onSelectElement({ type: 'street-h', index: newList.findIndex(s => s.y === snapped.y) });
    } else if (activeTool === 'street-v') {
      if (snapped.x < 40 || snapped.x > width - 40) return;
      if (avVList.some(s => s.x === snapped.x)) return;

      const newList = [...avVList, { x: snapped.x, y_ini: 0, y_fin: height }];
      newList.sort((a, b) => a.x - b.x);
      onUpdateGeometry({ avenidas_verticales: newList });
      onSelectElement({ type: 'street-v', index: newList.findIndex(s => s.x === snapped.x) });
    } else if (activeTool === 'block') {
      const defaultSize = 130;
      const bX = snapToGrid(snapped.x - defaultSize / 2);
      const bY = snapToGrid(snapped.y - defaultSize / 2);
      const clampedX = Math.max(0, Math.min(width - defaultSize, bX));
      const clampedY = Math.max(0, Math.min(height - defaultSize, bY));

      const newBlock = {
        id: `block-custom-${Date.now()}`,
        x: clampedX,
        y: clampedY,
        w: defaultSize,
        h: defaultSize
      };
      const newList = [...blocksList, newBlock];
      onUpdateGeometry({ casas_config: { ...config.casas_config, cuadras: newList } });
      onSelectElement({ type: 'block', index: newList.length - 1 });
    } else if (activeTool === 'curve') {
      const newCurve = {
        cx: snapped.x,
        cy: snapped.y,
        R: 150,
        ang_ini: 0,
        ang_fin: 90,
        nombres_calles: 'Nueva Curva'
      };
      const newList = [...curvesList, newCurve];
      onUpdateGeometry({ curvas: newList });
      onSelectElement({ type: 'curve', index: newList.length - 1 });
    } else if (activeTool === 'select') {
      if (e.target.tagName === 'svg' || e.target.id === 'canvas-bg-rect' || e.target.id === 'canvas-grid-lines') {
        onSelectElement(null);
      }
    }
  };

  // Element mouse down (trigger drag setup)
  const handleElementMouseDown = (e, type, index, initialVal) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    const coords = getSVGCoords(e);

    if (type === 'street-h') {
      setDragState({
        type,
        index,
        startX: coords.x,
        startY: coords.y,
        startVal: initialVal.y
      });
    } else if (type === 'street-v') {
      setDragState({
        type,
        index,
        startX: coords.x,
        startY: coords.y,
        startVal: initialVal.x
      });
    } else if (type === 'block') {
      setDragState({
        type,
        index,
        startX: coords.x,
        startY: coords.y,
        startXVal: initialVal.x,
        startYVal: initialVal.y
      });
    } else if (type === 'curve') {
      setDragState({
        type,
        index,
        startX: coords.x,
        startY: coords.y,
        startCxVal: initialVal.cx,
        startCyVal: initialVal.cy
      });
    }
    onSelectElement({ type, index });
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragState(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Calculate dynamic intersections based on streets
  const intersections = generateIntersections(
    avVList.map(v => v.x),
    avHList.map(h => h.y),
    nombresAvenidas
  );

  // Helper: Genera la ruta SVG de la curva
  const getCurvePath = (c) => {
    const cx = c.cx;
    const cy = c.cy;
    const R = c.R;
    const angIniRad = (c.ang_ini * Math.PI) / 180;
    const angFinRad = (c.ang_fin * Math.PI) / 180;

    const startX = cx + R * Math.cos(angIniRad);
    const startY = cy + R * Math.sin(angIniRad);
    const endX = cx + R * Math.cos(angFinRad);
    const endY = cy + R * Math.sin(angFinRad);

    const largeArcFlag = Math.abs(c.ang_fin - c.ang_ini) <= 180 ? 0 : 1;
    const sweepFlag = c.ang_fin > c.ang_ini ? 1 : 0;

    return `M ${startX} ${startY} A ${R} ${R} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
  };

  // Tool cursor styles
  const getCursorClass = () => {
    if (activeTool === 'street-h') return 'cursor-ns-resize';
    if (activeTool === 'street-v') return 'cursor-ew-resize';
    if (activeTool === 'block' || activeTool === 'curve') return 'cursor-crosshair';
    return 'cursor-default';
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full h-full select-none">
      {/* Title Badge */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-3 text-slate-400 text-xs px-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: colorTheme, boxShadow: `0 0 8px ${colorTheme}` }} />
          Lienzo de Diseño Catastral
        </span>
        <span className="font-mono text-slate-500 bg-white/3 border border-[#252535] px-2 py-0.5 rounded">
          Resolución: {width} x {height} px
        </span>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative border border-[#252535] rounded-xl overflow-hidden bg-[#0d0d0f] shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className={`bg-[#121214] select-none ${getCursorClass()}`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleCanvasClick}
          onMouseUp={handleMouseUp}
          style={{ width: '100%', height: '100%', maxWidth: `${width}px`, maxHeight: `${height}px`, aspectRatio: `${width}/${height}` }}
        >
          {/* SVG Definitions for Glows & Filters */}
          <defs>
            <filter id="neon-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <pattern id="grid-pattern" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1c1c28" strokeWidth="1" />
              <circle cx="0" cy="0" r="1.5" fill="#25253d" opacity="0.5" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect id="canvas-bg-rect" width={width} height={height} fill="#111115" />
          <rect id="canvas-grid-lines" width={width} height={height} fill="url(#grid-pattern)" />

          {/* 1. STREETS (ASPHALT LAYER) */}
          {avHList.map((av, index) => {
            const isSelected = selectedElement && selectedElement.type === 'street-h' && selectedElement.index === index;
            return (
              <g key={`avh-group-${index}`}>
                <line
                  x1={av.x_ini !== undefined ? av.x_ini : 0}
                  y1={av.y}
                  x2={av.x_fin !== undefined ? av.x_fin : width}
                  y2={av.y}
                  stroke={isSelected ? '#2d2d3a' : '#1e1e24'}
                  strokeWidth="80"
                  className="transition-colors duration-200 cursor-ns-resize hover:stroke-[#252530]"
                  onMouseDown={(e) => handleElementMouseDown(e, 'street-h', index, av)}
                />
                <line
                  x1={av.x_ini !== undefined ? av.x_ini : 0}
                  y1={av.y}
                  x2={av.x_fin !== undefined ? av.x_fin : width}
                  y2={av.y}
                  stroke="#ffcc00"
                  strokeWidth="2"
                  strokeDasharray="12,8"
                  className="pointer-events-none"
                />
                <g className="opacity-20 pointer-events-none fill-slate-400 text-[10px] font-bold text-center">
                  <text x={(av.x_ini || 0) + 120} y={av.y - 18} textAnchor="middle">←</text>
                  <text x={(av.x_ini || 0) + 120} y={av.y + 26} textAnchor="middle">→</text>
                  <text x={(av.x_ini || 0) + 400} y={av.y - 18} textAnchor="middle">←</text>
                  <text x={(av.x_ini || 0) + 400} y={av.y + 26} textAnchor="middle">→</text>
                </g>
              </g>
            );
          })}

          {avVList.map((av, index) => {
            const isSelected = selectedElement && selectedElement.type === 'street-v' && selectedElement.index === index;
            return (
              <g key={`avv-group-${index}`}>
                <line
                  x1={av.x}
                  y1={av.y_ini !== undefined ? av.y_ini : 0}
                  x2={av.x}
                  y2={av.y_fin !== undefined ? av.y_fin : height}
                  stroke={isSelected ? '#2d2d3a' : '#1e1e24'}
                  strokeWidth="80"
                  className="transition-colors duration-200 cursor-ew-resize hover:stroke-[#252530]"
                  onMouseDown={(e) => handleElementMouseDown(e, 'street-v', index, av)}
                />
                <line
                  x1={av.x}
                  y1={av.y_ini !== undefined ? av.y_ini : 0}
                  x2={av.x}
                  y2={av.y_fin !== undefined ? av.y_fin : height}
                  stroke="#ffcc00"
                  strokeWidth="2"
                  strokeDasharray="12,8"
                  className="pointer-events-none"
                />
                <g className="opacity-20 pointer-events-none fill-slate-400 text-[10px] font-bold">
                  <text x={av.x - 20} y={(av.y_ini || 0) + 120} textAnchor="middle">↑</text>
                  <text x={av.x + 20} y={(av.y_ini || 0) + 120} textAnchor="middle">↓</text>
                  <text x={av.x - 20} y={(av.y_ini || 0) + 400} textAnchor="middle">↑</text>
                  <text x={av.x + 20} y={(av.y_ini || 0) + 400} textAnchor="middle">↓</text>
                </g>
              </g>
            );
          })}

          {/* Curves Asphalt */}
          {curvesList.map((c, index) => {
            const isSelected = selectedElement && selectedElement.type === 'curve' && selectedElement.index === index;
            const pathData = getCurvePath(c);
            return (
              <g key={`curve-group-${index}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#2d2d3a' : '#1e1e24'}
                  strokeWidth="80"
                  className="transition-colors duration-200 cursor-move hover:stroke-[#252530]"
                  onMouseDown={(e) => handleElementMouseDown(e, 'curve', index, c)}
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke="#ffcc00"
                  strokeWidth="2"
                  strokeDasharray="12,8"
                  className="pointer-events-none"
                />
                <path
                  d={getCurvePath({ ...c, R: c.R - 40 })}
                  fill="none"
                  stroke="#333"
                  strokeWidth="1.5"
                  className="pointer-events-none"
                />
                <path
                  d={getCurvePath({ ...c, R: c.R + 40 })}
                  fill="none"
                  stroke="#333"
                  strokeWidth="1.5"
                  className="pointer-events-none"
                />
                {isSelected && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={colorTheme}
                    strokeWidth="82"
                    strokeOpacity="0.25"
                    className="pointer-events-none"
                    filter="url(#neon-glow-filter)"
                  />
                )}
              </g>
            );
          })}

          {/* 2. BLOCKS / CUADRAS & CORNER HOUSES */}
          {blocksList.map((b, index) => {
            const isSelected = selectedElement && selectedElement.type === 'block' && selectedElement.index === index;
            const corners = getCornerHousesForBlock(b);
            return (
              <g key={`block-group-${index}`}>
                {/* Draw Block boundary */}
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w || 130}
                  height={b.h || 130}
                  fill="#141419"
                  stroke={isSelected ? colorTheme : '#262638'}
                  strokeWidth={isSelected ? '2' : '1.5'}
                  rx="6"
                  ry="6"
                  className="transition-all duration-200 cursor-move hover:fill-[#191924] hover:stroke-slate-500"
                  onMouseDown={(e) => handleElementMouseDown(e, 'block', index, b)}
                  filter={isSelected ? 'url(#neon-glow-filter)' : undefined}
                />
                
                {/* Draw Corner Houses */}
                {corners.map((house, hIdx) => (
                  <g key={`house-${index}-${hIdx}`} className="pointer-events-none">
                    <rect
                      x={house.x}
                      y={house.y}
                      width="50"
                      height="50"
                      fill="#1a1a24"
                      stroke="#2e2e3f"
                      strokeWidth="1"
                    />
                    <rect
                      x={house.x + 4}
                      y={house.y + 4}
                      width="42"
                      height="42"
                      fill="none"
                      stroke={colorTheme}
                      strokeWidth="1"
                      strokeDasharray="2,4"
                      opacity="0.65"
                    />
                  </g>
                ))}

                {/* Inner block label */}
                {(b.w || 130) > 60 && (b.h || 130) > 40 && (
                  <text
                    x={b.x + (b.w || 130) / 2}
                    y={b.y + (b.h || 130) / 2 + 3}
                    fill="#4a4f66"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none font-mono"
                  >
                    CUADRA {index + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* 3. INTERSECTIONS (AUTO DRAW) */}
          {intersections.map((node, index) => {
            const [ix, iy] = node.pos;
            return (
              <g key={`intersect-group-${index}`} className="pointer-events-none">
                <rect
                  x={ix - 40}
                  y={iy - 40}
                  width="80"
                  height="80"
                  fill="#25252d"
                />
                <g opacity="0.12">
                  <rect x={ix - 40} y={iy - 36} width="80" height="5" fill="#f0f2f5" />
                  <rect x={ix - 40} y={iy - 27} width="80" height="5" fill="#f0f2f5" />
                  <rect x={ix - 40} y={iy - 18} width="80" height="5" fill="#f0f2f5" />
                  <rect x={ix - 40} y={iy - 9} width="80" height="5" fill="#f0f2f5" />
                  <rect x={ix - 40} y={iy} width="80" height="5" fill="#f0f2f5" />
                  <rect x={ix - 40} y={iy + 9} width="80" height="5" fill="#f0f2f5" />
                  <rect x={ix - 40} y={iy + 18} width="80" height="5" fill="#f0f2f5" />
                  <rect x={ix - 40} y={iy + 27} width="80" height="5" fill="#f0f2f5" />
                </g>
                <rect
                  x={ix - 40}
                  y={iy - 40}
                  width="80"
                  height="80"
                  fill="none"
                  stroke={colorTheme}
                  strokeWidth="1"
                  strokeDasharray="2,4"
                  opacity="0.8"
                />
                <text
                  x={ix}
                  y={iy - 4}
                  fill={colorTheme}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="Courier New"
                  textAnchor="middle"
                >
                  {node.nombre.split('\n')[0]}
                </text>
                <text
                  x={ix}
                  y={iy + 6}
                  fill={colorTheme}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="Courier New"
                  textAnchor="middle"
                >
                  {node.nombre.split('\n')[1] || ''}
                </text>
              </g>
            );
          })}

          {/* 4. STREET SELECTION GLOW LINES */}
          {selectedElement && selectedElement.type === 'street-h' && avHList[selectedElement.index] && (
            <line
              x1={avHList[selectedElement.index].x_ini || 0}
              y1={avHList[selectedElement.index].y}
              x2={avHList[selectedElement.index].x_fin || width}
              y2={avHList[selectedElement.index].y}
              stroke={colorTheme}
              strokeWidth="82"
              strokeOpacity="0.25"
              className="pointer-events-none"
              filter="url(#neon-glow-filter)"
            />
          )}
          {selectedElement && selectedElement.type === 'street-v' && avVList[selectedElement.index] && (
            <line
              x1={avVList[selectedElement.index].x}
              y1={avVList[selectedElement.index].y_ini || 0}
              x2={avVList[selectedElement.index].x}
              y2={avVList[selectedElement.index].y_fin || height}
              stroke={colorTheme}
              strokeWidth="82"
              strokeOpacity="0.25"
              className="pointer-events-none"
              filter="url(#neon-glow-filter)"
            />
          )}

          {/* 5. STREET NAMES (SIDE TEXT) */}
          {avHList.map((av, i) => {
            const name = nombresAvenidas[`H${i + 1}`] || `AVENIDA H${i + 1}`;
            return (
              <g key={`avh-name-${i}`} className="pointer-events-none opacity-40 fill-slate-400 font-mono text-[9px] font-bold">
                <text x={(av.x_ini || 0) + 110} y={av.y - 48} textAnchor="left">{name}</text>
                <text x={(av.x_fin || width) - 110} y={av.y - 48} textAnchor="end">{name}</text>
              </g>
            );
          })}
          {avVList.map((av, i) => {
            const name = nombresAvenidas[`V${i + 1}`] || `AVENIDA V${i + 1}`;
            const isEven = i % 2 === 0;
            return (
              <g key={`avv-name-${i}`} className="pointer-events-none opacity-40 fill-slate-400 font-mono text-[9px] font-bold">
                <text
                  x={av.x + (isEven ? -75 : 75)}
                  y={(av.y_ini || 0) + 45}
                  textAnchor={isEven ? 'end' : 'start'}
                >
                  {name}
                </text>
                <text
                  x={av.x + (isEven ? -75 : 75)}
                  y={(av.y_fin || height) - 45}
                  textAnchor={isEven ? 'end' : 'start'}
                >
                  {name}
                </text>
              </g>
            );
          })}

          {/* 6. GRID BORDER COORDINATE LABELS */}
          {Array.from({ length: Math.floor(width / 100) - 1 }).map((_, idx) => {
            const x = (idx + 1) * 100;
            return (
              <g key={`coord-x-${x}`} className="pointer-events-none">
                <text x={x} y="15" fill={colorTheme} fontSize="7" fontFamily="Courier New" textAnchor="middle" opacity="0.6">
                  {x}m
                </text>
                <line x1={x} y1="0" x2={x} y2="5" stroke={colorTheme} strokeWidth="1" opacity="0.6" />
              </g>
            );
          })}
          {Array.from({ length: Math.floor(height / 100) - 1 }).map((_, idx) => {
            const y = (idx + 1) * 100;
            return (
              <g key={`coord-y-${y}`} className="pointer-events-none">
                <text x="14" y={y + 2} fill={colorTheme} fontSize="7" fontFamily="Courier New" textAnchor="start" opacity="0.6">
                  {y}m
                </text>
                <line x1="0" y1={y} x2="5" y2={y} stroke={colorTheme} strokeWidth="1" opacity="0.6" />
              </g>
            );
          })}

          {/* 7. HOVER GUIDES & TOOL HELPERS */}
          {activeTool !== 'select' && hoverCoord && (
            <g className="pointer-events-none">
              {activeTool === 'street-h' && (
                <>
                  <line
                    x1="0"
                    y1={hoverCoord.y}
                    x2={width}
                    y2={hoverCoord.y}
                    stroke={colorTheme}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity="0.8"
                  />
                  <rect
                    x="0"
                    y={hoverCoord.y - 40}
                    width={width}
                    height="80"
                    fill={colorTheme}
                    fillOpacity="0.05"
                  />
                  <text
                    x={width - 15}
                    y={hoverCoord.y - 8}
                    fill={colorTheme}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    Y: {hoverCoord.y}m
                  </text>
                </>
              )}
              {activeTool === 'street-v' && (
                <>
                  <line
                    x1={hoverCoord.x}
                    y1="0"
                    x2={hoverCoord.x}
                    y2={height}
                    stroke={colorTheme}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity="0.8"
                  />
                  <rect
                    x={hoverCoord.x - 40}
                    y="0"
                    width="80"
                    height={height}
                    fill={colorTheme}
                    fillOpacity="0.05"
                  />
                  <text
                    x={hoverCoord.x + 10}
                    y="25"
                    fill={colorTheme}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    X: {hoverCoord.x}m
                  </text>
                </>
              )}
              {activeTool === 'block' && (
                <>
                  <rect
                    x={hoverCoord.x - 65}
                    y={hoverCoord.y - 65}
                    width="130"
                    height="130"
                    fill="none"
                    stroke={colorTheme}
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                    opacity="0.75"
                  />
                  <text
                    x={hoverCoord.x + 75}
                    y={hoverCoord.y - 10}
                    fill={colorTheme}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    Cuadra (130x130)
                  </text>
                </>
              )}
              {activeTool === 'curve' && (
                <>
                  <circle cx={hoverCoord.x} cy={hoverCoord.y} r="150" fill="none" stroke={colorTheme} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5" />
                  <circle cx={hoverCoord.x} cy={hoverCoord.y} r="5" fill={colorTheme} opacity="0.8" />
                  <text
                    x={hoverCoord.x + 10}
                    y={hoverCoord.y - 10}
                    fill={colorTheme}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    Centro: ({hoverCoord.x}, {hoverCoord.y})
                  </text>
                </>
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
