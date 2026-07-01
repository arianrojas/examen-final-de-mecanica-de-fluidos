# 🌊 MecaFluids — Solucionador de Compuertas Planas

**MecaFluids** es una aplicación web interactiva diseñada para la resolución didáctica y el análisis físico de problemas de **mecánica de fluidos**, específicamente enfocada en el cálculo de **fuerzas hidrostáticas** y el **equilibrio estático** sobre compuertas planas sumergidas o parcialmente sumergidas.

Combina un backend de cálculo en **Python puro** con una interfaz visual premium (Dark Mode, Glassmorphism y animaciones suaves), pensada para estudiantes de ingeniería que cursan Mecánica de Fluidos.

---

## 🚀 Características Principales

- **Detección automática de sumergimiento** — Determina si la compuerta está *totalmente* o *parcialmente* sumergida y adapta las fórmulas en consecuencia.
- **Doble sistema de unidades** — Cambia en tiempo real entre **SI** (m, kg/m³, N) y **US Customary** (ft, lbf/ft³, lbf).
- **Parámetros interactivos con sliders**:
  - Profundidad total del agua ($H$)
  - Proyección horizontal ($dx$) y vertical ($dy$) de la compuerta
  - Ancho de la compuerta ($b$)
  - Tipo de fluido: Agua dulce, agua marina o densidad personalizada
- **Diagrama de Cuerpo Libre (SVG)** — Visualización 2D dinámica y a escala con vectores de fuerza ($F_R$, $P$, $B_x$, $B_y$) que se actualizan en tiempo real.
- **Procedimiento paso a paso con LaTeX** — Desglose matemático completo renderizado con KaTeX para uso académico.
- **Análisis físico avanzado** — Interpretación del centro de presión, excentricidad y carga en los apoyos.

---

## 📁 Estructura del Proyecto

```
sofware mecanica/
├── server.py          # Servidor HTTP + motor de cálculo físico (Python stdlib únicamente)
├── README.md          # Este archivo
└── public/
    ├── index.html     # Estructura HTML de la aplicación y carga de dependencias
    ├── style.css      # Sistema visual: Dark Mode, Glassmorphism, layout responsivo
    └── script.js      # Lógica del cliente, llamadas a la API y dibujo SVG dinámico
```

---

## 🛠️ Requisitos e Instalación

Solo necesitas **Python 3.x** instalado en tu equipo. No se requieren librerías externas; el servidor usa únicamente la librería estándar de Python.

### Pasos para ejecutar localmente

1. Abre una terminal en la carpeta del proyecto.

2. Inicia el servidor:
   ```bash
   python server.py
   ```

3. El servidor confirmará que está corriendo:
   ```
   Iniciando servidor en http://localhost:8000...
   Sirviendo archivos desde: .../public
   ```

4. Abre tu navegador en:
   ```
   http://localhost:8000
   ```

> **Nota:** Para detener el servidor presiona `Ctrl + C` en la terminal.

---

## 🔌 API REST Interna

El servidor expone un único endpoint que realiza todos los cálculos:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/solve` | Recibe los parámetros y devuelve resultados + procedimiento HTML |

### Ejemplo de cuerpo de petición (JSON)

```json
{
  "units": "US",
  "H": 15.0,
  "dx": 8.0,
  "dy": 6.0,
  "b": 5.0,
  "density_type": "seawater",
  "custom_density": 0.0
}
```

### Ejemplo de respuesta (JSON)

```json
{
  "geom": { "L": 10.0, "theta_deg": 36.87, "A_sub": 50.0, ... },
  "fluid": { "fluid_name": "Agua Marina", "gamma": 64.0, ... },
  "results": { "F_R": 48000.0, "y_cp": 8.33, "P": 6400.0, ... },
  "procedure_html": "...",
  "analysis_html": "..."
}
```

---

## 📐 Fundamento Físico Implementado

El motor de cálculo en [`server.py`](server.py) resuelve el siguiente sistema:

### 1. Fuerza Hidrostática Resultante

$$F_R = p_{cg} \cdot A_{sub} = (\gamma \cdot h_{cg}) \cdot A_{sub}$$

### 2. Centro de Presión

$$y_{cp} = y_{cg} + \frac{I_{xx,cg}}{y_{cg} \cdot A_{sub}}$$

### 3. Reacción en el Apoyo Superior A (pared lisa)

Suma de momentos respecto a la charnela B:

$$\Sigma M_B = 0 \implies P = \frac{F_R \cdot d_B}{dy}$$

### 4. Reacciones en la Charnela Inferior B

$$\Sigma F_x = 0 \implies B_x = P - F_{R,x}$$

$$\Sigma F_y = 0 \implies B_y = F_{R,y}$$

---

## 🎨 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend / Servidor | Python 3 (`http.server`, `socketserver`, `json`, `math`) |
| Frontend | HTML5 + Vanilla CSS + JavaScript (ES6+) |
| Tipografía | Google Fonts: *Outfit* & *Space Grotesk* |
| Iconos | Font Awesome 6 |
| Renderizado matemático | KaTeX 0.16 |
| Gráfico interactivo | SVG dinámico generado por JavaScript |

---

## 👨‍🎓 Contexto Académico

Este software fue desarrollado como **examen final** del curso de **Mecánica de Fluidos** en Ingeniería. Tiene como objetivo demostrar la comprensión práctica del análisis de fuerzas hidrostáticas sobre superficies planas inclinadas, integrando tanto el rigor matemático como una experiencia de usuario moderna.

---

© 2026 MecaFluids — Diseñado con excelencia académica y visual para Ingeniería
