# -*- coding: utf-8 -*-
import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

# Agregar el directorio raíz al PATH para permitir importaciones de 'api'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api import router_mapas

app = FastAPI(
    title="API de Mapas Metropolitanos",
    description="API para la gestión y visualización de mapas catastrales usando Supabase.",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir router de mapas
app.include_router(router_mapas.router)

# Ruta absoluta al directorio 'ui/' un nivel arriba
ui_path = os.path.join(os.path.dirname(__file__), "../ui")
app.mount("/ui", StaticFiles(directory=ui_path, html=True), name="ui")

@app.get("/")
def redirect_to_ui():
    return RedirectResponse(url="/ui")

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)
