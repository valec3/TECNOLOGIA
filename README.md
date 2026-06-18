# Catastro Metropolitano - Administrador de Mapas

Este proyecto es una aplicación web moderna para la gestión y visualización de planos catastrales y redes viales urbanas. Cuenta con una API REST robusta construida en **FastAPI**, persistencia en la nube utilizando **Supabase** y una interfaz interactiva de alto rendimiento en **HTML5 Canvas**.

---

## 🚀 Arquitectura del Proyecto

El repositorio está organizado de manera modular:

*   **`api/`**: Contiene la lógica del backend en FastAPI, validaciones con Pydantic y cliente de Supabase.
*   **`ui/`**: Interfaz de usuario (frontend) interactiva construida con HTML5, CSS3 (con estética premium neón/glassmorphic) y JS vanilla.
*   **`seed.py`**: Script de automatización para migrar configuraciones locales de mapas hacia Supabase.

---

## 🛠️ Configuración y Puesta en Marcha

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Supabase:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
```

### 2. Base de Datos
Crea la tabla ejecutando esta sentencia en el **SQL Editor** de tu consola de Supabase:
```sql
create table mapas (
  clave text primary key,
  nombre text not null,
  color_tema text not null default '#00f0ff',
  width integer not null default 800,
  height integer not null default 800,
  config jsonb not null default '{}'::jsonb
);
```

### 3. Migrar Datos Iniciales
Si deseas importar los mapas base al servidor de base de datos, ejecuta:
```bash
python seed.py
```

### 4. Ejecución Local
Inicia el servidor local de desarrollo:
```bash
python -m api.main
```
Accede a la aplicación en tu navegador: **[http://localhost:8000](http://localhost:8000)**.

---

## ☁️ Deploy en Render

Para desplegar este proyecto en Render:

1.  Crea un nuevo **Web Service**.
2.  Conecta tu repositorio de GitHub.
3.  Usa los siguientes parámetros de configuración:
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
4.  Agrega las variables de entorno (`SUPABASE_URL` y `SUPABASE_KEY`) en la sección **Environment** del panel de Render.
