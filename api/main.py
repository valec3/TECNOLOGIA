import os
import sys
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# Agregar el directorio raíz al PATH para permitir importaciones de 'api'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api import router
from api.websocket_manager import manager

app = FastAPI(
    title="API de Mapas Metropolitanos",
    description=(
        "API REST para la gestión y visualización de mapas catastrales urbanos. "
        "Permite crear, leer, actualizar y eliminar mapas catastrales, incluyendo "
        "la geometría de calles, avenidas, curvas viales y cuadras."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS abierto: permite conexiones desde cualquier origen
# NOTA: allow_credentials DEBE ser False cuando allow_origins es ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router de mapas catastrales
app.include_router(router.router)


@app.websocket("/ws/mapas")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint WebSocket para notificaciones de mapas en tiempo real."""
    await manager.connect(websocket, "mapas")
    try:
        while True:
            # Mantener la conexión viva
            # El cliente puede enviar mensajes de ping/pong si quiere
            data = await websocket.receive_text()
            # Por ahora ignoramos mensajes entrantes (MVP)
    except Exception:
        pass
    finally:
        manager.disconnect(websocket, "mapas")


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)
