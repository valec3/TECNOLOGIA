# -*- coding: utf-8 -*-
import tkinter as tk
import time

from catastro import Catastro
from senaforo import Semaforo

class PlanoVialApp:
    def __init__(self, root):
        self.root = root
        self.catastro = Catastro()
        
        self.root.title("Plano Metropolitano de Tránsito - Catastro MAS")
        self.root.geometry(f"{self.catastro.width}x{self.catastro.height}")
        self.root.configure(bg="#0d0d0f")
        self.root.resizable(False, False)
        
        self.canvas = tk.Canvas(self.root, width=self.catastro.width, height=self.catastro.height, bg="#121214", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)
        
        self.semaforos = []
        self._inicializar_semaforos()
        
        self.last_time = time.time()
        self.root.after(50, self.tick)

    def _inicializar_semaforos(self):
        for nodo in self.catastro.intersecciones:
            ix, iy = nodo["pos"]
            sem_h = Semaforo(
                id_semaforo=f"SEM_{ix}_{iy}_H",
                posicion=(ix - 50, iy),
                direccion_regulada="H",
                estado_inicial="VERDE"
            )
            sem_v = Semaforo(
                id_semaforo=f"SEM_{ix}_{iy}_V",
                posicion=(ix, iy - 50),
                direccion_regulada="V",
                estado_inicial="ROJO"
            )
            self.semaforos.extend([sem_h, sem_v])

    def renderizar(self):
        self.canvas.delete("all")
        
        # Avenidas Horizontales
        for y in self.catastro.avenidas_horizontales:
            self.canvas.create_rectangle(0, y - 40, self.catastro.width, y + 40, fill="#1e1e24", outline="")
            self.canvas.create_line(0, y, self.catastro.width, y, fill="#ffcc00", width=2, dash=(12, 8))
            
            # Flechas de sentido
            for x in [100, 380, 680]:
                self.canvas.create_text(x, y - 20, text="←", fill="#55555f", font=("Arial", 12, "bold"))
            for x in [100, 380, 680]:
                self.canvas.create_text(x, y + 20, text="→", fill="#55555f", font=("Arial", 12, "bold"))
            
        # Avenidas Verticales
        for x in self.catastro.avenidas_verticales:
            self.canvas.create_rectangle(x - 40, 0, x + 40, self.catastro.height, fill="#1e1e24", outline="")
            self.canvas.create_line(x, 0, x, self.catastro.height, fill="#ffcc00", width=2, dash=(12, 8))
            
            # Flechas de sentido
            for y in [100, 380, 680]:
                self.canvas.create_text(x - 20, y, text="↑", fill="#55555f", font=("Arial", 12, "bold"))
            for y in [100, 380, 680]:
                self.canvas.create_text(x + 20, y, text="↓", fill="#55555f", font=("Arial", 12, "bold"))

        # Intersecciones (Nodos)
        for nodo in self.catastro.intersecciones:
            ix, iy = nodo["pos"]
            self.canvas.create_rectangle(ix - 40, iy - 40, ix + 40, iy + 40, fill="#25252d", outline="")
            self.canvas.create_rectangle(ix - 40, iy - 40, ix + 40, iy + 40, outline="#00f0ff", width=1, dash=(2, 4))
            self.canvas.create_text(ix, iy, text=nodo["nombre"], fill="#00f0ff", font=("Courier New", 8, "bold"), justify="center")

        # Semáforos
        for sem in self.semaforos:
            sem.dibujar(self.canvas)

        # Nombres de Avenidas
        self.canvas.create_text(110, 202, text="AV. DEL LIBERTADOR (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="w")
        self.canvas.create_text(690, 202, text="AV. DEL LIBERTADOR (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="e")
        
        self.canvas.create_text(110, 502, text="AV. DE MAYO (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="w")
        self.canvas.create_text(690, 502, text="AV. DE MAYO (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="e")
        
        self.canvas.create_text(175, 45, text="AV. 9 DE JULIO (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="e")
        self.canvas.create_text(175, 755, text="AV. 9 DE JULIO (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="e")
        
        self.canvas.create_text(625, 45, text="AV. RIVADAVIA (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="w")
        self.canvas.create_text(625, 755, text="AV. RIVADAVIA (BI)", fill="#718096", font=("Courier New", 8, "bold"), anchor="w")

        # Leyenda y escala
        for val in range(100, self.catastro.width, 100):
            self.canvas.create_text(val, 15, text=f"{val}m", fill="#00f0ff", font=("Courier New", 8))
            self.canvas.create_line(val, 0, val, 6, fill="#00f0ff", width=1)
            
        for val in range(100, self.catastro.height, 100):
            self.canvas.create_text(20, val, text=f"{val}m", fill="#00f0ff", font=("Courier New", 8))
            self.canvas.create_line(0, val, 6, val, fill="#00f0ff", width=1)
            
        self.canvas.create_rectangle(20, 720, 240, 780, fill="#0d0d0f", outline="#00f0ff", width=1)
        self.canvas.create_text(30, 735, text="PLANO VIAL DE CATASTRO", fill="#00f0ff", font=("Courier New", 10, "bold"), anchor="w")
        self.canvas.create_text(30, 752, text="Modo: Monitoreo Físico MAS", fill="#718096", font=("Courier New", 8), anchor="w")
        self.canvas.create_text(30, 768, text="Escala Estática 1:1000", fill="#718096", font=("Courier New", 8), anchor="w")

    def tick(self):
        current_time = time.time()
        delta_time = current_time - self.last_time
        self.last_time = current_time
        
        delta_time = min(delta_time, 0.1)
        
        for sem in self.semaforos:
            sem.actualizar(delta_time)
            
        self.renderizar()
        self.root.after(33, self.tick)

if __name__ == "__main__":
    root = tk.Tk()
    app = PlanoVialApp(root)
    root.mainloop()
