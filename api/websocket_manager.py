"""
WebSocket Connection Manager - MVP
Manejo simple de conexiones WebSocket para notificaciones de mapas.
"""

from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    """Maneja conexiones WebSocket y broadcasting simple."""

    def __init__(self):
        # Canal único para todos los mapas por ahora
        self.active_connections: Dict[str, List[WebSocket]] = {"mapas": []}

    async def connect(self, websocket: WebSocket, channel: str = "mapas"):
        """Acepta una conexión y la une al canal."""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        print(f"WS: Cliente conectado al canal '{channel}'. Total: {len(self.active_connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str = "mapas"):
        """Remueve una conexión del canal."""
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
            print(f"WS: Cliente desconectado del canal '{channel}'. Total: {len(self.active_connections[channel])}")

    async def broadcast(self, channel: str, event: str, data: dict):
        """Envía un mensaje a todos los clientes del canal."""
        if channel not in self.active_connections:
            return

        message = json.dumps({"event": event, "data": data})
        disconnected = []

        for connection in self.active_connections[channel]:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)

        # Limpiar conexiones muertas
        for conn in disconnected:
            self.active_connections[channel].remove(conn)

    async def emit_map_created(self, mapa: dict):
        """Notifica creación de un nuevo mapa."""
        await self.broadcast("mapas_global", "mapa:created", mapa)

    async def emit_map_updated(self, clave: str, mapa: dict):
        """Notifica actualización de un mapa."""
        # Notificar a los que están viendo este mapa en específico
        await self.broadcast(f"mapa_{clave}", "mapa:updated", {"clave": clave, "mapa": mapa})
        # Notificar al listado general
        await self.broadcast("mapas_global", "mapa:updated", {"clave": clave, "mapa": mapa})

    async def emit_map_deleted(self, clave: str):
        """Notifica eliminación de un mapa."""
        # Notificar al listado general
        await self.broadcast("mapas_global", "mapa:deleted", {"clave": clave})
        # Notificar a los que estaban viéndolo para que salgan
        await self.broadcast(f"mapa_{clave}", "mapa:deleted", {"clave": clave})


# Instancia global del manager
manager = ConnectionManager()
