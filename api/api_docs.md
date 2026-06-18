# Documentación de la API: Catastro Metropolitano

Esta API REST está construida con **FastAPI** y utiliza **Supabase** como persistencia.

---

## 🛠️ Endpoints Disponibles

Todos los endpoints interactúan con la tabla `mapas` en Supabase.

### 1. Listar todos los mapas
Devuelve una lista con todos los distritos catastrales registrados.

*   **Método:** `GET`
*   **Ruta:** `/api/mapas`
*   **Respuesta Exitosa (200 OK):**
    ```json
    [
      {
        "clave": "centro",
        "nombre": "CENTRO METROPOLITANO",
        "color_tema": "#00f0ff",
        "width": 800,
        "height": 800,
        "config": {
          "avenidas_horizontales": [{"y": 250, "x_ini": 0, "x_fin": 800}, {"y": 550, "x_ini": 0, "x_fin": 800}],
          "avenidas_verticales": [{"x": 250, "y_ini": 0, "y_fin": 800}, {"x": 550, "y_ini": 0, "y_fin": 800}],
          "curvas": [],
          "nombres_avenidas": {"H1": "AV. DEL LIBERTADOR", "H2": "AV. DE MAYO", "V1": "AV. 9 DE JULIO", "V2": "AV. RIVADAVIA"},
          "intersecciones": [{"pos": [250, 250], "nombre": "NODO NO"}, {"pos": [550, 550], "nombre": "NODO SE"}],
          "casas_config": {"rango_x": [[40, 170]], "rango_y": [[40, 170]]}
        }
      }
    ]
    ```

---

### 2. Obtener un mapa por clave
Devuelve la información geométrica detallada de un distrito específico.

*   **Método:** `GET`
*   **Ruta:** `/api/mapas/{clave}`
*   **Parámetros:** 
    *   `clave` (en la URL, ej: `/api/mapas/centro`)
*   **Errores posibles:**
    *   `404 Not Found` si la clave no existe en la base de datos.

---

### 3. Crear un nuevo mapa
Inserta un distrito catastral en la base de datos.

*   **Método:** `POST`
*   **Ruta:** `/api/mapas`
*   **Cuerpo de la Petición (JSON):**
    ```json
    {
      "clave": "sur",
      "nombre": "PUERTO INDUSTRIAL",
      "color_tema": "#ff0055",
      "width": 800,
      "height": 800,
      "config": {
        "avenidas_horizontales": [{"y": 250}],
        "avenidas_verticales": [{"x": 250}],
        "curvas": [],
        "nombres_avenidas": {"H1": "Av. Industrial", "V1": "Av. del Puerto"},
        "intersecciones": [],
        "casas_config": {}
      }
    }
    ```
*   **Errores posibles:**
    *   `400 Bad Request` si el mapa con esa clave ya existe.

---

### 4. Actualizar un mapa
Modifica los datos de un distrito existente de forma parcial (solo los campos enviados).

*   **Método:** `PUT`
*   **Ruta:** `/api/mapas/{clave}`
*   **Cuerpo de la Petición (JSON):**
    ```json
    {
      "nombre": "PUERTO INDUSTRIAL EDITADO",
      "color_tema": "#ff5500"
    }
    ```
*   **Errores posibles:**
    *   `404 Not Found` si el mapa a actualizar no existe.

---

### 5. Eliminar un mapa
Remueve el mapa de la base de datos.

*   **Método:** `DELETE`
*   **Ruta:** `/api/mapas/{clave}`
*   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "ok": true,
      "detail": "Mapa 'sur' eliminado exitosamente."
    }
    ```

---

## 🔍 Documentación Interactiva (Swagger UI)

Cuando levantas el proyecto localmente, podés ver e interactuar con la documentación en:
*   **Swagger UI:** `http://localhost:8000/docs`
*   **ReDoc:** `http://localhost:8000/redoc`
