const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/mapas` 
  : '/api/mapas';

export async function fetchMaps() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Error al listar distritos');
  return res.json();
}

export async function fetchMapDetails(clave) {
  const res = await fetch(`${API_BASE}/${clave}`);
  if (!res.ok) throw new Error(`Error al buscar el distrito: ${clave}`);
  return res.json();
}

export async function createMap(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al crear el distrito');
  }
  return res.json();
}

export async function updateMap(clave, payload) {
  const res = await fetch(`${API_BASE}/${clave}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al actualizar el distrito');
  }
  return res.json();
}

export async function deleteMap(clave) {
  const res = await fetch(`${API_BASE}/${clave}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al eliminar el distrito');
  }
  return res.json();
}
