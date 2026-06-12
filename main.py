# -*- coding: utf-8 -*-
"""
SISTEMA MULTI-AGENTE DE TRÁFICO URBANO — main.py
=================================================
Módulos integrados:
  ✔ Catastro      → geometría del plano vial
  ✔ Semáforo      → control de fases (VERDE/AMARILLO/ROJO)
  ✔ Vehículo      → AV-01 (rojo) y AV-02 (azul), controlables con teclado

CONTROLES:
  ↑ / W      Acelerar
  ↓ / S      Frenar / Reversa lenta
  ← / A      Girar a la izquierda en la próxima intersección
  → / D      Girar a la derecha en la próxima intersección
  ESPACIO    Freno de emergencia
  TAB        Alternar entre AV-01 y AV-02
  ESC        Salir
"""

import tkinter as tk
import time

from catastro import Catastro
from vehiculo  import AgenteVehiculo, construir_carriles, shared_state


# ════════════════════════════════════════════════════════════════════════════
#  AGENTE SEMÁFORO (definido aquí para mantener compatibilidad con main.py
#  original; en el sistema completo vendría de semaforo.py)
# ════════════════════════════════════════════════════════════════════════════
class Semaforo:
    def __init__(self, id_semaforo, posicion, direccion_regulada, estado_inicial):
        self.id                  = id_semaforo
        self.x, self.y           = posicion
        self.direccion_regulada  = direccion_regulada
        self.estado              = estado_inicial
        self.tiempos_fase        = {"VERDE": 5.0, "AMARILLO": 2.0, "ROJO": 7.0}
        self.tiempo_acumulado    = 0.0

    def actualizar(self, delta_time):
        self.tiempo_acumulado += delta_time
        limite = self.tiempos_fase[self.estado]
        if self.tiempo_acumulado >= limite:
            self.tiempo_acumulado = 0.0
            if self.estado   == "VERDE":    self.estado = "AMARILLO"
            elif self.estado == "AMARILLO": self.estado = "ROJO"
            elif self.estado == "ROJO":     self.estado = "VERDE"


# ════════════════════════════════════════════════════════════════════════════
#  PANEL HUD (información de los vehículos en pantalla)
# ════════════════════════════════════════════════════════════════════════════
class PanelHUD:
    """Dibuja el panel de telemetría lateral para los dos vehículos."""

    PX   = 610   # x de inicio del panel
    PY   = 30    # y de inicio
    PW   = 175   # ancho
    PH   = 340   # alto

    # Constantes visuales
    BG   = "#0d1117"
    BORD = "#00f0ff"
    VERD = "#00e878"
    CYAN = "#00ccff"
    GRIS = "#556070"
    BLAN = "#d0dce8"
    ROJO = "#ff3355"
    AMAR = "#ffd040"

    def dibujar(self, canvas, vehiculos, tick):
        # Fondo
        canvas.create_rectangle(
            self.PX - 4, self.PY - 4,
            self.PX + self.PW + 4, self.PY + self.PH + 4,
            fill=self.BG, outline=self.BORD, width=1
        )
        canvas.create_text(
            self.PX + self.PW // 2, self.PY + 10,
            text="══ AGENTES VEHÍCULO ══",
            fill=self.CYAN, font=("Courier New", 8, "bold")
        )
        canvas.create_text(
            self.PX + self.PW // 2, self.PY + 22,
            text="Sistema MAS — Módulo AV",
            fill=self.GRIS, font=("Courier New", 7)
        )

        # Separador
        canvas.create_line(
            self.PX, self.PY + 30,
            self.PX + self.PW, self.PY + 30,
            fill=self.BORD, dash=(3, 4)
        )

        y0 = self.PY + 38
        for veh in vehiculos:
            y0 = self._bloque_vehiculo(canvas, veh, y0, tick)
            y0 += 6

        # Controles
        y0 += 4
        canvas.create_line(self.PX, y0, self.PX + self.PW, y0,
                           fill=self.BORD, dash=(2, 5))
        y0 += 6
        canvas.create_text(self.PX + 6, y0, text="CONTROLES",
                           fill=self.GRIS, font=("Courier New", 7, "bold"), anchor="w")
        y0 += 12
        controles = [
            ("↑/W", "Acelerar"),
            ("↓/S", "Frenar"),
            ("←/→", "Girar en nodo"),
            ("SPC", "Freno emerg."),
            ("TAB", "Cambiar coche"),
        ]
        for k, v in controles:
            canvas.create_text(self.PX + 6, y0,
                               text=f"{k:<5} {v}",
                               fill=self.GRIS, font=("Courier New", 7), anchor="w")
            y0 += 11

    def _bloque_vehiculo(self, canvas, veh, y0, tick):
        """Dibuja el bloque de telemetría de un vehículo."""
        sel_color = self.VERD if veh.seleccionado else self.GRIS
        px = self.PX + 8

        # ID + indicador de selección
        cuad = "▶" if veh.seleccionado else "·"
        canvas.create_text(px, y0, text=f"{cuad} {veh.id}",
                           fill=sel_color, font=("Courier New", 9, "bold"), anchor="w")
        # Círculo de color del coche
        canvas.create_oval(
            self.PX + self.PW - 18, y0 - 5,
            self.PX + self.PW - 8,  y0 + 5,
            fill=veh.color_carroceria, outline=""
        )
        y0 += 14

        # Velocidad
        vel_kmh = abs(veh.vel) * 30.0
        barra_w = self.PW - 16
        llena   = int(barra_w * min(abs(veh.vel) / 3.2, 1.0))
        col_vel = self.VERD if vel_kmh < 60 else (self.AMAR if vel_kmh < 90 else self.ROJO)

        canvas.create_text(px, y0, text=f"VEL: {vel_kmh:5.1f} km/h",
                           fill=self.BLAN, font=("Courier New", 8), anchor="w")
        y0 += 11
        canvas.create_rectangle(px, y0, px + barra_w, y0 + 5,
                                 fill="#1a2030", outline="#334455")
        if llena > 0:
            canvas.create_rectangle(px, y0, px + llena, y0 + 5,
                                     fill=col_vel, outline="")
        y0 += 9

        # Posición
        canvas.create_text(px, y0, text=f"X:{veh.x:6.1f} Y:{veh.y:6.1f}",
                           fill=self.GRIS, font=("Courier New", 7), anchor="w")
        y0 += 11

        # Dirección
        ang = veh.angulo % 360
        dirs = ["→ E", "↘SE", "↓ S", "↙SO", "← O", "↖NO", "↑ N", "↗NE"]
        d_idx = int((ang + 22.5) / 45) % 8
        orient_txt = veh.carril_actual.orient
        canvas.create_text(px, y0, text=f"Dir: {dirs[d_idx]}  Carril:{orient_txt}",
                           fill=self.GRIS, font=("Courier New", 7), anchor="w")
        y0 += 11

        # Estado
        if veh.bloqueado_sem:
            estado_txt = "■ SEMÁFORO ROJO"
            estado_col = self.ROJO
        elif veh.frenando:
            estado_txt = "▌ FRENANDO"
            estado_col = self.AMAR
        elif abs(veh.vel) < 0.05:
            estado_txt = "● DETENIDO"
            estado_col = self.GRIS
        else:
            mv = "◄ REV" if veh.vel < 0 else "► AVANCE"
            estado_txt = mv
            estado_col = self.VERD
        canvas.create_text(px, y0, text=estado_txt,
                           fill=estado_col, font=("Courier New", 7, "bold"), anchor="w")
        y0 += 11

        # Semáforo detectado
        sem_estado = "VERDE"
        if veh.bloqueado_sem:
            sem_estado = "ROJO"
        col_sem = {"VERDE": "#39ff14", "AMARILLO": "#ffcc00", "ROJO": "#ff0055"}
        canvas.create_oval(px, y0 - 4, px + 8, y0 + 4,
                           fill=col_sem.get(sem_estado, "#333"), outline="")
        canvas.create_text(px + 12, y0, text=f"SEM: {sem_estado}",
                           fill=self.GRIS, font=("Courier New", 7), anchor="w")
        y0 += 12

        # Distancia
        dist_m = veh.distancia_total
        canvas.create_text(px, y0, text=f"Dist: {dist_m:.0f} m",
                           fill=self.GRIS, font=("Courier New", 7), anchor="w")
        y0 += 11

        return y0


# ════════════════════════════════════════════════════════════════════════════
#  APLICACIÓN PRINCIPAL
# ════════════════════════════════════════════════════════════════════════════
class PlanoVialApp:
    def __init__(self, root):
        self.root    = root
        self.catastro = Catastro()
        self.tick    = 0

        # ── Ventana ──────────────────────────────────────────────────────────
        self.root.title("Plano Metropolitano de Tránsito — Sistema MAS (Catastro + Semáforos + Vehículos)")
        self.root.geometry(f"{self.catastro.width}x{self.catastro.height}")
        self.root.configure(bg="#0d0d0f")
        self.root.resizable(False, False)

        self.canvas = tk.Canvas(
            self.root,
            width=self.catastro.width, height=self.catastro.height,
            bg="#121214", highlightthickness=0
        )
        self.canvas.pack(fill="both", expand=True)

        # ── Semáforos ────────────────────────────────────────────────────────
        self.semaforos = []
        self._inicializar_semaforos()

        # ── Vehículos ────────────────────────────────────────────────────────
        self.vehiculos  = []
        self.veh_activo = 0    # índice del vehículo seleccionado
        self._inicializar_vehiculos()

        # ── Teclado ──────────────────────────────────────────────────────────
        self.teclas_activas = set()
        self.root.bind("<KeyPress>",   self._on_key_press)
        self.root.bind("<KeyRelease>", self._on_key_release)
        self.root.focus_set()

        # ── HUD ──────────────────────────────────────────────────────────────
        self.hud = PanelHUD()

        # ── Tiempo ───────────────────────────────────────────────────────────
        self.last_time = time.time()
        self.root.after(16, self.tick_loop)   # ~60 fps

    # ── inicialización ───────────────────────────────────────────────────────
    def _inicializar_semaforos(self):
        for nodo in self.catastro.intersecciones:
            ix, iy = nodo["pos"]
            self.semaforos.extend([
                Semaforo(f"SEM_{ix}_{iy}_H", (ix - 50, iy), "H", "VERDE"),
                Semaforo(f"SEM_{ix}_{iy}_V", (ix,      iy - 50), "V", "ROJO"),
            ])

    def _inicializar_vehiculos(self):
        carriles = construir_carriles(self.catastro)

        # AV-01 — Rojo — carril horizontal superior de la avenida y=250, sentido +1 (→)
        carril_av01 = next(c for c in carriles
                           if c.orient == "H" and c.sentido == +1
                           and abs(c.coord_fija - (250 - 18)) < 5)
        av01 = AgenteVehiculo(
            id_vehiculo       = "AV-01",
            catastro          = self.catastro,
            carril_inicial    = carril_av01,
            pos_inicial       = 80,            # x inicial
            color_carroceria  = "#dd2233",
            color_techo       = "#991122",
        )
        av01.seleccionado = True

        # AV-02 — Azul — carril vertical derecho de la avenida x=550, sentido +1 (↓)
        carril_av02 = next(c for c in carriles
                           if c.orient == "V" and c.sentido == +1
                           and abs(c.coord_fija - (550 + 18)) < 5)
        av02 = AgenteVehiculo(
            id_vehiculo       = "AV-02",
            catastro          = self.catastro,
            carril_inicial    = carril_av02,
            pos_inicial       = 80,            # y inicial
            color_carroceria  = "#2255cc",
            color_techo       = "#113388",
        )
        av02.seleccionado = False

        self.vehiculos = [av01, av02]

    # ── eventos de teclado ───────────────────────────────────────────────────
    def _on_key_press(self, event):
        key = event.keysym
        self.teclas_activas.add(key)

        if key == "Escape":
            self.root.destroy()
            return

        if key == "Tab":
            # Alternar vehículo activo
            self.vehiculos[self.veh_activo].seleccionado = False
            self.veh_activo = (self.veh_activo + 1) % len(self.vehiculos)
            self.vehiculos[self.veh_activo].seleccionado = True
            # Evitar que Tab cambie el foco de tkinter
            return "break"

    def _on_key_release(self, event):
        self.teclas_activas.discard(event.keysym)

    # ── renderizado ──────────────────────────────────────────────────────────
    def renderizar(self):
        self.canvas.delete("all")

        # ── Avenidas horizontales ────────────────────────────────────────────
        for y in self.catastro.avenidas_horizontales:
            self.canvas.create_rectangle(
                0, y - 40, self.catastro.width, y + 40,
                fill="#1e1e24", outline=""
            )
            self.canvas.create_line(
                0, y, self.catastro.width, y,
                fill="#ffcc00", width=2, dash=(12, 8)
            )
            # Líneas de carril
            self.canvas.create_line(
                0, y - 18, self.catastro.width, y - 18,
                fill="#334455", width=1, dash=(8, 12)
            )
            self.canvas.create_line(
                0, y + 18, self.catastro.width, y + 18,
                fill="#334455", width=1, dash=(8, 12)
            )
            # Flechas de sentido
            for x in [80, 340, 640]:
                self.canvas.create_text(x, y - 22, text="→", fill="#445566",
                                        font=("Arial", 11, "bold"))
            for x in [80, 340, 640]:
                self.canvas.create_text(x, y + 22, text="←", fill="#445566",
                                        font=("Arial", 11, "bold"))

        # ── Avenidas verticales ──────────────────────────────────────────────
        for x in self.catastro.avenidas_verticales:
            self.canvas.create_rectangle(
                x - 40, 0, x + 40, self.catastro.height,
                fill="#1e1e24", outline=""
            )
            self.canvas.create_line(
                x, 0, x, self.catastro.height,
                fill="#ffcc00", width=2, dash=(12, 8)
            )
            # Líneas de carril
            self.canvas.create_line(
                x - 18, 0, x - 18, self.catastro.height,
                fill="#334455", width=1, dash=(8, 12)
            )
            self.canvas.create_line(
                x + 18, 0, x + 18, self.catastro.height,
                fill="#334455", width=1, dash=(8, 12)
            )
            # Flechas
            for y in [80, 340, 640]:
                self.canvas.create_text(x - 22, y, text="↑", fill="#445566",
                                        font=("Arial", 11, "bold"))
            for y in [80, 340, 640]:
                self.canvas.create_text(x + 22, y, text="↓", fill="#445566",
                                        font=("Arial", 11, "bold"))

        # ── Intersecciones ───────────────────────────────────────────────────
        for nodo in self.catastro.intersecciones:
            ix, iy = nodo["pos"]
            # Zona de cruce
            self.canvas.create_rectangle(
                ix - 40, iy - 40, ix + 40, iy + 40,
                fill="#25252d", outline=""
            )
            # Cruce peatonal (zebra)
            for s in range(-36, 36, 9):
                self.canvas.create_rectangle(
                    ix - 40, iy + s, ix + 40, iy + s + 5,
                    fill="#1a1a22", outline=""
                )
            self.canvas.create_rectangle(
                ix - 40, iy - 40, ix + 40, iy + 40,
                outline="#00f0ff", width=1, dash=(2, 4)
            )
            self.canvas.create_text(
                ix, iy, text=nodo["nombre"],
                fill="#00f0ff", font=("Courier New", 8, "bold"), justify="center"
            )

        # ── Semáforos ────────────────────────────────────────────────────────
        COLOR_SEM = {
            "VERDE":    "#39ff14",
            "AMARILLO": "#ffcc00",
            "ROJO":     "#ff0055",
        }
        for sem in self.semaforos:
            col = COLOR_SEM[sem.estado]
            # Poste
            self.canvas.create_rectangle(
                sem.x - 2, sem.y - 2, sem.x + 2, sem.y + 14,
                fill="#333333", outline=""
            )
            # Carcasa
            self.canvas.create_oval(
                sem.x - 9, sem.y - 9, sem.x + 9, sem.y + 9,
                fill="#121214", outline="#33333b", width=2
            )
            # Halo de luz
            self.canvas.create_oval(
                sem.x - 11, sem.y - 11, sem.x + 11, sem.y + 11,
                fill="", outline=col, width=1
            )
            # Luz
            self.canvas.create_oval(
                sem.x - 6, sem.y - 6, sem.x + 6, sem.y + 6,
                fill=col, outline=""
            )
            # ID pequeño
            self.canvas.create_text(
                sem.x, sem.y + 14,
                text=sem.id.split("_")[-1],
                fill="#556677", font=("Courier New", 6)
            )

        # ── Rastros y vehículos ──────────────────────────────────────────────
        for veh in self.vehiculos:
            veh.dibujar(self.canvas, self.tick)

        # ── Nombres de avenidas ──────────────────────────────────────────────
        self.canvas.create_text(
            108, 202, text="AV. DEL LIBERTADOR (BI)",
            fill="#718096", font=("Courier New", 8, "bold"), anchor="w"
        )
        self.canvas.create_text(
            108, 502, text="AV. DE MAYO (BI)",
            fill="#718096", font=("Courier New", 8, "bold"), anchor="w"
        )
        self.canvas.create_text(
            178, 30, text="AV. 9 DE JULIO (BI)",
            fill="#718096", font=("Courier New", 8, "bold"), anchor="e"
        )
        self.canvas.create_text(
            628, 30, text="AV. RIVADAVIA (BI)",
            fill="#718096", font=("Courier New", 8, "bold"), anchor="w"
        )

        # ── Escala ───────────────────────────────────────────────────────────
        for val in range(100, self.catastro.width, 100):
            self.canvas.create_text(
                val, 12, text=f"{val}m",
                fill="#00f0ff", font=("Courier New", 7)
            )
            self.canvas.create_line(val, 0, val, 5, fill="#00f0ff", width=1)
        for val in range(100, self.catastro.height, 100):
            self.canvas.create_text(
                14, val, text=f"{val}m",
                fill="#00f0ff", font=("Courier New", 7)
            )
            self.canvas.create_line(0, val, 5, val, fill="#00f0ff", width=1)

        # ── Leyenda ──────────────────────────────────────────────────────────
        self.canvas.create_rectangle(
            20, 728, 250, 790,
            fill="#0d0d0f", outline="#00f0ff", width=1
        )
        self.canvas.create_text(
            30, 742, text="PLANO VIAL — SISTEMA MAS",
            fill="#00f0ff", font=("Courier New", 9, "bold"), anchor="w"
        )
        self.canvas.create_text(
            30, 757, text="Catastro + Semáforos + Agentes Vehículo",
            fill="#718096", font=("Courier New", 7), anchor="w"
        )
        veh_sel = self.vehiculos[self.veh_activo]
        self.canvas.create_text(
            30, 770, text=f"Activo: {veh_sel.id}  |  TAB para cambiar",
            fill="#00e878", font=("Courier New", 7), anchor="w"
        )
        self.canvas.create_text(
            30, 782, text="Escala Estática 1:1000",
            fill="#556677", font=("Courier New", 7), anchor="w"
        )

        # ── HUD de vehículos ─────────────────────────────────────────────────
        self.hud.dibujar(self.canvas, self.vehiculos, self.tick)

    # ── bucle principal ──────────────────────────────────────────────────────
    def tick_loop(self):
        now        = time.time()
        delta_time = min(now - self.last_time, 0.05)   # cap a 50ms
        self.last_time = now

        # Actualizar semáforos
        for sem in self.semaforos:
            sem.actualizar(delta_time)

        # Procesar teclas y actualizar vehículos
        for i, veh in enumerate(self.vehiculos):
            if veh.seleccionado:
                veh.procesar_teclas(self.teclas_activas)
            veh.actualizar(self.semaforos)

        # Renderizar
        self.renderizar()

        self.tick += 1
        self.root.after(16, self.tick_loop)


# ════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    root = tk.Tk()
    app  = PlanoVialApp(root)
    root.mainloop()