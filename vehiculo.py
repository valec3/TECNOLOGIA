# -*- coding: utf-8 -*-
"""
AGENTE DE VEHÍCULO (AV) — Módulo del Sistema Multi-Agente de Tráfico
=====================================================================
Integración con: catastro.py, main.py (semáforos, intersecciones)

Cada vehículo:
  - Circula SOLO por las avenidas del catastro (no invade manzanas)
  - Obedece los semáforos de las intersecciones
  - Es controlable con teclado (2 coches, se alterna con TAB)
  - Actualiza shared_state para comunicación con otros agentes

Controles (coche activo):
  ↑ / W   → Acelerar
  ↓ / S   → Frenar / Reversa lenta
  ← / A   → Girar izquierda (solo en intersecciones o carriles)
  → / D   → Girar derecha  (solo en intersecciones o carriles)
  SPACE   → Freno de emergencia
  TAB     → Alternar entre AV-01 y AV-02
"""

import math


# ─── SHARED STATE (interfaz con otros agentes) ──────────────────────────────
# Los demás agentes pueden leer/escribir aquí
shared_state = {
    "vehiculos": {}
}


# ─── GEOMETRÍA DEL CATASTRO ─────────────────────────────────────────────────
SEMI_AV      = 40     # semiancho de avenida (±40 px desde el centro)
CARRIL_OFF   = 18     # offset del carril respecto al centro de la avenida
MARGEN_GIRO  = 38     # radio de zona de intersección donde se permite girar
FRENADO_SEM  = 55     # distancia a la que el coche frena ante semáforo rojo
EPS_VEL      = 0.03   # velocidad mínima para considerar que el vehículo se mueve


class CarrilVial:
    """
    Define un segmento de carril válido en el mapa.
    Cada carril tiene: orientación (H/V), coordenada fija, rango en la otra coord,
    sentido (+1 o -1), y y_carril/x_carril (posición perpendicular real).
    """
    def __init__(self, orient, coord_fija, rango_ini, rango_fin, sentido):
        self.orient     = orient       # "H" o "V"
        self.coord_fija = coord_fija   # y fijo si H, x fijo si V
        self.rango_ini  = rango_ini
        self.rango_fin  = rango_fin
        self.sentido    = sentido      # +1 o -1


def construir_carriles(catastro):
    """
    Genera todos los carriles válidos a partir del catastro.
    Cada avenida H tiene 2 carriles (arriba/abajo del centro).
    Cada avenida V tiene 2 carriles (izq/der del centro).
    """
    W = catastro.width
    H = catastro.height
    carriles = []

    for y_av in catastro.avenidas_horizontales:
        # Carril superior → va hacia la derecha (+x)
        carriles.append(CarrilVial("H", y_av - CARRIL_OFF, 0, W, +1))
        # Carril inferior → va hacia la izquierda (-x)
        carriles.append(CarrilVial("H", y_av + CARRIL_OFF, W, 0, -1))

    for x_av in catastro.avenidas_verticales:
        # Carril izquierdo → va hacia arriba (-y)
        carriles.append(CarrilVial("V", x_av - CARRIL_OFF, H, 0, -1))
        # Carril derecho  → va hacia abajo  (+y)
        carriles.append(CarrilVial("V", x_av + CARRIL_OFF, 0, H, +1))

    return carriles


def en_interseccion(x, y, catastro):
    """Devuelve True si (x,y) está dentro de una zona de intersección."""
    for av_h in catastro.avenidas_horizontales:
        for av_v in catastro.avenidas_verticales:
            dist = math.hypot(x - av_v, y - av_h)
            if dist < MARGEN_GIRO:
                return True, (av_v, av_h)
    return False, None


def carril_mas_cercano(x, y, orient_preferida, catastro):
    """Encuentra el carril más cercano de la orientación dada."""
    candidatos = []
    carriles = construir_carriles(catastro)
    for c in carriles:
        if c.orient == orient_preferida:
            if orient_preferida == "H":
                dist = abs(y - c.coord_fija)
            else:
                dist = abs(x - c.coord_fija)
            candidatos.append((dist, c))
    if not candidatos:
        return None
    candidatos.sort(key=lambda t: t[0])
    return candidatos[0][1]


# ════════════════════════════════════════════════════════════════════════════
#  CLASE PRINCIPAL: AgenteVehiculo
# ════════════════════════════════════════════════════════════════════════════
class AgenteVehiculo:
    """
    Agente que controla un vehículo en el plano vial del catastro.
    El vehículo siempre respeta las avenidas definidas por el catastro
    y obedece el estado de los semáforos del sistema.
    """

    # Física
    ACEL_MAX   = 2.2
    ACEL_PASO  = 0.15
    FRIC       = 0.08
    VEL_MAX    = 3.2
    VEL_REV    = 1.0
    ACEL_FREN  = 0.25

    def __init__(self, id_vehiculo, catastro, carril_inicial, pos_inicial,
                 color_carroceria, color_techo):
        self.id          = id_vehiculo
        self.catastro    = catastro
        self.carriles    = construir_carriles(catastro)

        # Carril actual
        self.carril_actual = carril_inicial

        # Posición sobre el carril
        if carril_inicial.orient == "H":
            self.x = float(pos_inicial)
            self.y = float(carril_inicial.coord_fija)
        else:
            self.x = float(carril_inicial.coord_fija)
            self.y = float(pos_inicial)

        # Ángulo visual (grados, 0=derecha, 90=abajo)
        self.angulo = self._angulo_carril(carril_inicial)

        # Velocidad escalar (positivo = hacia adelante en el sentido del carril)
        self.vel = 0.0

        # Estado
        self.activo     = True
        self.seleccionado = False    # True si es el coche que controla el usuario
        self.frenando   = False
        self.bloqueado_sem = False   # frenado por semáforo rojo

        # Giro pendiente
        self._quiere_girar_izq = False
        self._quiere_girar_der = False
        self._en_transicion    = False   # True mientras realiza el giro
        self._carril_destino   = None

        # Colores
        self.color_carroceria = color_carroceria
        self.color_techo      = color_techo

        # Estadísticas
        self.distancia_total = 0.0
        self.vel_max         = 0.0

        # Historial de rastro (posiciones recientes)
        self.historial = []
        self.MAX_HIST  = 45

        # Registrar en shared_state
        shared_state["vehiculos"][self.id] = {}
        self._sync()

    # ── helpers internos ────────────────────────────────────────────────────
    def _angulo_carril(self, carril):
        if carril.orient == "H":
            return 0.0 if carril.sentido == +1 else 180.0
        else:
            return 90.0 if carril.sentido == +1 else 270.0

    def _dentro_rango_carril(self, c, x, y):
        """True si (x,y) está dentro del rango lineal del carril c."""
        if c.orient == "H":
            lo, hi = min(c.rango_ini, c.rango_fin), max(c.rango_ini, c.rango_fin)
            return lo <= x <= hi
        else:
            lo, hi = min(c.rango_ini, c.rango_fin), max(c.rango_ini, c.rango_fin)
            return lo <= y <= hi

    def _sync(self):
        shared_state["vehiculos"][self.id] = {
            "x":          round(self.x, 1),
            "y":          round(self.y, 1),
            "angulo":     round(self.angulo % 360, 1),
            "velocidad":  round(self.vel, 3),
            "carril":     self.carril_actual.orient,
            "sentido":     self.carril_actual.sentido,
            "en_reversa":  self.vel < -EPS_VEL,
            "frenando":   self.frenando,
            "bloqueado":  self.bloqueado_sem,
            "seleccionado": self.seleccionado,
        }

    # ── señal de semáforo (llamado por main.py) ─────────────────────────────
    def recibir_semaforo(self, estado_sem):
        """
        El agente de semáforos (o main) llama este método para notificar
        el estado del semáforo más cercano en la dirección de avance.
        """
        if estado_sem == "ROJO":
            self.bloqueado_sem = True
        else:
            self.bloqueado_sem = False

    # ── input de teclado ─────────────────────────────────────────────────────
    def procesar_teclas(self, teclas_activas: set):
        """
        teclas_activas: conjunto de strings con las teclas presionadas,
        ej. {"Up", "w", "space"}. Así es fácil de llamar desde Tkinter.
        """
        if not self.seleccionado:
            return

        teclas_norm = {t.lower() for t in teclas_activas}

        # Aceleración
        if "up" in teclas_norm or "w" in teclas_norm:
            self.vel = min(self.vel + self.ACEL_PASO, self.ACEL_MAX)

        # Freno / reversa
        if "down" in teclas_norm or "s" in teclas_norm:
            if self.vel > 0:
                self.vel = max(0.0, self.vel - self.ACEL_FREN)
            else:
                self.vel = max(-self.VEL_REV, self.vel - self.ACEL_PASO)

        # Freno de emergencia
        if "space" in teclas_norm:
            self.vel *= 0.80

        # Giro — solo registrar la intención; se ejecuta en intersección
        if "left" in teclas_norm or "a" in teclas_norm:
            self._quiere_girar_izq = True
        if "right" in teclas_norm or "d" in teclas_norm:
            self._quiere_girar_der = True

    # ── lógica de semáforo: detectar si hay rojo adelante ───────────────────
    def _sentido_movimiento(self):
        """
        Devuelve el sentido real en el eje del carril.
        Si el vehículo retrocede, se mueve en sentido contrario al carril.
        """
        if self.vel < -EPS_VEL:
            return -self.carril_actual.sentido
        return self.carril_actual.sentido

    def _estado_semaforo_interseccion(self, semaforos, ix, iy, orient):
        """Obtiene el semáforo que regula una intersección para H o V."""
        for sem in semaforos:
            if sem.direccion_regulada != orient:
                continue
            if abs(sem.x - ix) <= FRENADO_SEM and abs(sem.y - iy) <= FRENADO_SEM:
                return sem.estado
        return None

    def _verificar_semaforo(self, semaforos):
        """
        Revisa si hay un semáforo en rojo en la dirección de avance
        dentro del radio de frenado.
        """
        c = self.carril_actual
        sentido_real = self._sentido_movimiento()

        for nodo in self.catastro.intersecciones:
            ix, iy = nodo["pos"]
            estado_sem = self._estado_semaforo_interseccion(semaforos, ix, iy, c.orient)
            if estado_sem is None:
                continue

            # Línea de pare antes de entrar al cruce, según la dirección real.
            if c.orient == "H":
                linea_pare = ix - sentido_real * SEMI_AV
                dist_adelante = (linea_pare - self.x) * sentido_real
                dist_lateral = abs(iy - self.y)
            else:
                linea_pare = iy - sentido_real * SEMI_AV
                dist_adelante = (linea_pare - self.y) * sentido_real
                dist_lateral = abs(ix - self.x)

            if 0 < dist_adelante < FRENADO_SEM and dist_lateral < SEMI_AV:
                if estado_sem == "ROJO":
                    self.bloqueado_sem = True
                    return
                elif estado_sem == "AMARILLO" and dist_adelante < FRENADO_SEM * 0.6:
                    self.bloqueado_sem = True
                    return
        self.bloqueado_sem = False

    # ── giro en intersección ─────────────────────────────────────────────────
    def _intentar_giro(self):
        """
        Si el coche está en intersección y hay intención de giro,
        cambia al carril perpendicular más cercano en la dirección correcta.
        """
        en_nodo, centro = en_interseccion(self.x, self.y, self.catastro)
        if not en_nodo:
            return

        c = self.carril_actual
        nueva_orient = "V" if c.orient == "H" else "H"

        # Determinar sentido del nuevo carril según dirección de giro relativa
        # Para girar a la izquierda/derecha mirando hacia el sentido actual:
        if self._quiere_girar_izq or self._quiere_girar_der:
            candidatos = []
            for carril in self.carriles:
                if carril.orient != nueva_orient:
                    continue
                if nueva_orient == "V":
                    dist = abs(carril.coord_fija - self.x)
                else:
                    dist = abs(carril.coord_fija - self.y)
                candidatos.append((dist, carril))

            candidatos.sort(key=lambda t: t[0])
            if not candidatos:
                return

            # Elegir el carril según izquierda o derecha
            # La lógica: girar izquierda = carril con sentido "hacia afuera" respecto a la trayectoria
            mejor = None
            for _, carril in candidatos:
                if self._quiere_girar_izq:
                    # Giro a la izquierda relativo al sentido actual
                    if c.orient == "H" and c.sentido == +1 and carril.sentido == -1:
                        mejor = carril; break
                    if c.orient == "H" and c.sentido == -1 and carril.sentido == +1:
                        mejor = carril; break
                    if c.orient == "V" and c.sentido == +1 and carril.sentido == +1:
                        mejor = carril; break
                    if c.orient == "V" and c.sentido == -1 and carril.sentido == -1:
                        mejor = carril; break
                if self._quiere_girar_der:
                    if c.orient == "H" and c.sentido == +1 and carril.sentido == +1:
                        mejor = carril; break
                    if c.orient == "H" and c.sentido == -1 and carril.sentido == -1:
                        mejor = carril; break
                    if c.orient == "V" and c.sentido == +1 and carril.sentido == -1:
                        mejor = carril; break
                    if c.orient == "V" and c.sentido == -1 and carril.sentido == +1:
                        mejor = carril; break

            if mejor is None and candidatos:
                mejor = candidatos[0][1]   # tomar el más cercano si no hay match exacto

            if mejor:
                self.carril_actual = mejor
                # Snap al carril
                if mejor.orient == "V":
                    self.x = float(mejor.coord_fija)
                else:
                    self.y = float(mejor.coord_fija)
                self.angulo = self._angulo_carril(mejor)
                if abs(self.vel) > EPS_VEL:
                    signo = 1 if self.vel > 0 else -1
                    self.vel = signo * max(0.3, abs(self.vel) * 0.7)

        self._quiere_girar_izq = False
        self._quiere_girar_der = False

    # ── actualizar física y posición ─────────────────────────────────────────
    def _frenar_hasta_cero(self, fuerza):
        """Reduce la velocidad manteniendo su signo hasta detener el vehículo."""
        if self.vel > 0:
            self.vel = max(0.0, self.vel - fuerza)
        elif self.vel < 0:
            self.vel = min(0.0, self.vel + fuerza)

    def actualizar(self, semaforos):
        # Verificar semáforo
        self._verificar_semaforo(semaforos)

        # Bloqueo por semáforo
        if self.bloqueado_sem and abs(self.vel) > EPS_VEL:
            self._frenar_hasta_cero(self.ACEL_FREN * 1.5)
            self.frenando = True
        else:
            self.frenando = self.bloqueado_sem

        # Fricción
        if self.vel > 0:
            self.vel = max(0.0, self.vel - self.FRIC)
        elif self.vel < 0:
            self.vel = min(0.0, self.vel + self.FRIC)

        # Limitar velocidad
        self.vel = max(-self.VEL_REV, min(self.VEL_MAX, self.vel))

        # Intentar giro si hay intención
        self._intentar_giro()

        # Mover sobre el carril actual
        c = self.carril_actual
        ds = self.vel * c.sentido   # desplazamiento real (con sentido)

        prev_x, prev_y = self.x, self.y
        if c.orient == "H":
            self.x += ds
            self.y = float(c.coord_fija)   # snap al carril
        else:
            self.y += ds
            self.x = float(c.coord_fija)   # snap al carril

        # Limitar a los bordes del mapa con rebote suave
        margen = 10
        if self.x < margen:
            self.x = margen; self.vel *= -0.3
        if self.x > self.catastro.width - margen:
            self.x = self.catastro.width - margen; self.vel *= -0.3
        if self.y < margen:
            self.y = margen; self.vel *= -0.3
        if self.y > self.catastro.height - margen:
            self.y = self.catastro.height - margen; self.vel *= -0.3

        # Ángulo visual suave
        angulo_objetivo = self._angulo_carril(c)
        diff = (angulo_objetivo - self.angulo + 180) % 360 - 180
        self.angulo += diff * 0.25   # interpolación

        # Estadísticas
        dist = math.hypot(self.x - prev_x, self.y - prev_y)
        self.distancia_total += dist
        self.vel_max = max(self.vel_max, abs(self.vel))

        # Historial de rastro
        self.historial.append((int(self.x), int(self.y)))
        if len(self.historial) > self.MAX_HIST:
            self.historial.pop(0)

        self._sync()

    # ── dibujo en canvas de Tkinter ──────────────────────────────────────────
    def dibujar(self, canvas, tick):
        """Dibuja el coche (y su rastro) en el canvas tkinter."""
        # Rastro de movimiento
        if len(self.historial) > 3:
            for i in range(1, len(self.historial)):
                # En Tkinter no hay alpha, simulamos con opacidad via color hex
                frac = i / len(self.historial)
                r_c  = int(frac * 80)
                g_c  = int(frac * 200)
                b_c  = int(frac * 120)
                color_rastro = f"#{r_c:02x}{g_c:02x}{b_c:02x}"
                x1, y1 = self.historial[i-1]
                x2, y2 = self.historial[i]
                canvas.create_line(x1, y1, x2, y2,
                                   fill=color_rastro,
                                   width=max(1, int(frac * 3)))

        # Dibujar el coche como polígono rotado
        self._dibujar_coche_poly(canvas, tick)

        # Etiqueta
        etiq_y = self.y - 28
        # Fondo de etiqueta
        sel_color = "#00e878" if self.seleccionado else "#888888"
        canvas.create_rectangle(
            self.x - 22, etiq_y - 7,
            self.x + 22, etiq_y + 7,
            fill="#0d1117", outline=sel_color, width=1
        )
        canvas.create_text(self.x, etiq_y, text=self.id,
                           fill=sel_color, font=("Courier New", 7, "bold"))
        # Conector
        canvas.create_line(self.x, etiq_y + 7, self.x, self.y - 14,
                           fill=sel_color, width=1)

    def _dibujar_coche_poly(self, canvas, tick):
        """Genera un polígono de coche rotado en el ángulo actual."""
        cx, cy  = self.x, self.y
        ang_rad = math.radians(self.angulo)

        # Dimensiones del coche (en px del canvas tkinter)
        W2 = 14   # mitad del largo
        H2 = 8    # mitad del ancho

        # Vértices del coche sin rotar (frente a la derecha)
        def rot(px, py):
            rx = px * math.cos(ang_rad) - py * math.sin(ang_rad)
            ry = px * math.sin(ang_rad) + py * math.cos(ang_rad)
            return (cx + rx, cy + ry)

        # Carrocería principal
        p = [rot(-W2, -H2), rot(W2, -H2), rot(W2, H2), rot(-W2, H2)]
        canvas.create_polygon(p, fill=self.color_carroceria, outline="#000000", width=1)

        # Techo
        tw2 = W2 * 0.55
        th2 = H2 * 0.65
        t = [rot(-tw2, -th2), rot(tw2 * 0.8, -th2),
             rot(tw2 * 0.8, th2), rot(-tw2, th2)]
        canvas.create_polygon(t, fill=self.color_techo, outline="")

        # Parabrisas (delantero)
        pb = [rot(tw2 * 0.35, -th2 + 1), rot(tw2 * 0.8, -th2 + 1),
              rot(tw2 * 0.8, th2 - 1),   rot(tw2 * 0.35, th2 - 1)]
        canvas.create_polygon(pb, fill="#96d4e8", outline="")

        # Faros delanteros (amarillo)
        f1 = rot(W2, -H2 + 2)
        f2 = rot(W2,  H2 - 2)
        r_faro = 2
        for fx, fy in [f1, f2]:
            canvas.create_oval(fx - r_faro, fy - r_faro,
                               fx + r_faro, fy + r_faro,
                               fill="#ffee44", outline="")

        # Luces traseras (rojo)
        t1 = rot(-W2, -H2 + 2)
        t2 = rot(-W2,  H2 - 2)
        for tx_, ty_ in [t1, t2]:
            canvas.create_oval(tx_ - 2, ty_ - 2, tx_ + 2, ty_ + 2,
                               fill="#ff2244", outline="")

        # Ruedas
        ruedas_rel = [(-W2 + 4, -H2), (-W2 + 4, H2),
                      ( W2 - 4, -H2), ( W2 - 4, H2)]
        for rx_, ry_ in ruedas_rel:
            wx, wy = rot(rx_, ry_)
            canvas.create_oval(wx - 3, wy - 3, wx + 3, wy + 3,
                               fill="#1a1a1a", outline="#555555")

        # Borde de selección (brilla si está activo)
        if self.seleccionado:
            parpadeo = (tick // 15) % 2 == 0
            col_sel  = "#00ff99" if parpadeo else "#00cc77"
            canvas.create_polygon(p, fill="", outline=col_sel, width=2)

        # Indicador de frenado
        if self.frenando or self.bloqueado_sem:
            for tx_, ty_ in [t1, t2]:
                canvas.create_oval(tx_ - 3, ty_ - 3, tx_ + 3, ty_ + 3,
                                   fill="#ff0000", outline="#ff6666", width=1)
