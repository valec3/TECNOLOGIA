# -*- coding: utf-8 -*-

class Catastro:
    """
    El Catastro representa la base de datos geográfica del sistema vial.
    Define las dimensiones del plano, las avenidas y los cruces de intersección.
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
