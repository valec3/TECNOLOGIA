import React, { useState, useEffect } from 'react';
import { MousePointer, Sliders, Trash2, Code, ShieldAlert, RotateCw } from 'lucide-react';

export default function PropertiesPanel({
  mapData,
  mode, // 'create' | 'edit'
  activeTool,
  onChangeTool,
  selectedElement, // { type: 'street-h' | 'street-v' | 'block' | 'curve', index: number }
  onDeleteElement,
  onUpdateElementProperty, // Callback to update a single property
  onUpdateGlobalProperty, // Callback to update top-level map fields
  onSave,
  onCancel,
  isSaving
}) {
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);

  const config = mapData.config || {};
  const avHList = config.avenidas_horizontales || [];
  const avVList = config.avenidas_verticales || [];
  const blocksList = config.casas_config?.cuadras || [];
  const curvesList = config.curvas || [];
  const nombresAvenidas = config.nombres_avenidas || {};

  const handleColorChange = (e) => {
    onUpdateGlobalProperty('color_tema', e.target.value);
  };

  useEffect(() => {
    if (showJson) {
      setJsonText(JSON.stringify(mapData.config, null, 2));
    }
  }, [mapData.config, showJson]);

  const handleJsonChange = (e) => {
    const text = e.target.value;
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setJsonError(null);
      onUpdateGlobalProperty('config', parsed);
    } catch (err) {
      setJsonError(err.message);
    }
  };

  const getSelectedElementData = () => {
    if (!selectedElement) return null;
    const { type, index } = selectedElement;
    if (type === 'street-h') {
      return {
        typeLabel: 'Avenida Horizontal',
        name: nombresAvenidas[`H${index + 1}`] || `H${index + 1}`,
        coordLabel: 'Coordenada Y',
        coordValue: avHList[index]?.y || 0,
        index
      };
    } else if (type === 'street-v') {
      return {
        typeLabel: 'Avenida Vertical',
        name: nombresAvenidas[`V${index + 1}`] || `V${index + 1}`,
        coordLabel: 'Coordenada X',
        coordValue: avVList[index]?.x || 0,
        index
      };
    } else if (type === 'block') {
      const b = blocksList[index] || {};
      return {
        typeLabel: 'Cuadra / Bloque',
        x: b.x || 0,
        y: b.y || 0,
        w: b.w || 130,
        h: b.h || 130,
        index
      };
    } else if (type === 'curve') {
      const c = curvesList[index] || {};
      return {
        typeLabel: 'Curva Vial',
        name: c.nombres_calles || 'Curva',
        cx: c.cx || 0,
        cy: c.cy || 0,
        R: c.R || 150,
        ang_ini: c.ang_ini || 0,
        ang_fin: c.ang_fin || 90,
        index
      };
    }
    return null;
  };

  const elemData = getSelectedElementData();

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (jsonError) {
      alert('Corregí los errores del JSON antes de guardar.');
      return;
    }
    onSave();
  };

  return (
    <div className="w-[480px] bg-[#12121a] border-l border-[#252535] overflow-y-auto flex flex-col h-full text-slate-200">
      <form onSubmit={handleSaveSubmit} className="p-6 flex flex-col gap-6 flex-grow">
        {/* Section header */}
        <div className="flex items-center gap-2 pb-3 border-b border-[#252535]">
          <Sliders className="w-5 h-5 text-[#00f0ff]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Parámetros de Mapa
          </h3>
        </div>

        {/* Global properties */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Clave Única (ID)
            </label>
            <input
              type="text"
              required
              disabled={mode === 'edit'}
              value={mapData.clave || ''}
              onChange={(e) => onUpdateGlobalProperty('clave', e.target.value.toLowerCase().trim())}
              placeholder="ej: centro"
              className="bg-white/2 border border-[#252535] rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Nombre del Mapa
            </label>
            <input
              type="text"
              required
              value={mapData.nombre || ''}
              onChange={(e) => onUpdateGlobalProperty('nombre', e.target.value.toUpperCase())}
              placeholder="ej: MAPA NORTE"
              className="bg-white/2 border border-[#252535] rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#00f0ff]"
            />
          </div>
        </div>

        {/* Theme color & Resolution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Color del Tema (Neon)
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={mapData.color_tema || '#00f0ff'}
                onChange={handleColorChange}
                className="w-10 h-10 border border-[#252535] rounded-lg cursor-pointer bg-transparent p-0"
              />
              <input
                type="text"
                maxLength="7"
                value={mapData.color_tema?.toUpperCase() || ''}
                onChange={(e) => onUpdateGlobalProperty('color_tema', e.target.value)}
                placeholder="#00F0FF"
                className="bg-white/2 border border-[#252535] rounded-lg p-2 flex-grow font-mono text-sm text-slate-200 focus:outline-none focus:border-[#00f0ff]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Tamaño Cuadrado (px)
            </label>
            <input
              type="number"
              min="400"
              max="1200"
              step="100"
              value={mapData.width || 800}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 800;
                onUpdateGlobalProperty('width', val);
                onUpdateGlobalProperty('height', val);
              }}
              className="bg-white/2 border border-[#252535] rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#00f0ff]"
            />
          </div>
        </div>

        {/* Visual Editing Tool selectors */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Herramienta de Edición Visual
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'select', label: 'Seleccionar', icon: MousePointer },
              { id: 'street-h', label: '+ Calle Y', icon: Sliders, classRotate: 'rotate-90' },
              { id: 'street-v', label: '+ Calle X', icon: Sliders }
            ].map((tool) => {
              const ToolIcon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  type="button"
                  key={tool.id}
                  onClick={() => onChangeTool(tool.id)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'border-[#00f0ff] bg-[#00f0ff]/5 text-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                      : 'border-[#252535] bg-white/2 hover:bg-[#1b1b26] hover:border-white/10 text-slate-300'
                  }`}
                >
                  <ToolIcon className={`w-3.5 h-3.5 ${tool.classRotate || ''}`} />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'block', label: '+ Cuadra (Bloque)' },
              { id: 'curve', label: '+ Curva Especial' }
            ].map((tool) => {
              const isActive = activeTool === tool.id;
              return (
                <button
                  type="button"
                  key={tool.id}
                  onClick={() => onChangeTool(tool.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'border-[#00f0ff] bg-[#00f0ff]/5 text-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                      : 'border-[#252535] bg-white/2 hover:bg-[#1b1b26] hover:border-white/10 text-slate-300'
                  }`}
                >
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-slate-500 leading-normal mt-1">
            {activeTool === 'select' && 'Hacé click para seleccionar y arrastrar calles, cuadras o curvas.'}
            {activeTool === 'street-h' && 'Hacé click sobre el lienzo para colocar una calle horizontal.'}
            {activeTool === 'street-v' && 'Hacé click sobre el lienzo para colocar una calle vertical.'}
            {activeTool === 'block' && 'Hacé click sobre el lienzo para colocar una cuadra de 130x130.'}
            {activeTool === 'curve' && 'Hacé click para colocar una curva vial de 90°.'}
          </span>
        </div>

        {/* Selected element properties */}
        <div className="flex-grow">
          {elemData ? (
            <div className="bg-white/2 border border-[#252535] rounded-xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#252535]/50">
                <span className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider">
                  Propiedades: {elemData.typeLabel}
                </span>
                <button
                  type="button"
                  onClick={onDeleteElement}
                  className="text-[#ff3355] hover:text-red-400 transition-all p-1.5 hover:bg-[#ff3355]/10 rounded-lg cursor-pointer"
                  title="Eliminar Elemento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {(selectedElement.type === 'street-h' || selectedElement.type === 'street-v') && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500">Nombre de Avenida</label>
                    <input
                      type="text"
                      value={elemData.name}
                      onChange={(e) => onUpdateElementProperty(selectedElement.type, selectedElement.index, 'name', e.target.value)}
                      className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500">{elemData.coordLabel}</label>
                    <input
                      type="number"
                      step="10"
                      value={elemData.coordValue}
                      onChange={(e) => onUpdateElementProperty(selectedElement.type, selectedElement.index, 'coord', parseInt(e.target.value) || 0)}
                      className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedElement.type === 'block' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Posición X</label>
                      <input
                        type="number"
                        step="10"
                        value={elemData.x}
                        onChange={(e) => onUpdateElementProperty('block', selectedElement.index, 'x', parseInt(e.target.value) || 0)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Posición Y</label>
                      <input
                        type="number"
                        step="10"
                        value={elemData.y}
                        onChange={(e) => onUpdateElementProperty('block', selectedElement.index, 'y', parseInt(e.target.value) || 0)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Ancho (w)</label>
                      <input
                        type="number"
                        step="10"
                        min="50"
                        value={elemData.w}
                        onChange={(e) => onUpdateElementProperty('block', selectedElement.index, 'w', parseInt(e.target.value) || 50)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Alto (h)</label>
                      <input
                        type="number"
                        step="10"
                        min="50"
                        value={elemData.h}
                        onChange={(e) => onUpdateElementProperty('block', selectedElement.index, 'h', parseInt(e.target.value) || 50)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedElement.type === 'curve' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500">Nombre de la Vía</label>
                    <input
                      type="text"
                      value={elemData.name}
                      onChange={(e) => onUpdateElementProperty('curve', selectedElement.index, 'name', e.target.value)}
                      className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Centro X (cx)</label>
                      <input
                        type="number"
                        step="10"
                        value={elemData.cx}
                        onChange={(e) => onUpdateElementProperty('curve', selectedElement.index, 'cx', parseInt(e.target.value) || 0)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Centro Y (cy)</label>
                      <input
                        type="number"
                        step="10"
                        value={elemData.cy}
                        onChange={(e) => onUpdateElementProperty('curve', selectedElement.index, 'cy', parseInt(e.target.value) || 0)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Radio (R)</label>
                      <input
                        type="number"
                        step="10"
                        value={elemData.R}
                        onChange={(e) => onUpdateElementProperty('curve', selectedElement.index, 'R', parseInt(e.target.value) || 0)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Áng. Ini</label>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={elemData.ang_ini}
                        onChange={(e) => onUpdateElementProperty('curve', selectedElement.index, 'ang_ini', parseInt(e.target.value) || 0)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Áng. Fin</label>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={elemData.ang_fin}
                        onChange={(e) => onUpdateElementProperty('curve', selectedElement.index, 'ang_fin', parseInt(e.target.value) || 0)}
                        className="bg-black/20 border border-[#252535] rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const diff = elemData.ang_fin - elemData.ang_ini;
                      const new_ang_ini = (elemData.ang_ini + 90) % 360;
                      const new_ang_fin = new_ang_ini + diff;
                      onUpdateElementProperty('curve', selectedElement.index, {
                        ang_ini: new_ang_ini,
                        ang_fin: new_ang_fin
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 border border-[#252535] rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer mt-2"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Rotar 90° (Sentido Horario)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border border-dashed border-[#252535] rounded-xl flex items-center justify-center p-8 text-center text-slate-500 text-xs leading-normal">
              Hacé click sobre cualquier avenida, cuadra o curva para seleccionarla y modificar sus propiedades de forma manual.
            </div>
          )}
        </div>

        {/* Advanced JSON Toggle */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="flex items-center gap-1.5 text-xs text-[#00f0ff] hover:underline cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Configuración Avanzada (JSON)</span>
          </button>

          {showJson && (
            <div className="flex flex-col gap-2">
              <textarea
                value={jsonText}
                onChange={handleJsonChange}
                rows="8"
                className="bg-black/30 border border-[#252535] rounded-lg p-2 font-mono text-[10px] text-slate-300 w-full focus:outline-none focus:border-[#00f0ff]"
                placeholder="Pegá tu configuración JSON aquí..."
              />
              {jsonError && (
                <div className="flex items-center gap-1.5 text-xs text-[#ff3355]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-mono text-[10px] break-all">{jsonError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Bottom Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#252535] mt-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-[#252535] rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !!jsonError}
            className="px-5 py-2.5 bg-[#00f0ff] hover:bg-[#00d2df] text-black rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:shadow-[0_0_16px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : mode === 'edit' ? 'Guardar Cambios' : 'Crear Mapa'}
          </button>
        </div>
      </form>
    </div>
  );
}
