# API — Mapas Metropolitanos

Backend REST construido con **FastAPI** y **Supabase** para la gestión de mapas catastrales urbanos.

---

## Stack

- **FastAPI** 0.136 — framework web asíncrono
- **Pydantic** v2 — validación de schemas
- **Supabase** — persistencia en la nube (PostgreSQL)
- **Uvicorn** — servidor ASGI

---

## Estructura

```
api/
├── main.py          ← Punto de entrada, CORS, registro de router
├── router.py        ← Endpoints REST /api/mapas
├── models.py        ← Schemas Pydantic (MapaCreate, MapaUpdate, MapaResponse)
├── db.py            ← Cliente Supabase + fallback MockSupabaseClient local
├── seed.py          ← Script para sembrar datos iniciales en Supabase
├── seed_data.json   ← Datos de ejemplo para desarrollo local
└── requirements.txt
```

---

## Instalación

```bash
pip install -r api/requirements.txt
```

---

## Variables de Entorno

Crea un archivo `.env` en la **raíz del repositorio** (un nivel arriba de `api/`):

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
```

> Si no configurás estas variables, la API inicia automáticamente en **modo local** usando `api/db_local.json` como base de datos simulada. No se requiere ninguna cuenta ni configuración adicional.

---

## Ejecutar en Desarrollo

```bash
# Desde la raíz del repositorio
python -m api.main
```

El servidor queda disponible en `http://localhost:8000`.

---

## Documentación Interactiva

| URL | Descripción |
|-----|-------------|
| `http://localhost:8000/api/docs` | Swagger UI — probá los endpoints visualmente |
| `http://localhost:8000/api/redoc` | ReDoc — documentación de referencia |
| `http://localhost:8000/api/openapi.json` | Schema OpenAPI en JSON |

---

## Endpoints

Todos los endpoints tienen el prefijo `/api/mapas`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/mapas` | Lista todos los mapas |
| `GET` | `/api/mapas/{clave}` | Obtiene un mapa por su clave |
| `POST` | `/api/mapas` | Crea un nuevo mapa |
| `PUT` | `/api/mapas/{clave}` | Actualiza un mapa existente |
| `DELETE` | `/api/mapas/{clave}` | Elimina un mapa |

### Schema de un Mapa

```json
{
  "clave": "centro",
  "nombre": "MAPA CENTRO",
  "color_tema": "#00f0ff",
  "width": 800,
  "height": 800,
  "config": {
    "avenidas_horizontales": [{ "y": 250, "x_ini": 0, "x_fin": 800 }],
    "avenidas_verticales":   [{ "x": 250, "y_ini": 0, "y_fin": 800 }],
    "curvas": [],
    "nombres_avenidas": { "H1": "AV. PRINCIPAL", "V1": "AV. CENTRAL" },
    "intersecciones": [],
    "casas_config": { "cuadras": [] },
    "conexiones": {}
  }
}
```

---

## Sembrar Datos

Para cargar los mapas de ejemplo del archivo `seed_data.json` en Supabase:

```bash
python -m api.seed
```

---

## CORS

La API tiene CORS completamente abierto (`allow_origins=["*"]`) para permitir conexiones desde cualquier frontend, sin restricciones de dominio.  
`allow_credentials=False` es **obligatorio** cuando se usa el comodín `*` en `allow_origins`.

---

## Despliegue (ej. Render)

- **Build Command**: `pip install -r api/requirements.txt`
- **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- **Variables**: `SUPABASE_URL`, `SUPABASE_KEY`
