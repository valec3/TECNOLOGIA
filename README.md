# Plano Metropolitano de Tránsito - Catastro MAS

Este proyecto consiste en una aplicación de visualización gráfica en Python utilizando la biblioteca estándar **Tkinter**. Permite representar el plano catastral físico de una red vial urbana con avenidas, sentidos de carriles, rejillas métricas e infraestructura semafórica dinámica.

---

## 🗺️ Componentes del Plano Vial

El diseño visual está implementado de forma 100% independiente en [main.py](file:///c:/Users/User/Development/unap/tecnologias-emergentes/tecnologias-emergentes/main.py) bajo una estética de modo oscuro y neón técnico, ideal para simulaciones de radar o catastro:

1. **Avenidas Horizontales y Verticales**:
   - Representadas por pistas oscuras de 80px de ancho con líneas divisorias centrales amarillas discontinuas.
   - Rotuladas con sus nombres oficiales y tipología bidireccional:
     - *Av. del Libertador (BI)* e *Av. de Mayo (BI)* (Horizontales)
     - *Av. 9 de Julio (BI)* e *Av. Rivadavia (BI)* (Verticales)
2. **Sentidos de Circulación**:
   - Cada carril dispone de indicadores de dirección (`←`, `→`, `↑`, `↓`) dibujados directamente sobre la calzada para señalizar visualmente el flujo vial permitido.
3. **Nodos de Intersección**:
   - Cruces con rejillas de neón celeste (`#00f0ff`) identificados con su nombre y plaza asociada en el centro:
     - **NODO NO (San Martín)**
     - **NODO NE (Belgrano)**
     - **NODO SO (Sarmiento)**
     - **NODO SE (Mitre)**
4. **Semáforos Dinámicos**:
   - Cada intersección cuenta con dos semáforos (uno para regular el flujo horizontal y otro para el vertical).
   - Los semáforos ciclan de manera autónoma sus colores de fase (Verde $\rightarrow$ Amarillo $\rightarrow$ Rojo) mediante un temporizador programado con `root.after()`.
   - Cuentan con un desfase inicial para asegurar la seguridad vial teórica de los cruces (cuando el horizontal está en verde, el vertical está en rojo).

---

## 🛠️ Ejecución de la Aplicación

Dado que el proyecto ha sido simplificado y se removieron todas las dependencias y módulos externos de simulación de tráfico, **el plano es completamente autocontenido en un solo script**.

Para ejecutar la visualización en Windows:
```bash
python main.py
```
*(No requiere la instalación de librerías de terceros ya que utiliza Tkinter, que forma parte de la biblioteca estándar de Python).*
