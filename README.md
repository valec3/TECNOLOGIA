# Catastro Metropolitano — Administrador de Mapas

Aplicación web para la gestión y visualización de **mapas catastrales urbanos**. Permite diseñar calles, avenidas, curvas viales y cuadras de forma visual e interactiva, persistiendo los datos en la nube con Supabase.

---

## Arquitectura

El proyecto está compuesto por **dos aplicaciones independientes**, pensadas para desplegarse en servidores separados:

```
TECNOLOGIA/
├── api/          ← Backend: FastAPI + Supabase
└── client/       ← Frontend: React 19 + Vite + Tailwind CSS v4
```

Cada una tiene su propio README con instrucciones de instalación y despliegue.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI 0.136, Pydantic v2, Uvicorn |
| Persistencia | Supabase (PostgreSQL) · Fallback local JSON |
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Íconos | Lucide React |

---

## Inicio Rápido

### 1. Requisitos previos

- Python 3.11+
- Node.js 20+ con `pnpm`

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Supabase:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
```

> Si no configurás estas variables, la API funciona igual usando una **base de datos local simulada** (`api/db_local.json`). Ideal para desarrollo sin cuenta en Supabase.

### 3. Levantar el Backend (API)

```bash
# Instalar dependencias
pip install -r api/requirements.txt

# Iniciar servidor de desarrollo
python -m api.main
```

La API quedará disponible en `http://localhost:8000`.  
La documentación interactiva estará en `http://localhost:8000/api/docs`.

### 4. Levantar el Frontend (Cliente)

```bash
cd client

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm run dev
```

El cliente quedará disponible en `http://localhost:5173`.  
En desarrollo, las peticiones a `/api/*` se redirigen automáticamente al backend mediante el proxy de Vite.

---

## Base de Datos en Supabase

Si querés usar Supabase en la nube, creá la tabla ejecutando esta sentencia en el **SQL Editor** de tu proyecto:

```sql
CREATE TABLE mapas (
  clave       TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  color_tema  TEXT NOT NULL DEFAULT '#00f0ff',
  width       INTEGER NOT NULL DEFAULT 800,
  height      INTEGER NOT NULL DEFAULT 800,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

Para sembrar datos iniciales desde el archivo `api/seed_data.json`:

```bash
python -m api.seed
```

---

## Despliegue en Producción

### Backend (ej. Render / Railway)

- **Build Command**: `pip install -r api/requirements.txt`
- **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- Variables de entorno: `SUPABASE_URL` y `SUPABASE_KEY`

### Frontend (ej. Vercel / Netlify)

```bash
cd client && pnpm run build
```

- **Output directory**: `client/dist`
- Variable de entorno: `VITE_API_URL=https://tu-api.render.com`
