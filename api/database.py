# -*- coding: utf-8 -*-
import os
from dotenv import load_dotenv
from supabase import create_client, Client

import json

# Cargar .env buscando en el directorio principal (un nivel arriba del directorio api/)
dotenv_path = os.path.join(os.path.dirname(__file__), "../.env")
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None
is_mock = False

try:
    if SUPABASE_URL and SUPABASE_KEY and "your-supabase" not in SUPABASE_URL:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error al conectar con Supabase: {e}")

# Mock Supabase Client implementation for zero-config local development
class MockQuery:
    def __init__(self, table, data_store, save_callback):
        self.table = table
        self.data_store = data_store
        self.save_callback = save_callback
        self.filters = []

    def select(self, fields="*"):
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def execute(self):
        filtered_data = list(self.data_store.values())
        for field, value in self.filters:
            filtered_data = [item for item in filtered_data if item.get(field) == value]
        
        class MockResponse:
            def __init__(self, data):
                self.data = data
        return MockResponse(filtered_data)

class MockUpdateQuery:
    def __init__(self, table, data_store, update_data, save_callback):
        self.table = table
        self.data_store = data_store
        self.update_data = update_data
        self.save_callback = save_callback
        self.filters = []

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def execute(self):
        updated = []
        for key, item in list(self.data_store.items()):
            match = True
            for f, v in self.filters:
                if item.get(f) != v:
                    match = False
                    break
            if match:
                item.update(self.update_data)
                updated.append(item)
        self.save_callback()
        class MockResponse:
            def __init__(self, data):
                self.data = data
        return MockResponse(updated)

class MockDeleteQuery:
    def __init__(self, table, data_store, save_callback):
        self.table = table
        self.data_store = data_store
        self.save_callback = save_callback
        self.filters = []

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def execute(self):
        deleted = []
        for key, item in list(self.data_store.items()):
            match = True
            for f, v in self.filters:
                if item.get(f) != v:
                    match = False
                    break
            if match:
                del self.data_store[key]
                deleted.append(item)
        self.save_callback()
        class MockResponse:
            def __init__(self, data):
                self.data = data
        return MockResponse(deleted)

class MockInsertQuery:
    def __init__(self, table, data_store, data, save_callback):
        self.table = table
        self.data_store = data_store
        self.data = data
        self.save_callback = save_callback

    def execute(self):
        items = self.data if isinstance(self.data, list) else [self.data]
        inserted = []
        for item in items:
            key = item.get("clave")
            self.data_store[key] = item
            inserted.append(item)
        self.save_callback()
        class MockResponse:
            def __init__(self, data):
                self.data = data
        return MockResponse(inserted)

class MockTable:
    def __init__(self, name, data_store, save_callback):
        self.name = name
        self.data_store = data_store
        self.save_callback = save_callback

    def select(self, fields="*"):
        return MockQuery(self.name, self.data_store, self.save_callback)

    def insert(self, data):
        return MockInsertQuery(self.name, self.data_store, data, self.save_callback)

    def update(self, data):
        return MockUpdateQuery(self.name, self.data_store, data, self.save_callback)

    def delete(self):
        return MockDeleteQuery(self.name, self.data_store, self.save_callback)

class MockSupabaseClient:
    def __init__(self):
        self.data_store = {}
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = os.path.join(self.base_dir, "mapas_db.json")
        self.seed_path = os.path.join(self.base_dir, "mapas.json")
        self.load_data()

    def load_data(self):
        # Intentar cargar desde el archivo de base de datos local
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    self.data_store = json.load(f)
                    return
            except Exception as e:
                print(f"Error al cargar base de datos local desde {self.db_path}: {e}")

        # Fallback: Cargar desde mapas.json inicial
        if os.path.exists(self.seed_path):
            try:
                with open(self.seed_path, "r", encoding="utf-8") as f:
                    local_data = json.load(f)
                    for clave, data in local_data.items():
                        config_data = {
                            "avenidas_horizontales": data.get("avenidas_horizontales", []),
                            "avenidas_verticales": data.get("avenidas_verticales", []),
                            "curvas": data.get("curvas", []),
                            "nombres_avenidas": data.get("nombres_avenidas", {}),
                            "intersecciones": data.get("intersecciones", []),
                            "casas_config": data.get("casas_config", {}),
                            "conexiones": data.get("conexiones", {})
                        }
                        self.data_store[clave] = {
                            "clave": data.get("clave", clave),
                            "nombre": data.get("nombre", "DISTRITO"),
                            "color_tema": data.get("color_tema", "#00f0ff"),
                            "width": data.get("width", 800),
                            "height": data.get("height", 800),
                            "config": config_data
                        }
                self.save_data()
            except Exception as e:
                print(f"Error al inicializar base de datos mock desde mapas.json: {e}")

    def save_data(self):
        try:
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump(self.data_store, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error al persistir base de datos local en {self.db_path}: {e}")

    def table(self, name):
        if name == "mapas":
            return MockTable(name, self.data_store, self.save_data)
        raise ValueError(f"Tabla '{name}' no soportada por el cliente mock.")

if supabase is None:
    print("WARNING: Supabase URL o Key no configurados en .env. Se usará una base de datos local simulada (mapas_db.json).")
    supabase = MockSupabaseClient()
    is_mock = True

def get_supabase() -> Client:
    return supabase
