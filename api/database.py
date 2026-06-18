# -*- coding: utf-8 -*-
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar .env buscando en el directorio principal (un nivel arriba del directorio api/)
dotenv_path = os.path.join(os.path.dirname(__file__), "../.env")
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None

try:
    if SUPABASE_URL and SUPABASE_KEY and "your-supabase" not in SUPABASE_URL:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error al conectar con Supabase: {e}")

def get_supabase() -> Client:
    if supabase is None:
        raise RuntimeError("El cliente de Supabase no está configurado. Por favor, configurá las variables de entorno SUPABASE_URL y SUPABASE_KEY.")
    return supabase
