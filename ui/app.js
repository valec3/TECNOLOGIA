// Base API URL
const API_URL = '/api';

// Application State
let maps = [];
let activeMap = null;
let isEditing = false;

// DOM Elements
const mapListEl = document.getElementById('map-list');
const activeMapTitleEl = document.getElementById('active-map-title');
const activeMapBadgeEl = document.getElementById('active-map-badge');
const btnEditActiveEl = document.getElementById('btn-edit-active');
const btnDeleteActiveEl = document.getElementById('btn-delete-active');
const btnOpenCreateModalEl = document.getElementById('btn-open-create-modal');
const modalEl = document.getElementById('map-modal');
const modalTitleEl = document.getElementById('modal-title');
const formEl = document.getElementById('map-form');
const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-btn');

// Form inputs
const inputClave = document.getElementById('map-clave');
const inputNombre = document.getElementById('map-nombre');
const inputColor = document.getElementById('map-color');
const inputColorHex = document.getElementById('map-color-hex');
const inputSize = document.getElementById('map-size');
const inputYCoords = document.getElementById('map-y-coords');
const inputXCoords = document.getElementById('map-x-coords');
const inputNamesH = document.getElementById('map-names-h');
const inputNamesV = document.getElementById('map-names-v');
const inputConnNorte = document.getElementById('conn-norte');
const inputConnSur = document.getElementById('conn-sur');
const inputConnEste = document.getElementById('conn-este');
const inputConnOeste = document.getElementById('conn-oeste');

const btnToggleJson = document.getElementById('btn-toggle-json');
const jsonEditorContainer = document.getElementById('json-editor-container');
const inputJsonConfig = document.getElementById('map-json-config');
const btnSaveMap = document.getElementById('btn-save-map');

// Canvas
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

// Sync Color inputs
inputColor.addEventListener('input', (e) => {
    inputColorHex.value = e.target.value.toUpperCase();
});
inputColorHex.addEventListener('input', (e) => {
    if(/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        inputColor.value = e.target.value;
    }
});

// JSON Advanced Toggle
btnToggleJson.addEventListener('click', () => {
    jsonEditorContainer.classList.toggle('hidden');
    // If opening, synchronize fields to JSON textarea
    if (!jsonEditorContainer.classList.contains('hidden')) {
        const config = getGeometryFromFields();
        inputJsonConfig.value = JSON.stringify(config, null, 2);
    }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchMaps();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Open modal to create
    btnOpenCreateModalEl.addEventListener('click', () => {
        isEditing = false;
        modalTitleEl.textContent = 'Crear Nuevo Distrito Catastral';
        btnSaveMap.textContent = 'Crear Distrito';
        inputClave.disabled = false;
        formEl.reset();
        
        // default settings
        inputColor.value = '#00f0ff';
        inputColorHex.value = '#00f0ff';
        inputSize.value = 800;
        inputYCoords.value = '250, 550';
        inputXCoords.value = '250, 550';
        inputNamesH.value = 'Av. del Libertador, Av. de Mayo';
        inputNamesV.value = 'Av. 9 de Julio, Av. Rivadavia';
        inputConnNorte.value = '';
        inputConnSur.value = '';
        inputConnEste.value = '';
        inputConnOeste.value = '';
        
        jsonEditorContainer.classList.add('hidden');
        modalEl.classList.add('open');
    });

    // Close modal
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalEl.classList.remove('open');
        });
    });

    // Handle Form Submit
    formEl.addEventListener('submit', handleFormSubmit);

    // Edit Active Map
    btnEditActiveEl.addEventListener('click', () => {
        if (!activeMap) return;
        isEditing = true;
        modalTitleEl.textContent = `Editar Distrito: ${activeMap.nombre}`;
        btnSaveMap.textContent = 'Guardar Cambios';
        
        inputClave.value = activeMap.clave;
        inputClave.disabled = true; // No se puede cambiar la clave PK
        inputNombre.value = activeMap.nombre;
        inputColor.value = activeMap.color_tema;
        inputColorHex.value = activeMap.color_tema.toUpperCase();
        inputSize.value = activeMap.width;

        // Fill geometry fields from activeMap.config
        const conf = activeMap.config || {};
        const yCoords = (conf.avenidas_horizontales || []).map(a => a.y).join(', ');
        const xCoords = (conf.avenidas_verticales || []).map(a => a.x).join(', ');
        inputYCoords.value = yCoords;
        inputXCoords.value = xCoords;

        const namesH = Object.keys(conf.nombres_avenidas || {})
            .filter(k => k.startsWith('H'))
            .sort()
            .map(k => conf.nombres_avenidas[k])
            .join(', ');
        const namesV = Object.keys(conf.nombres_avenidas || {})
            .filter(k => k.startsWith('V'))
            .sort()
            .map(k => conf.nombres_avenidas[k])
            .join(', ');
        inputNamesH.value = namesH;
        inputNamesV.value = namesV;

        const conns = conf.conexiones || {};
        inputConnNorte.value = conns.norte || '';
        inputConnSur.value = conns.sur || '';
        inputConnEste.value = conns.este || '';
        inputConnOeste.value = conns.oeste || '';

        jsonEditorContainer.classList.add('hidden');
        modalEl.classList.add('open');
    });

    // Delete Active Map
    btnDeleteActiveEl.addEventListener('click', async () => {
        if (!activeMap) return;
        if (confirm(`¿Estás seguro que querés eliminar el distrito "${activeMap.nombre}"? Esto no se puede deshacer.`)) {
            try {
                const res = await fetch(`${API_URL}/mapas/${activeMap.clave}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    activeMap = null;
                    fetchMaps();
                } else {
                    const err = await res.json();
                    alert(`Error: ${err.detail}`);
                }
            } catch (error) {
                console.error(error);
                alert('Ocurrió un error al intentar borrar el mapa.');
            }
        }
    });
}

// Fetch all maps
async function fetchMaps() {
    try {
        const res = await fetch(`${API_URL}/mapas`);
        if (res.ok) {
            maps = await res.json();
            renderMapList();
            if (maps.length > 0) {
                // Selecciona el primero por defecto si no hay activo
                if (!activeMap || !maps.find(m => m.clave === activeMap.clave)) {
                    selectMap(maps[0]);
                } else {
                    // Actualiza la referencia del activo
                    selectMap(maps.find(m => m.clave === activeMap.clave));
                }
            } else {
                renderEmptyState();
            }
        } else {
            mapListEl.innerHTML = '<li class="loading-spinner">❌ Error de conexión al servidor</li>';
        }
    } catch (error) {
        console.error(error);
        mapListEl.innerHTML = '<li class="loading-spinner">❌ Error de API: ¿ Levantaste FastAPI ?</li>';
    }
}

// Render map items in sidebar
function renderMapList() {
    mapListEl.innerHTML = '';
    maps.forEach(map => {
        const li = document.createElement('li');
        li.className = `map-item ${activeMap && activeMap.clave === map.clave ? 'active' : ''}`;
        li.innerHTML = `
            <div class="map-item-info">
                <span class="map-item-name">${map.nombre}</span>
                <span class="map-item-key">clave: ${map.clave}</span>
            </div>
            <span class="map-item-dot" style="background-color: ${map.color_tema}; box-shadow: 0 0 6px ${map.color_tema}"></span>
        `;
        li.addEventListener('click', () => selectMap(map));
        mapListEl.appendChild(li);
    });
}

function renderEmptyState() {
    mapListEl.innerHTML = '<li class="loading-spinner">No hay distritos creados. ¡Creá uno nuevo!</li>';
    activeMapTitleEl.textContent = 'Sin Distritos';
    activeMapBadgeEl.textContent = 'Clave: -';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#222';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('Creá un distrito en el panel lateral para empezar.', canvas.width / 2, canvas.height / 2);
}

// Select active map
function selectMap(map) {
    activeMap = map;
    
    // Highlight in list
    document.querySelectorAll('.map-item').forEach(el => {
        el.classList.remove('active');
        if (el.querySelector('.map-item-key').textContent.includes(map.clave)) {
            el.classList.add('active');
        }
    });

    // Update headers & meta
    activeMapTitleEl.textContent = map.nombre;
    activeMapTitleEl.style.color = map.color_tema;
    activeMapBadgeEl.textContent = `Clave: ${map.clave}`;
    
    document.getElementById('meta-resolution').textContent = `${map.width} x ${map.height} px`;
    document.getElementById('meta-horiz-count').textContent = (map.config.avenidas_horizontales || []).length;
    document.getElementById('meta-vert-count').textContent = (map.config.avenidas_verticales || []).length;
    document.getElementById('meta-curves-count').textContent = (map.config.curvas || []).length;
    // Conexiones de red
    const connectionsListEl = document.getElementById('connections-list');
    if (connectionsListEl) {
        connectionsListEl.innerHTML = '';
        const connections = map.config.conexiones || {};
        const directions = ['norte', 'sur', 'este', 'oeste'];
        directions.forEach(dir => {
            const li = document.createElement('li');
            const dest = connections[dir];
            if (dest) {
                li.innerHTML = `
                    <span class="direction">${dir.toUpperCase()}</span>
                    <span class="dest" style="color: ${map.color_tema}; font-weight: bold;">${dest.toUpperCase()}</span>
                `;
            } else {
                li.innerHTML = `
                    <span class="direction">${dir.toUpperCase()}</span>
                    <span class="dest void">SIN CONEXIÓN</span>
                `;
            }
            connectionsListEl.appendChild(li);
        });
    }

    // Nombres viales
    const avenuesListEl = document.getElementById('avenues-list');
    avenuesListEl.innerHTML = '';
    const names = map.config.nombres_avenidas || {};
    Object.keys(names).sort().forEach(key => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="av-key" style="background-color: ${map.color_tema}1a; color: ${map.color_tema}">${key}</span>
            <span class="av-name">${names[key]}</span>
        `;
        avenuesListEl.appendChild(li);
    });

    // Canvas Size adjust
    canvas.width = map.width || 800;
    canvas.height = map.height || 800;

    // Draw
    drawMap(map);
}

// Generate geometry JSON object from normal input fields
function getGeometryFromFields() {
    const size = parseInt(inputSize.value) || 800;
    const yCoords = inputYCoords.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const xCoords = inputXCoords.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    const namesH = inputNamesH.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const namesV = inputNamesV.value.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const nombres_avenidas = {};
    namesH.forEach((name, i) => { nombres_avenidas[`H${i+1}`] = name.toUpperCase(); });
    namesV.forEach((name, i) => { nombres_avenidas[`V${i+1}`] = name.toUpperCase(); });

    // Intersections auto generation
    const intersecciones = [];
    yCoords.forEach((y, yIdx) => {
        xCoords.forEach((x, xIdx) => {
            const hName = nombres_avenidas[`H${yIdx+1}`] || `H${yIdx+1}`;
            const vName = nombres_avenidas[`V${xIdx+1}`] || `V${xIdx+1}`;
            const shortName = `CRUCE\n(${hName.substring(0,6)} & ${vName.substring(0,6)})`;
            intersecciones.push({
                pos: [x, y],
                nombre: shortName
            });
        });
    });

    // Houses configuration grid (rango_x y rango_y)
    // helper functions matching python catastro logic
    function calcBloques(coords, maxVal) {
        const sorted = [...coords].sort((a,b) => a-b);
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

    const rango_x = calcBloques(xCoords, size);
    const rango_y = calcBloques(yCoords, size);

    const conexiones = {};
    if (inputConnNorte.value.trim()) conexiones.norte = inputConnNorte.value.trim().toLowerCase();
    if (inputConnSur.value.trim()) conexiones.sur = inputConnSur.value.trim().toLowerCase();
    if (inputConnEste.value.trim()) conexiones.este = inputConnEste.value.trim().toLowerCase();
    if (inputConnOeste.value.trim()) conexiones.oeste = inputConnOeste.value.trim().toLowerCase();

    return {
        avenidas_horizontales: yCoords.map(y => ({ y, x_ini: 0, x_fin: size })),
        avenidas_verticales: xCoords.map(x => ({ x, y_ini: 0, y_fin: size })),
        curvas: activeMap && isEditing ? (activeMap.config.curvas || []) : [], // Conserva curvas si se edita
        nombres_avenidas,
        intersecciones,
        casas_config: { rango_x, rango_y },
        conexiones
    };
}

// Handle Form Submit (Create or Update)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    let configObj = {};
    
    // Check if using JSON advanced mode
    if (!jsonEditorContainer.classList.contains('hidden')) {
        try {
            configObj = JSON.parse(inputJsonConfig.value);
        } catch (error) {
            alert('El JSON ingresado tiene errores de formato.');
            return;
        }
    } else {
        configObj = getGeometryFromFields();
    }

    const payload = {
        clave: inputClave.value.trim().toLowerCase(),
        nombre: inputNombre.value.trim().toUpperCase(),
        color_tema: inputColorHex.value.trim(),
        width: parseInt(inputSize.value) || 800,
        height: parseInt(inputSize.value) || 800,
        config: configObj
    };

    try {
        let res;
        if (isEditing) {
            res = await fetch(`${API_URL}/mapas/${payload.clave}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: payload.nombre,
                    color_tema: payload.color_tema,
                    width: payload.width,
                    height: payload.height,
                    config: payload.config
                })
            });
        } else {
            res = await fetch(`${API_URL}/mapas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            modalEl.classList.remove('open');
            fetchMaps();
        } else {
            const err = await res.json();
            alert(`Error: ${err.detail}`);
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al enviar el formulario.');
    }
}

// Render dynamic map on Canvas 2D
function drawMap(map) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Deep background grid
    ctx.strokeStyle = '#1a1a24';
    ctx.lineWidth = 1;
    for (let i = 50; i < w; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
    }

    const conf = map.config || {};
    const color = map.color_tema || '#00f0ff';

    // 1. Draw Houses
    const rx = conf.casas_config?.rango_x || [];
    const ry = conf.casas_config?.rango_y || [];
    const lights = [color, '#39ff14', '#ff0055', '#ffcc00'];

    rx.forEach(([rx_min, rx_max]) => {
        ry.forEach(([ry_min, ry_max]) => {
            const houses = [
                { x: rx_min, y: ry_min }, // NO
                { x: rx_max - 50, y: ry_min }, // NE
                { x: rx_min, y: ry_max - 50 }, // SO
                { x: rx_max - 50, y: ry_max - 50 } // SE
            ];

            houses.forEach((house, index) => {
                // Draw House block
                ctx.fillStyle = '#16161a';
                ctx.strokeStyle = '#25252d';
                ctx.lineWidth = 1;
                ctx.fillRect(house.x, house.y, 50, 50);
                ctx.strokeRect(house.x, house.y, 50, 50);

                // Draw neon window border light
                ctx.strokeStyle = lights[index % lights.length];
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 4]);
                ctx.strokeRect(house.x + 4, house.y + 4, 42, 42);
                ctx.setLineDash([]);
            });
        });
    });

    // 2. Draw Avenues Horizontales (Asphalt + Yellow dash)
    const avH = conf.avenidas_horizontales || [];
    avH.forEach(av => {
        const y = av.y;
        const x_ini = av.x_ini !== undefined ? av.x_ini : 0;
        const x_fin = av.x_fin !== undefined ? av.x_fin : w;

        // Asphalt
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(x_ini, y - 40, x_fin - x_ini, 80);

        // Center line
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(x_ini, y);
        ctx.lineTo(x_fin, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Direction arrows (simulated)
        ctx.fillStyle = '#55555f';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        [x_ini + 100, x_ini + 380, x_ini + 680].forEach(arrowX => {
            if (arrowX >= x_ini && arrowX <= x_fin) {
                ctx.fillText('←', arrowX, y - 20);
                ctx.fillText('→', arrowX, y + 20);
            }
        });
    });

    // 3. Draw Avenues Verticales
    const avV = conf.avenidas_verticales || [];
    avV.forEach(av => {
        const x = av.x;
        const y_ini = av.y_ini !== undefined ? av.y_ini : 0;
        const y_fin = av.y_fin !== undefined ? av.y_fin : h;

        // Asphalt
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(x - 40, y_ini, 80, y_fin - y_ini);

        // Center line
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(x, y_ini);
        ctx.lineTo(x, y_fin);
        ctx.stroke();
        ctx.setLineDash([]);

        // Direction arrows
        ctx.fillStyle = '#55555f';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        [y_ini + 100, y_ini + 380, y_ini + 680].forEach(arrowY => {
            if (arrowY >= y_ini && arrowY <= y_fin) {
                ctx.fillText('↑', x - 20, arrowY);
                ctx.fillText('↓', x + 20, arrowY);
            }
        });
    });

    // 4. Draw Curves (Arc layout)
    const curves = conf.curvas || [];
    curves.forEach(c => {
        const cx = c.cx;
        const cy = c.cy;
        const R = c.R;
        const ang_ini = (c.ang_ini * Math.PI) / 180;
        const ang_fin = (c.ang_fin * Math.PI) / 180;

        // Asphalt block
        ctx.strokeStyle = '#1e1e24';
        ctx.lineWidth = 80;
        ctx.beginPath();
        ctx.arc(cx, cy, R, ang_ini, ang_fin);
        ctx.stroke();

        // Dash divider
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy, R, ang_ini, ang_fin);
        ctx.stroke();
        ctx.setLineDash([]);

        // External boundaries
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, R - 40, ang_ini, ang_fin);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, R + 40, ang_ini, ang_fin);
        ctx.stroke();
    });

    // 5. Draw Intersections
    const intersections = conf.intersecciones || [];
    intersections.forEach(nodo => {
        const [ix, iy] = nodo.pos;

        // Intersection asphalt zone
        ctx.fillStyle = '#25252d';
        ctx.fillRect(ix - 40, iy - 40, 80, 80);

        // Zebra lines (peatonal crosses)
        ctx.fillStyle = '#1a1a22';
        for (let s = -36; s < 36; s += 9) {
            ctx.fillRect(ix - 40, iy + s, 80, 5);
        }

        // Glow Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 4]);
        ctx.strokeRect(ix - 40, iy - 40, 80, 80);
        ctx.setLineDash([]);

        // Text name (clean display)
        ctx.fillStyle = color;
        ctx.font = 'bold 8px Courier New';
        ctx.textAlign = 'center';
        const lines = nodo.nombre.split('\n');
        ctx.fillText(lines[0], ix, iy - 4);
        if (lines[1]) ctx.fillText(lines[1], ix, iy + 6);
    });

    // 6. Draw Avenue Names
    const names = conf.nombres_avenidas || {};
    avH.forEach((av, i) => {
        const name = names[`H${i+1}`] || `AVENIDA H${i+1}`;
        ctx.fillStyle = '#718096';
        ctx.font = 'bold 8px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(name, av.x_ini + 110, av.y - 48);
        ctx.textAlign = 'right';
        ctx.fillText(name, av.x_fin - 110, av.y - 48);
    });

    avV.forEach((av, i) => {
        const name = names[`V${i+1}`] || `AVENIDA V${i+1}`;
        ctx.fillStyle = '#718096';
        ctx.font = 'bold 8px Courier New';
        ctx.textAlign = i % 2 === 0 ? 'right' : 'left';
        const offsetX = i % 2 === 0 ? -75 : 75;
        ctx.fillText(name, av.x + offsetX, av.y_ini + 45);
        ctx.fillText(name, av.x + offsetX, av.y_fin - 45);
    });

    // 7. Scale and coordinate grid labels
    ctx.fillStyle = color;
    ctx.font = '7px Courier New';
    ctx.textAlign = 'center';
    
    for (let x = 100; x < w; x += 100) {
        ctx.fillText(`${x}m`, x, 12);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 5);
        ctx.stroke();
    }
    for (let y = 100; y < h; y += 100) {
        ctx.textAlign = 'left';
        ctx.fillText(`${y}m`, 14, y);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(5, y);
        ctx.stroke();
    }
}
