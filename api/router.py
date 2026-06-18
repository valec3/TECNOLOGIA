from fastapi import APIRouter, HTTPException, Depends
from typing import List
from api.db import get_supabase
from api.models import MapaCreate, MapaUpdate, MapaResponse
from supabase import Client

router = APIRouter(prefix="/api/mapas", tags=["Mapas"])

@router.get("", response_model=List[MapaResponse])
def listar_mapas(db: Client = Depends(get_supabase)):
    try:
        response = db.table("mapas").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los mapas: {str(e)}")

@router.get("/{clave}", response_model=MapaResponse)
def obtener_mapa(clave: str, db: Client = Depends(get_supabase)):
    try:
        response = db.table("mapas").select("*").eq("clave", clave).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Mapa '{clave}' no encontrado.")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el mapa: {str(e)}")

@router.post("", response_model=MapaResponse)
def crear_mapa(mapa: MapaCreate, db: Client = Depends(get_supabase)):
    try:
        check = db.table("mapas").select("clave").eq("clave", mapa.clave).execute()
        if check.data:
            raise HTTPException(status_code=400, detail=f"El mapa con clave '{mapa.clave}' ya existe.")
        
        payload = mapa.model_dump()
        response = db.table("mapas").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="No se pudo registrar el mapa.")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar el mapa: {str(e)}")

@router.put("/{clave}", response_model=MapaResponse)
def actualizar_mapa(clave: str, mapa: MapaUpdate, db: Client = Depends(get_supabase)):
    try:
        check = db.table("mapas").select("clave").eq("clave", clave).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail=f"Mapa '{clave}' no encontrado.")
        
        payload = mapa.model_dump(exclude_unset=True)
        if not payload:
            raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar.")
        
        response = db.table("mapas").update(payload).eq("clave", clave).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="No se pudo actualizar el mapa.")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar el mapa: {str(e)}")

@router.delete("/{clave}")
def eliminar_mapa(clave: str, db: Client = Depends(get_supabase)):
    try:
        check = db.table("mapas").select("clave").eq("clave", clave).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail=f"Mapa '{clave}' no encontrado.")
        
        db.table("mapas").delete().eq("clave", clave).execute()
        return {"ok": True, "detail": f"Mapa '{clave}' eliminado exitosamente."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar el mapa: {str(e)}")
