import React from 'react';
import { Plus, MapPin, Loader2 } from 'lucide-react';

export default function Sidebar({
  maps,
  activeMap,
  onSelectMap,
  onCreateNewMap,
  isLoading
}) {
  return (
    <aside className="w-72 bg-[#12121a] border-r border-[#252535] flex flex-col h-full text-slate-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 p-6 border-b border-[#252535]">
        <MapPin className="w-6 h-6 text-[#00f0ff] filter drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
        <h2 className="text-xl font-extrabold tracking-wider">
          METRO <span className="text-[#00f0ff]">MAPS</span>
        </h2>
      </div>

      {/* Title + Action */}
      <div className="flex justify-between items-center px-6 pt-6 pb-3 text-xs uppercase tracking-widest text-slate-500 font-semibold">
        <span>Mis Mapas</span>
        <button
          onClick={onCreateNewMap}
          className="text-[#00f0ff] hover:text-[#00e878] transition-all duration-200 hover:scale-115 hover:rotate-90 cursor-pointer"
          title="Crear Nuevo Mapa"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Map List */}
      <ul className="flex-grow overflow-y-auto px-4 py-2 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-[#00f0ff]" />
            <span>Cargando mapas...</span>
          </div>
        ) : maps.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay mapas creados.
          </div>
        ) : (
          maps.map((map) => {
            const isActive = activeMap && activeMap.clave === map.clave;
            return (
              <li
                key={map.clave}
                onClick={() => onSelectMap(map)}
                className={`flex justify-between items-center p-3 px-4 rounded-lg bg-white/2 border cursor-pointer transition-all duration-250 ${
                  isActive
                    ? 'border-[#00f0ff] bg-[#00f0ff]/5 shadow-[0_0_12px_rgba(0,240,255,0.15)] text-[#00f0ff]'
                    : 'border-transparent hover:bg-[#1b1b26] hover:border-white/10'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-sm font-semibold tracking-wide truncate">
                    {map.nombre}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                    clave: {map.clave}
                  </span>
                </div>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: map.color_tema,
                    boxShadow: `0 0 8px ${map.color_tema}`
                  }}
                />
              </li>
            );
          })
        )}
      </ul>

      {/* Sidebar Footer */}
      <div className="p-6 border-t border-[#252535] text-xs text-slate-500 flex flex-col gap-0.5">
        <p className="font-semibold text-slate-400">Tecnologías Emergentes</p>
        <span>
          FastAPI + React 19 + Tailwind v4
        </span>
      </div>
    </aside>
  );
}
