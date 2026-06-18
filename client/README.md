# Client — Editor de Mapas Catastrales

Frontend del administrador de mapas catastrales. Editor visual interactivo para diseñar calles, avenidas, curvas viales y cuadras sobre un lienzo SVG, con conexión a la API REST del backend.

---

## Stack

- **React 19** — UI declarativa con hooks
- **Vite 8** — bundler ultrarrápido con HMR
- **Tailwind CSS v4** — estilos utilitarios
- **Lucide React** — iconografía

---

## Estructura

```
client/
├── src/
│   ├── App.jsx                    ← Estado global y orquestación de la app
│   ├── api.js                     ← Cliente fetch para /api/mapas
│   ├── geometryHelper.js          ← Utilidades de geometría catastral
│   └── components/
│       ├── CanvasEditor.jsx       ← Lienzo SVG interactivo con drag & drop
│       ├── MapHeader.jsx          ← Barra superior con título y acciones
│       ├── PropertiesPanel.jsx    ← Panel lateral de propiedades y herramientas
│       └── Sidebar.jsx            ← Lista de mapas guardados
├── index.html
└── vite.config.js                 ← Proxy /api → http://localhost:8000
```

---

## Instalación

```bash
pnpm install
```

---

## Desarrollo Local

```bash
pnpm run dev
```

El cliente queda disponible en `http://localhost:5173`.

> En desarrollo, todas las peticiones a `/api/*` se redirigen automáticamente al backend en `http://localhost:8000` mediante el proxy configurado en `vite.config.js`. No se necesita CORS ni configuración adicional en local.

---

## Variables de Entorno (Opcional)

Solo necesitás configurar esto si el backend está en un servidor diferente al del frontend (producción desacoplada):

```env
# .env.local
VITE_API_URL=https://tu-api.render.com
```

Si no se configura, el cliente asume que la API corre en el mismo host (ideal para producción en un solo dominio o en desarrollo con el proxy de Vite).

---

## Acceso a la Documentación de la API

Con la API corriendo, hacé click en el botón **Docs API** en la barra superior del editor, o entrá directamente a:

```
http://localhost:5173/api/docs
```

Esta ruta pasa por el proxy de Vite al backend y abre la documentación interactiva de Swagger.

---

## Características del Editor Visual

| Herramienta | Descripción |
|-------------|-------------|
| **Seleccionar** | Hacé click y arrastrá cualquier elemento del mapa |
| **+ Calle Y** | Añade una avenida horizontal (click sobre el lienzo) |
| **+ Calle X** | Añade una avenida vertical (click sobre el lienzo) |
| **+ Cuadra** | Coloca un bloque de tierra de 130×130 px |
| **+ Curva** | Coloca una curva vial con radio de 150 px y arco de 90° |
| **Delete/Backspace** | Elimina el elemento seleccionado |

Todos los elementos soportan **drag & drop** con snapping automático a grilla de 10 px.

---

## Build de Producción

```bash
pnpm run build
```

El output queda en `client/dist/`. Podés desplegarlo en cualquier hosting estático (Vercel, Netlify, etc.).

---

## Despliegue (ej. Vercel)

1. Configurá el **Output Directory** como `client/dist`
2. Configurá el **Root Directory** como `client`
3. Agregá la variable `VITE_API_URL=https://tu-api.render.com` en el panel de Environment Variables
