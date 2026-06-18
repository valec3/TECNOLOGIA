# -*- coding: utf-8 -*-
import json
from database import get_supabase
from schemas import MapCreate

def sembrar_datos():
    print("Loading maps from local mapas.json...")
    try:
        with open("mapas.json", "r", encoding="utf-8") as f:
            mapas_locales = json.load(f)
    except FileNotFoundError:
        print("Error: mapas.json not found in current directory.")
        return
    except Exception as e:
        print(f"Error reading mapas.json: {e}")
        return

    db = get_supabase()

    for clave, data in mapas_locales.items():
        print(f"Processing map '{clave}'...")
        
        config_data = {
            "avenidas_horizontales": data.get("avenidas_horizontales", []),
            "avenidas_verticales": data.get("avenidas_verticales", []),
            "curvas": data.get("curvas", []),
            "nombres_avenidas": data.get("nombres_avenidas", {}),
            "intersecciones": data.get("intersecciones", []),
            "casas_config": data.get("casas_config", {}),
            "conexiones": data.get("conexiones", {})
        }

        mapa_dict = {
            "clave": data.get("clave", clave),
            "nombre": data.get("nombre", "DISTRITO"),
            "color_tema": data.get("color_tema", "#00f0ff"),
            "width": data.get("width", 800),
            "height": data.get("height", 800),
            "config": config_data
        }

        try:
            db.table("mapas").delete().eq("clave", mapa_dict["clave"]).execute()
            res = db.table("mapas").insert(mapa_dict).execute()
            if res.data:
                print(f"Map '{mapa_dict['nombre']}' inserted successfully.")
            else:
                print(f"No response received when inserting '{mapa_dict['nombre']}'.")
        except Exception as e:
            print(f"Error inserting '{mapa_dict['nombre']}' in Supabase: {e}")

if __name__ == "__main__":
    print("==================================================")
    print("  Catastral Data Seeder for Supabase")
    print("==================================================")
    sembrar_datos()
