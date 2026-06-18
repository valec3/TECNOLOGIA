from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional

class MapaConfig(BaseModel):
    avenidas_horizontales: List[Dict[str, Any]] = Field(default_factory=list)
    avenidas_verticales: List[Dict[str, Any]] = Field(default_factory=list)
    curvas: List[Dict[str, Any]] = Field(default_factory=list)
    nombres_avenidas: Dict[str, str] = Field(default_factory=dict)
    intersecciones: List[Dict[str, Any]] = Field(default_factory=list)
    casas_config: Dict[str, Any] = Field(default_factory=dict)
    conexiones: Dict[str, str] = Field(default_factory=dict)

class MapaBase(BaseModel):
    clave: str = Field(..., description="Clave única del mapa (ej: centro, norte)")
    nombre: str = Field(..., description="Nombre descriptivo del mapa")
    color_tema: str = Field("#00f0ff", description="Color en hexadecimal para destacar el mapa")
    width: int = Field(800, description="Ancho de resolución en píxeles")
    height: int = Field(800, description="Alto de resolución en píxeles")
    config: MapaConfig = Field(default_factory=MapaConfig, description="Detalles geométricos del mapa")

class MapaCreate(MapaBase):
    pass

class MapaUpdate(BaseModel):
    nombre: Optional[str] = None
    color_tema: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    config: Optional[MapaConfig] = None

class MapaResponse(MapaBase):
    class Config:
        from_attributes = True
