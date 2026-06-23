/**
 * Cliente WebSocket para notificaciones de mapas en tiempo real.
 * MVP: conexión simple con autoreconexión básica.
 */

// En desarrollo con Vite proxy: usa /ws/mapas
// En producción: usa VITE_API_URL
const WS_URL = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'http://127.0.0.1:8000'
  ? `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/ws/mapas`
  : `/ws/mapas`;

let socket = null;
let reconnectTimer = null;
const listeners = new Set();

/**
 * Conecta al servidor WebSocket.
 * Si la conexión se pierde, intenta reconectar automáticamente.
 */
export function connect() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    return;
  }

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WS] Conectado a', WS_URL);
    // Cancelar cualquier reconnect pendiente
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      // Notificar a todos los listeners
      listeners.forEach((callback) => callback(message));
    } catch (e) {
      console.error('[WS] Error al parsear mensaje:', e);
    }
  };

  socket.onclose = () => {
    console.log('[WS] Desconectado. Reintentando en 3s...');
    socket = null;
    // Reconnect básico
    reconnectTimer = setTimeout(() => {
      connect();
    }, 3000);
  };

  socket.onerror = (error) => {
    console.error('[WS] Error:', error);
  };
}

/**
 * Desconecta del servidor WebSocket.
 */
export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}

/**
 * Suscribe un callback para recibir eventos WebSocket.
 * @param {Function} callback - Función que recibe { event, data }
 * @returns {Function} Función para desuscribirse
 */
export function subscribe(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * helpers para verificar estado de conexión.
 */
export function isConnected() {
  return socket && socket.readyState === WebSocket.OPEN;
}
