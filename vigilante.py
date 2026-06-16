# -*- coding: utf-8 -*-
import math

VEL_LIMITE_KMH = 60.0
VEL_EXCESO_KMH = 90.0
MAX_ALERTAS    = 5
COOLDOWN_TICKS = 100
MARGEN_NODO    = 42

INF_SEMAFORO  = "SEMAFORO ROJO"
INF_VELOCIDAD = "EXCESO VEL."
INF_GRAVE     = "VEL. GRAVE"
INF_REVERSA   = "CONTRAMANO"


class Alerta:
    VIDA_TICKS = 200

    def __init__(self, id_vehiculo, tipo, descripcion, tick):
        self.id_vehiculo = id_vehiculo
        self.tipo        = tipo
        self.descripcion = descripcion
        self.tick        = tick

    def activa(self, tick_actual):
        return (tick_actual - self.tick) < self.VIDA_TICKS


class AgenteVigilante:
    PX = 610
    PY = 382
    PW = 175
    PH = 328

    BG   = "#0d1117"
    BORD = "#ff3355"
    ROJO = "#ff3355"
    AMAR = "#ffd040"
    VERD = "#00e878"
    CYAN = "#00ccff"
    GRIS = "#556070"
    BLAN = "#d0dce8"
    NARN = "#ff7722"

    def __init__(self):
        self.alertas   = []
        self.historial = []
        self.conteo    = {}
        self._cooldown = {}

    def actualizar(self, vehiculos, semaforos, catastro, tick):
        self.alertas = [a for a in self.alertas if a.activa(tick)]
        for veh in vehiculos:
            self._revisar_velocidad(veh, tick)
            self._revisar_semaforo(veh, semaforos, catastro, tick)
            self._revisar_contramano(veh, tick)

    def _en_cooldown(self, id_veh, tipo, tick):
        return (tick - self._cooldown.get((id_veh, tipo), -9999)) < COOLDOWN_TICKS

    def _registrar(self, id_veh, tipo, descripcion, tick):
        if self._en_cooldown(id_veh, tipo, tick):
            return
        self._cooldown[(id_veh, tipo)] = tick
        alerta = Alerta(id_veh, tipo, descripcion, tick)
        self.alertas.append(alerta)
        self.historial.append(alerta)
        self.conteo.setdefault(id_veh, {})
        self.conteo[id_veh][tipo] = self.conteo[id_veh].get(tipo, 0) + 1
        if len(self.alertas) > MAX_ALERTAS:
            self.alertas = self.alertas[-MAX_ALERTAS:]

    def _revisar_velocidad(self, veh, tick):
        vel_kmh = abs(veh.vel) * 30.0
        if vel_kmh > VEL_EXCESO_KMH:
            self._registrar(veh.id, INF_GRAVE, f"{veh.id}: {vel_kmh:.0f} km/h", tick)
        elif vel_kmh > VEL_LIMITE_KMH:
            self._registrar(veh.id, INF_VELOCIDAD, f"{veh.id}: {vel_kmh:.0f} km/h", tick)

    def _revisar_semaforo(self, veh, semaforos, catastro, tick):
        if abs(veh.vel) < 0.08:
            return
        for nodo in catastro.intersecciones:
            ix, iy = nodo["pos"]
            if math.hypot(veh.x - ix, veh.y - iy) > MARGEN_NODO:
                continue
            for sem in semaforos:
                if sem.direccion_regulada != veh.carril_actual.orient:
                    continue
                if abs(sem.x - ix) > 65 or abs(sem.y - iy) > 65:
                    continue
                if sem.estado == "ROJO":
                    nombre = nodo["nombre"].replace("\n", " ")
                    self._registrar(veh.id, INF_SEMAFORO, f"{veh.id} cruza {nombre}", tick)

    def _revisar_contramano(self, veh, tick):
        if veh.vel < -0.25:
            orient = veh.carril_actual.orient
            self._registrar(veh.id, INF_REVERSA, f"{veh.id} reversa/{orient}", tick)

    @property
    def total_infracciones(self):
        return sum(sum(t.values()) for t in self.conteo.values())

    def infracciones_veh(self, id_veh):
        return sum(self.conteo.get(id_veh, {}).values())

    def dibujar(self, canvas, tick):
        px, py, pw, ph = self.PX, self.PY, self.PW, self.PH

        canvas.create_rectangle(px - 4, py - 4, px + pw + 4, py + ph + 4,
                                 fill=self.BG, outline=self.BORD, width=1)
        canvas.create_text(px + pw // 2, py + 10, text="== AGENTE VIGILANTE ==",
                           fill=self.ROJO, font=("Courier New", 8, "bold"))
        canvas.create_text(px + pw // 2, py + 22, text="Monitor de Infracciones",
                           fill=self.GRIS, font=("Courier New", 7))
        canvas.create_line(px, py + 30, px + pw, py + 30, fill=self.BORD, dash=(3, 4))

        y = py + 38
        canvas.create_text(px + 6, y, text=f"Total infracciones: {self.total_infracciones}",
                           fill=self.BLAN, font=("Courier New", 7, "bold"), anchor="w")
        y += 12

        for id_veh, tipos in self.conteo.items():
            detalle = "  ".join(f"{k[:3]}:{v}" for k, v in tipos.items())
            canvas.create_text(px + 10, y,
                               text=f"  {id_veh}: {self.infracciones_veh(id_veh)} [{detalle}]",
                               fill=self.GRIS, font=("Courier New", 6), anchor="w")
            y += 10

        y += 4
        canvas.create_line(px, y, px + pw, y, fill=self.BORD, dash=(2, 5))
        y += 6
        canvas.create_text(px + 6, y, text="ALERTAS ACTIVAS",
                           fill=self.ROJO, font=("Courier New", 7, "bold"), anchor="w")
        y += 13

        alertas_vis = [a for a in self.alertas if a.activa(tick)]

        if not alertas_vis:
            canvas.create_text(px + pw // 2, y + 10, text="[OK] Sin infracciones",
                               fill=self.VERD, font=("Courier New", 8, "bold"))
            y += 24
        else:
            for alerta in reversed(alertas_vis[-MAX_ALERTAS:]):
                if y > py + ph - 34:
                    break
                if alerta.tipo == INF_GRAVE:
                    col, tag = self.ROJO, "[!!]"
                elif alerta.tipo == INF_SEMAFORO:
                    col, tag = self.NARN, "[SEM]"
                elif alerta.tipo == INF_VELOCIDAD:
                    col, tag = self.AMAR, "[V]"
                else:
                    col, tag = self.CYAN, "[C]"

                canvas.create_text(px + 6, y, text=f"{tag} {alerta.tipo}",
                                   fill=col, font=("Courier New", 7, "bold"), anchor="w")
                y += 10
                desc = alerta.descripcion if len(alerta.descripcion) <= 24 else alerta.descripcion[:21] + "..."
                canvas.create_text(px + 12, y, text=desc,
                                   fill=self.GRIS, font=("Courier New", 6), anchor="w")
                y += 11

        pie_y = py + ph - 18
        canvas.create_line(px, pie_y, px + pw, pie_y, fill=self.BORD, dash=(2, 5))
        activo_txt = "[*]" if (tick // 30) % 2 == 0 else "[ ]"
        canvas.create_text(px + 6, py + ph - 7, text=f"{activo_txt} AV-VIG  tick:{tick}",
                           fill=self.GRIS, font=("Courier New", 6), anchor="w")