# -*- coding: utf-8 -*-

class Catastro:
    """
    El Catastro representa la base de datos geográfica del sistema vial.
    Define las dimensiones del plano, las avenidas, los cruces e infraestructura de casas.
    """
    def __init__(self):
        self.width = 800
        self.height = 800
        
        self.avenidas_horizontales = [250, 550]
        self.avenidas_verticales = [250, 550]
        
        self.intersecciones = [
            {"pos": (250, 250), "nombre": "NODO NO\n(San Martín)"},
            {"pos": (550, 250), "nombre": "NODO NE\n(Belgrano)"},
            {"pos": (250, 550), "nombre": "NODO SO\n(Sarmiento)"},
            {"pos": (550, 550), "nombre": "NODO SE\n(Mitre)"}
        ]
        
        # Generar casas en las 9 manzanas de la ciudad (grilla de 2x2 en cada manzana)
        self.casas = []
        rangos_x = [(40, 170), (320, 480), (630, 760)]
        rangos_y = [(40, 170), (320, 480), (630, 760)]
        
        for rx_min, rx_max in rangos_x:
            for ry_min, ry_max in rangos_y:
                # Casa NO (celeste neón)
                self.casas.append({"x": rx_min, "y": ry_min, "w": 50, "h": 50, "color_luz": "#00f0ff"})
                # Casa NE (verde neón)
                self.casas.append({"x": rx_max - 20, "y": ry_min, "w": 50, "h": 50, "color_luz": "#39ff14"})
                # Casa SO (rosa neón)
                self.casas.append({"x": rx_min, "y": ry_max - 20, "w": 50, "h": 50, "color_luz": "#ff0055"})
                # Casa SE (amarillo neón)
                self.casas.append({"x": rx_max - 20, "y": ry_max - 20, "w": 50, "h": 50, "color_luz": "#ffcc00"})
