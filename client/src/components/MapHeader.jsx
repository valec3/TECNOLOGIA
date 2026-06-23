import React from 'react';
import { Edit3, Trash2, ArrowLeft, BookOpen, Wifi, WifiOff } from 'lucide-react';

export default function MapHeader({
  activeMap,
  mode,
  onEdit,
  onDelete,
  onBack,
  isSaving,
  wsConnected
}) {
  const isViewMode = mode === 'view';

  if (!activeMap && isViewMode) {
    return (
      <header className="bg-[#12121a] border-b border-[#252535] h-[72px] px-8 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-500">Sin mapa seleccionado</h1>
      </header>
    );
  }

  const title = isViewMode
    ? activeMap.nombre
    : mode === 'create'
    ? 'Crear Nuevo Mapa'
    : 'Editar Mapa';

  const color = activeMap?.color_tema || '#00f0ff';

  return (
    <header className="bg-[#12121a] border-b border-[#252535] h-[72px] px-8 flex items-center justify-between shrink-0">
      {/* Title & Info */}
      <div className="flex items-center gap-4 min-w-0">
        <h1
          className="text-xl font-extrabold tracking-wide truncate transition-colors duration-300"
          style={{ color: isViewMode ? color : '#f0f2f5' }}
        >
          {title}
        </h1>
        {activeMap && (
          <span className="hidden sm:inline-block px-2 py-1 bg-white/5 border border-[#252535] rounded font-mono text-[10px] text-slate-400">
            Clave: {activeMap.clave}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Indicador de conexión WebSocket */}
        <div 
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
            wsConnected 
              ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}
          title={wsConnected ? 'Conectado en tiempo real' : 'Desconectado - reconectando...'}
        >
          {wsConnected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          )}
          <span>{wsConnected ? 'Live' : 'Offline'}</span>
        </div>
        {isViewMode ? (
          <>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#00f0ff]/5 hover:bg-[#00f0ff]/10 border border-[#00f0ff]/30 hover:border-[#00f0ff] rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer text-[#00f0ff]"
            >
              <BookOpen className="w-4 h-4" />
              <span>Docs API</span>
            </a>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[#252535] hover:border-white/20 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#00f0ff]" />
              <span>Editar Mapa</span>
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 bg-[#ff3355]/10 hover:bg-[#ff3355] border border-[#ff3355]/25 hover:border-transparent rounded-lg text-sm font-semibold text-[#ff3355] hover:text-white transition-all duration-200 shadow-[0_0_10px_rgba(255,51,85,0.05)] hover:shadow-[0_0_15px_rgba(255,51,85,0.3)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </>
        ) : (
          <button
            onClick={onBack}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[#252535] hover:border-white/20 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Mapas</span>
          </button>
        )}
      </div>
    </header>
  );
}
