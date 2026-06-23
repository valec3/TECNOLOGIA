import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MapHeader from './components/MapHeader';
import CanvasEditor from './components/CanvasEditor';
import PropertiesPanel from './components/PropertiesPanel';
import { generateDefaultBlocks, generateBlocksFromRanges, generateIntersections } from './geometryHelper';
import { fetchMaps, fetchMapDetails, createMap, updateMap, deleteMap } from './api';
import { connect, disconnect, subscribe, isConnected } from './api/ws';
import { Info, Map as MapIcon, Road, Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const [maps, setMaps] = useState([]);
  const [activeMap, setActiveMap] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'create'
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'street-h' | 'street-v' | 'block' | 'curve'
  const [selectedElement, setSelectedElement] = useState(null); // { type, index }
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Temporary editor state (clone of activeMap during edit/create)
  const [editorMap, setEditorMap] = useState(null);

  // Load all maps on startup
  const loadMaps = async (selectClave = null) => {
    setIsLoading(true);
    try {
      const data = await fetchMaps();
      setMaps(data);
      if (data.length > 0) {
        let targetMap = data[0];
        if (selectClave) {
          const matched = data.find(m => m.clave === selectClave);
          if (matched) targetMap = matched;
        }
        handleSelectMap(targetMap);
      } else {
        setActiveMap(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión: levantá la API de FastAPI.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaps();

    // Conectar WebSocket y suscribir a eventos
    connect();

    const unsubscribe = subscribe((message) => {
      console.log('[WS] Evento recibido:', message.event, message.data);
      
      if (message.event === 'mapa:created' || 
          message.event === 'mapa:updated' || 
          message.event === 'mapa:deleted') {
        // Recargar la lista de mapas cuando hay cambios
        // (no interferimos con el editor si está en modo create/edit)
        if (mode === 'view') {
          loadMaps();
        }
      }
    });

    // Verificar estado de conexión periódicamente
    const checkConnection = setInterval(() => {
      setWsConnected(isConnected());
    }, 1000);

    return () => {
      unsubscribe();
      disconnect();
      clearInterval(checkConnection);
    };
  }, []);

  // Set active map and fetch details if needed
  const handleSelectMap = async (map) => {
    setActiveMap(map);
    setMode('view');
    setSelectedElement(null);
  };

  // Trigger Create mode
  const handleCreateNewMap = () => {
    const defaultNewMap = {
      clave: '',
      nombre: '',
      color_tema: '#00f0ff',
      width: 800,
      height: 800,
      config: {
        avenidas_horizontales: [
          { y: 250, x_ini: 0, x_fin: 800 },
          { y: 550, x_ini: 0, x_fin: 800 }
        ],
        avenidas_verticales: [
          { x: 250, y_ini: 0, y_fin: 800 },
          { x: 550, y_ini: 0, y_fin: 800 }
        ],
        curvas: [],
        nombres_avenidas: {
          H1: 'AVENIDA H1',
          H2: 'AVENIDA H2',
          V1: 'AVENIDA V1',
          V2: 'AVENIDA V2'
        },
        intersecciones: [],
        casas_config: {
          cuadras: []
        },
        conexiones: {}
      }
    };

    // Calculate default blocks (cuadras) from initial roads
    const defaultBlocks = generateDefaultBlocks(
      [250, 550],
      [250, 550],
      800,
      800
    );
    defaultNewMap.config.casas_config.cuadras = defaultBlocks;

    setEditorMap(defaultNewMap);
    setMode('create');
    setActiveTool('select');
    setSelectedElement(null);
  };

  // Trigger Edit mode
  const handleEditActiveMap = () => {
    if (!activeMap) return;

    const clone = JSON.parse(JSON.stringify(activeMap));

    if (!clone.config) clone.config = {};
    if (!clone.config.casas_config) clone.config.casas_config = {};
    
    // BACKWARD COMPATIBILITY CONVERSION FOR BLOCKS:
    // If the map lacks 'cuadras' but has auto ranges (old style), 
    // convert those to custom blocks so they become individually editable/movable/deletable!
    let customBlocks = clone.config.casas_config.cuadras || [];
    const rx = clone.config.casas_config.rango_x || [];
    const ry = clone.config.casas_config.rango_y || [];

    if (customBlocks.length === 0) {
      if (rx.length > 0 && ry.length > 0) {
        customBlocks = generateBlocksFromRanges(rx, ry);
      } else {
        const xCoords = (clone.config.avenidas_verticales || []).map(v => v.x);
        const yCoords = (clone.config.avenidas_horizontales || []).map(h => h.y);
        customBlocks = generateDefaultBlocks(xCoords, yCoords, clone.width, clone.height);
      }
      clone.config.casas_config.cuadras = customBlocks;
    }

    // Clean up old houses config ranges to prevent pollution
    clone.config.casas_config.rango_x = [];
    clone.config.casas_config.rango_y = [];

    // Initialize list arrays if null
    if (!clone.config.avenidas_horizontales) clone.config.avenidas_horizontales = [];
    if (!clone.config.avenidas_verticales) clone.config.avenidas_verticales = [];
    if (!clone.config.curvas) clone.config.curvas = [];
    if (!clone.config.nombres_avenidas) clone.config.nombres_avenidas = {};
    if (!clone.config.conexiones) clone.config.conexiones = {};

    setEditorMap(clone);
    setMode('edit');
    setActiveTool('select');
    setSelectedElement(null);
  };

  // Delete active map from server
  const handleDeleteActiveMap = async () => {
    if (!activeMap) return;
    if (confirm(`¿Estás seguro que querés eliminar el mapa "${activeMap.nombre}"?`)) {
      try {
        await deleteMap(activeMap.clave);
        loadMaps();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Save changes (Create or Update)
  const handleSave = async () => {
    if (!editorMap) return;
    if (!editorMap.clave) {
      alert('La clave es requerida.');
      return;
    }
    if (!editorMap.nombre) {
      alert('El nombre es requerido.');
      return;
    }

    setIsSaving(true);

    const xCoords = (editorMap.config.avenidas_verticales || []).map(v => v.x);
    const yCoords = (editorMap.config.avenidas_horizontales || []).map(h => h.y);

    // Auto calculate intersections based on current street layout
    const calculatedIntersections = generateIntersections(
      xCoords,
      yCoords,
      editorMap.config.nombres_avenidas
    );

    // Construct final payload
    const finalMap = {
      ...editorMap,
      config: {
        ...editorMap.config,
        intersecciones: calculatedIntersections
      }
    };

    try {
      if (mode === 'create') {
        await createMap(finalMap);
        await loadMaps(finalMap.clave);
      } else {
        await updateMap(finalMap.clave, {
          nombre: finalMap.nombre,
          color_tema: finalMap.color_tema,
          width: finalMap.width,
          height: finalMap.height,
          config: finalMap.config
        });
        await loadMaps(finalMap.clave);
      }
      setMode('view');
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setMode('view');
    setEditorMap(null);
    setSelectedElement(null);
  };

  // Keyboard listener to delete elements via Delete or Backspace key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode === 'view') return;
      if (!selectedElement) return;

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelectedElement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement, editorMap, mode]);

  // Delete element logic
  const handleDeleteSelectedElement = () => {
    if (!selectedElement || !editorMap) return;
    const { type, index } = selectedElement;

    if (type === 'street-h') {
      const newList = [...(editorMap.config.avenidas_horizontales || [])];
      newList.splice(index, 1);
      
      const newNames = { ...editorMap.config.nombres_avenidas };
      delete newNames[`H${index + 1}`];
      for (let i = index + 1; i <= newList.length + 1; i++) {
        if (newNames[`H${i + 1}`]) {
          newNames[`H${i}`] = newNames[`H${i + 1}`];
          delete newNames[`H${i + 1}`];
        }
      }

      setEditorMap({
        ...editorMap,
        config: { ...editorMap.config, avenidas_horizontales: newList, nombres_avenidas: newNames }
      });
    } else if (type === 'street-v') {
      const newList = [...(editorMap.config.avenidas_verticales || [])];
      newList.splice(index, 1);

      const newNames = { ...editorMap.config.nombres_avenidas };
      delete newNames[`V${index + 1}`];
      for (let i = index + 1; i <= newList.length + 1; i++) {
        if (newNames[`V${i + 1}`]) {
          newNames[`V${i}`] = newNames[`V${i + 1}`];
          delete newNames[`V${i + 1}`];
        }
      }

      setEditorMap({
        ...editorMap,
        config: { ...editorMap.config, avenidas_verticales: newList, nombres_avenidas: newNames }
      });
    } else if (type === 'block') {
      const newList = [...(editorMap.config.casas_config?.cuadras || [])];
      newList.splice(index, 1);
      setEditorMap({
        ...editorMap,
        config: {
          ...editorMap.config,
          casas_config: { ...editorMap.config.casas_config, cuadras: newList }
        }
      });
    } else if (type === 'curve') {
      const newList = [...(editorMap.config.curvas || [])];
      newList.splice(index, 1);
      setEditorMap({
        ...editorMap,
        config: { ...editorMap.config, curvas: newList }
      });
    }

    setSelectedElement(null);
  };

  // Update properties of a single element
  const handleUpdateElementProperty = (type, index, field, value) => {
    setEditorMap(prev => {
      if (!prev) return prev;
      const config = prev.config || {};

      if (type === 'street-h') {
        const newList = [...(config.avenidas_horizontales || [])];
        if (field === 'name') {
          const newNames = { ...config.nombres_avenidas, [`H${index + 1}`]: value.toUpperCase() };
          return { ...prev, config: { ...config, nombres_avenidas: newNames } };
        } else if (field === 'coord') {
          newList[index] = { ...newList[index], y: value };
          return { ...prev, config: { ...config, avenidas_horizontales: newList } };
        } else if (typeof field === 'object') {
          newList[index] = { ...newList[index], ...field };
          return { ...prev, config: { ...config, avenidas_horizontales: newList } };
        }
      } else if (type === 'street-v') {
        const newList = [...(config.avenidas_verticales || [])];
        if (field === 'name') {
          const newNames = { ...config.nombres_avenidas, [`V${index + 1}`]: value.toUpperCase() };
          return { ...prev, config: { ...config, nombres_avenidas: newNames } };
        } else if (field === 'coord') {
          newList[index] = { ...newList[index], x: value };
          return { ...prev, config: { ...config, avenidas_verticales: newList } };
        } else if (typeof field === 'object') {
          newList[index] = { ...newList[index], ...field };
          return { ...prev, config: { ...config, avenidas_verticales: newList } };
        }
      } else if (type === 'block') {
        const newList = [...(config.casas_config?.cuadras || [])];
        if (typeof field === 'object') {
          newList[index] = { ...newList[index], ...field };
        } else {
          newList[index] = { ...newList[index], [field]: value };
        }
        return {
          ...prev,
          config: { ...config, casas_config: { ...config.casas_config, cuadras: newList } }
        };
      } else if (type === 'curve') {
        const newList = [...(config.curvas || [])];
        if (typeof field === 'object') {
          newList[index] = { ...newList[index], ...field };
        } else if (field === 'name') {
          newList[index] = { ...newList[index], nombres_calles: value };
        } else {
          newList[index] = { ...newList[index], [field]: value };
        }
        return { ...prev, config: { ...config, curvas: newList } };
      }
      return prev;
    });
  };

  // Update top-level map fields
  const handleUpdateGlobalProperty = (field, value) => {
    setEditorMap(prev => {
      if (!prev) return prev;
      if (field === 'config') {
        return { ...prev, config: value };
      } else {
        return { ...prev, [field]: value };
      }
    });
  };

  // Helper values for active map
  const activeConfig = activeMap?.config || {};
  const activeColor = activeMap?.color_tema || '#00f0ff';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f] text-slate-100 font-sans">
      {/* Sidebar */}
      {mode === 'view' && (
        <Sidebar
          maps={maps}
          activeMap={activeMap}
          onSelectMap={handleSelectMap}
          onCreateNewMap={handleCreateNewMap}
          isLoading={isLoading}
        />
      )}

      {/* Main Workspace Column */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        {/* Unified Top Header */}
        <MapHeader
          activeMap={mode === 'view' ? activeMap : editorMap}
          mode={mode}
          onEdit={handleEditActiveMap}
          onDelete={handleDeleteActiveMap}
          onBack={handleCancel}
          isSaving={isSaving}
          wsConnected={wsConnected}
        />

        {/* Content Body */}
        <div className="flex-grow flex overflow-hidden">
          {mode === 'view' ? (
            activeMap ? (
              <div className="flex-grow grid grid-cols-1 lg:grid-cols-[1fr_320px] h-full overflow-hidden">
                {/* Visual Canvas Display */}
                <div className="bg-[#0a0a0f] overflow-auto flex items-center justify-center p-6 border-r border-[#252535]/30">
                  <CanvasEditor
                    mapData={activeMap}
                    activeTool="none"
                    selectedElement={null}
                    onSelectElement={() => {}}
                    onUpdateGeometry={() => {}}
                  />
                </div>

                {/* Information sidebar for View mode */}
                <div className="bg-[#12121a] p-6 overflow-y-auto flex flex-col gap-6 w-80">
                  {/* Metadata grid */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#00f0ff]" />
                      Metadatos de Red
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Resolución', value: `${activeMap.width}x${activeMap.height}px` },
                        { label: 'Calles Horiz.', value: (activeConfig.avenidas_horizontales || []).length },
                        { label: 'Calles Vert.', value: (activeConfig.avenidas_verticales || []).length },
                        { label: 'Cuadras (Bloques)', value: (activeConfig.casas_config?.cuadras || []).length || (activeConfig.casas_config?.rango_x || []).length * (activeConfig.casas_config?.rango_y || []).length },
                        { label: 'Curvas Especiales', value: (activeConfig.curvas || []).length }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/2 border border-[#252535] rounded-lg p-3">
                          <span className="block text-[10px] text-slate-500 font-semibold mb-1">{item.label}</span>
                          <span className="font-mono text-xs font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Avenues list */}
                  <div className="flex flex-col gap-3 flex-grow">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
                      <Road className="w-4 h-4 text-[#00f0ff]" />
                      Nombres Viales
                    </h3>
                    <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {Object.keys(activeConfig.nombres_avenidas || {}).length === 0 ? (
                        <div className="text-slate-500 text-xs py-4">No hay nombres registrados.</div>
                      ) : (
                        Object.keys(activeConfig.nombres_avenidas || {})
                          .sort()
                          .map((key) => (
                            <li
                              key={key}
                              className="bg-white/2 border border-[#252535] p-3 rounded-lg flex items-center gap-3"
                            >
                              <span
                                className="font-mono text-[10px] font-bold px-2 py-0.5 rounded text-center shrink-0"
                                style={{
                                  backgroundColor: `${activeColor}1a`,
                                  color: activeColor
                                }}
                              >
                                {key}
                              </span>
                              <span className="text-xs font-semibold">{activeConfig.nombres_avenidas[key]}</span>
                            </li>
                          ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-500 gap-3">
                <MapIcon className="w-12 h-12 stroke-[1] text-[#00f0ff] opacity-40 animate-pulse" />
                <p className="text-sm">Seleccioná un mapa catastral o creá uno nuevo.</p>
              </div>
            )
          ) : (
            // ================= EDIT / CREATE MODE LAYOUT =================
            editorMap && (
              <div className="flex-grow grid grid-cols-1 lg:grid-cols-[1fr_480px] h-full overflow-hidden">
                {/* SVG Visual Canvas Workspace */}
                <div className="bg-[#0a0a0f] overflow-auto flex items-center justify-center p-6 border-r border-[#252535]/30">
                  <CanvasEditor
                    mapData={editorMap}
                    activeTool={activeTool}
                    selectedElement={selectedElement}
                    onSelectElement={setSelectedElement}
                    onUpdateGeometry={(geometryChanges) => {
                      setEditorMap(prev => {
                        if (!prev) return prev;
                        const newConfig = { ...prev.config };
                        Object.keys(geometryChanges).forEach((key) => {
                          newConfig[key] = geometryChanges[key];
                        });
                        return { ...prev, config: newConfig };
                      });
                    }}
                    tempMapName={editorMap.nombre}
                    tempColorTheme={editorMap.color_tema}
                  />
                </div>

                {/* Right hand properties & tools panel */}
                <PropertiesPanel
                  mapData={editorMap}
                  mode={mode}
                  activeTool={activeTool}
                  onChangeTool={setActiveTool}
                  selectedElement={selectedElement}
                  onDeleteElement={handleDeleteSelectedElement}
                  onUpdateElementProperty={handleUpdateElementProperty}
                  onUpdateGlobalProperty={handleUpdateGlobalProperty}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaving={isSaving}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
