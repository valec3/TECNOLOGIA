class Semaforo:
    def __init__(self, id_semaforo, posicion, direccion_regulada, estado_inicial):
        self.id = id_semaforo
        self.x, self.y = posicion
        self.direccion_regulada = direccion_regulada
        self.estado = estado_inicial
        self.tiempos_fase = {"VERDE": 5.0, "AMARILLO": 2.0, "ROJO": 7.0}
        self.tiempo_acumulado = 0.0

    def actualizar(self, delta_time):
        self.tiempo_acumulado += delta_time
        limite = self.tiempos_fase[self.estado]
        if self.tiempo_acumulado >= limite:
            self.tiempo_acumulado = 0.0
            if self.estado == "VERDE":
                self.estado = "AMARILLO"
            elif self.estado == "AMARILLO":
                self.estado = "ROJO"
            elif self.estado == "ROJO":
                self.estado = "VERDE"

    def tiempo_restante(self):
        return max(0.0, self.tiempos_fase[self.estado] - self.tiempo_acumulado)

    def dibujar(self, canvas):
        # Dibujar la caja del semáforo
        canvas.create_rectangle(self.x - 6, self.y - 15, self.x + 6, self.y + 15, fill="#1a1a1a", outline="#33333b", width=2)
        
        # Definir colores encendidos/apagados
        rojo = "#ff0055" if self.estado == "ROJO" else "#4a0018"
        amarillo = "#ffcc00" if self.estado == "AMARILLO" else "#4a3b00"
        verde = "#39ff14" if self.estado == "VERDE" else "#104a05"
        
        # Dibujar las 3 luces
        canvas.create_oval(self.x - 4, self.y - 13, self.x + 4, self.y - 5, fill=rojo, outline="")
        canvas.create_oval(self.x - 4, self.y - 4, self.x + 4, self.y + 4, fill=amarillo, outline="")
        canvas.create_oval(self.x - 4, self.y + 5, self.x + 4, self.y + 13, fill=verde, outline="")
        
        # Mostrar el tiempo restante
        t_restante = self.tiempo_restante()
        canvas.create_text(self.x + 12, self.y, text=f"{t_restante:.1f}s", fill="#ffffff", font=("Courier New", 8, "bold"), anchor="w")
