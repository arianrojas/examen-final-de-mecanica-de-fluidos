import http.server
import socketserver
import json
import math
import os
import urllib.parse

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

class FluidSolver:
    @staticmethod
    def solve(units, H, dx, dy, b, density_type, custom_density):
        # 1. Definición de la densidad/peso específico (gamma)
        g = 9.81 # m/s^2 (SI)
        
        if units == 'US':
            if density_type == 'seawater':
                gamma = 64.0
                fluid_name = "Agua Marina"
            elif density_type == 'freshwater':
                gamma = 62.4
                fluid_name = "Agua Dulce"
            else:
                gamma = float(custom_density)
                fluid_name = "Fluido Personalizado"
            density_unit = "lbf/ft³"
            force_unit = "lbf"
            pressure_unit = "lbf/ft²"
            length_unit = "ft"
            area_unit = "ft²"
        else: # SI
            if density_type == 'seawater':
                rho = 1025.0
                fluid_name = "Agua Marina"
            elif density_type == 'freshwater':
                rho = 1000.0
                fluid_name = "Agua Dulce"
            else:
                rho = float(custom_density)
                fluid_name = "Fluido Personalizado"
            
            gamma = rho * g  # N/m^3
            density_unit = "kg/m³"
            force_unit = "N"
            pressure_unit = "Pa (N/m²)"
            length_unit = "m"
            area_unit = "m²"

        # 2. Geometría de la compuerta
        L = math.sqrt(dx**2 + dy**2) # Longitud de la compuerta
        theta_rad = math.atan2(dy, dx)
        theta_deg = math.degrees(theta_rad)
        sin_theta = math.sin(theta_rad)
        cos_theta = math.cos(theta_rad)
        
        # Determinar si está totalmente o parcialmente sumergida
        if H >= dy:
            submerged_status = "Totalmente Sumergida"
            is_fully_submerged = True
            h_A = H - dy
            h_B = H
            h_cg = (h_A + h_B) / 2.0  # Profundidad del centroide
            L_sub = L                 # Longitud sumergida
            A_sub = L_sub * b         # Área sumergida
            
            # y_cg desde la intersección con la superficie libre
            y_cg = h_cg / sin_theta
            y_B = h_B / sin_theta
            y_A = h_A / sin_theta
            
            # Momento de inercia centroidal
            I_xx_cg = (b * (L_sub**3)) / 12.0
            
            # Centro de presión
            y_cp = y_cg + I_xx_cg / (y_cg * A_sub)
            
            # Distancia desde el centro de presión a la articulación B (en la base)
            d_B = y_B - y_cp
            # Distancia desde el centro de presión a la pared lisa A (en el tope)
            d_A = y_cp - y_A
        else:
            submerged_status = "Parcialmente Sumergida"
            is_fully_submerged = False
            h_A_sub = 0.0
            h_B = H
            h_cg = H / 2.0            # Centroide sumergido
            L_sub = H / sin_theta     # Longitud sumergida
            A_sub = L_sub * b         # Área sumergida
            
            y_cg = L_sub / 2.0
            y_B = L_sub
            y_A_sub = 0.0
            
            I_xx_cg = (b * (L_sub**3)) / 12.0
            y_cp = y_cg + I_xx_cg / (y_cg * A_sub)  # (2/3)*L_sub
            
            # Distancia desde B
            d_B = y_B - y_cp  # (1/3)*L_sub
            d_A = L - d_B

        # 3. Fuerza hidrostática resultante
        p_cg = gamma * h_cg
        F_R = p_cg * A_sub

        # Componentes de F_R
        F_Rx = F_R * sin_theta
        F_Ry = F_R * cos_theta

        # 4. Equilibrio de Momentos en B para encontrar la reacción P en A
        P = (F_R * d_B) / dy

        # 5. Equilibrio de fuerzas para encontrar reacciones en B
        B_x = P - F_Rx
        B_y = F_Ry
        
        B_mag = math.sqrt(B_x**2 + B_y**2)
        B_angle = math.degrees(math.atan2(B_y, B_x)) if B_x != 0 else 90.0

        # Formatear números
        def fmt(val, dec=2):
            return f"{val:,.{dec}f}"

        # 6. Procedimiento Detallado (en formato HTML estructurado)
        proc = []
        
        # Paso 1: Geometría
        proc.append(f"""
        <div class="step-card">
            <div class="step-num">Paso 1</div>
            <h3>Geometría de la Compuerta</h3>
            <p>Calculamos los parámetros geométricos de la compuerta a partir de sus dimensiones:</p>
            <ul>
                <li><strong>Longitud total ($L$):</strong> $L = \\sqrt{{dx^2 + dy^2}} = \\sqrt{{ {dx}^2 + {dy}^2 }} = {fmt(L)}\\text{{ {length_unit}}}$</li>
                <li><strong>Ángulo de inclinación ($\\theta$):</strong> $\\theta = \\arctan\\left(\\frac{{dy}}{{dx}}\\right) = \\arctan\\left(\\frac{{ {dy} }}{{ {dx} }}\\right) = {fmt(theta_deg)}^\\circ$</li>
                <li><strong>Ancho ($b$):</strong> $b = {b}\\text{{ {length_unit}}}$</li>
                <li><strong>Área total de la compuerta ($A$):</strong> $A = L \\cdot b = {fmt(L)} \\cdot {b} = {fmt(L*b)}\\text{{ {area_unit}}}$</li>
            </ul>
        </div>
        """)

        # Paso 2: Estado de Sumergimiento
        if is_fully_submerged:
            proc.append(f"""
            <div class="step-card">
                <div class="step-num">Paso 2</div>
                <h3>Análisis de Sumergimiento y Centroide</h3>
                <p>Dado que la profundidad del agua ($H = {H}\\text{{ {length_unit}}}$) es mayor o igual a la altura vertical del apoyo ($dy = {dy}\\text{{ {length_unit}}}$), la compuerta está <strong>totalmente sumergida</strong>.</p>
                <ul>
                    <li><strong>Profundidad al punto superior A ($h_A$):</strong> $h_A = H - dy = {H} - {dy} = {fmt(h_A)}\\text{{ {length_unit}}}$</li>
                    <li><strong>Profundidad al punto inferior B ($h_B$):</strong> $h_B = H = {fmt(h_B)}\\text{{ {length_unit}}}$</li>
                    <li><strong>Profundidad al centroide ($h_{{cg}}$):</strong> $h_{{cg}} = \\frac{{h_A + h_B}}{{2}} = \\frac{{ {fmt(h_A)} + {fmt(h_B)} }}{{2}} = {fmt(h_cg)}\\text{{ {length_unit}}}$</li>
                    <li><strong>Área sumergida ($A_{{sub}}$):</strong> $A_{{sub}} = A = {fmt(A_sub)}\\text{{ {area_unit}}}$</li>
                </ul>
            </div>
            """)
        else:
            proc.append(f"""
            <div class="step-card">
                <div class="step-num">Paso 2</div>
                <h3>Análisis de Sumergimiento y Centroide</h3>
                <p>Dado que la profundidad del agua ($H = {H}\\text{{ {length_unit}}}$) es menor a la altura vertical de la compuerta ($dy = {dy}\\text{{ {length_unit}}}$), la compuerta está <strong>parcialmente sumergida</strong>.</p>
                <ul>
                    <li><strong>Límite superior sumergido (superficie libre):</strong> $h_{{A,sub}} = 0\\text{{ {length_unit}}}$</li>
                    <li><strong>Profundidad en el fondo ($h_B$):</strong> $h_B = H = {fmt(h_B)}\\text{{ {length_unit}}}$</li>
                    <li><strong>Profundidad al centroide sumergido ($h_{{cg}}$):</strong> $h_{{cg}} = \\frac{{H}}{{2}} = \\frac{{ {H} }}{{2}} = {fmt(h_cg)}\\text{{ {length_unit}}}$</li>
                    <li><strong>Longitud sumergida ($L_{{sub}}$):</strong> $L_{{sub}} = \\frac{{H}}{{\\sin\\theta}} = \\frac{{ {H} }}{{\\sin({fmt(theta_deg)}^\\circ)}} = {fmt(L_sub)}\\text{{ {length_unit}}}$</li>
                    <li><strong>Área sumergida ($A_{{sub}}$):</strong> $A_{{sub}} = L_{{sub}} \\cdot b = {fmt(L_sub)} \\cdot {b} = {fmt(A_sub)}\\text{{ {area_unit}}}$</li>
                </ul>
            </div>
            """)

        # Paso 3: Fuerza Resultante
        if units == 'US':
            dens_calc = f"\\gamma = {fmt(gamma)}\\text{{ {density_unit}}}"
        else:
            dens_calc = f"\\gamma = \\rho \\cdot g = {fmt(rho)}\\text{{ kg/m³}} \\cdot 9.81\\text{{ m/s²}} = {fmt(gamma)}\\text{{ N/m³}}"

        proc.append(f"""
        <div class="step-card">
            <div class="step-num">Paso 3</div>
            <h3>Fuerza Hidrostática sobre la Compuerta</h3>
            <p>La fuerza ejercida por la presión del fluido sobre la superficie plana se calcula mediante la presión en el centroide multiplicada por el área sumergida:</p>
            <ul>
                <li><strong>Peso específico del fluido ($\\gamma$):</strong> ${dens_calc}$</li>
                <li><strong>Presión en el centroide ($p_{{cg}}$):</strong> $p_{{cg}} = \\gamma \\cdot h_{{cg}} = {fmt(gamma)} \\cdot {fmt(h_cg)} = {fmt(p_cg)}\\text{{ {pressure_unit}}}$</li>
                <li><strong>Fuerza resultante ($F_R$):</strong> $F_R = p_{{cg}} \\cdot A_{{sub}} = {fmt(p_cg)} \\cdot {fmt(A_sub)} = {fmt(F_R)}\\text{{ {force_unit}}}$</li>
                <li><strong>Componente Horizontal ($F_{{R,x}}$):</strong> $F_{{R,x}} = F_R \\cdot \\sin\\theta = {fmt(F_R)} \\cdot \\sin({fmt(theta_deg)}^\\circ) = {fmt(F_Rx)}\\text{{ {force_unit}}}$</li>
                <li><strong>Componente Vertical ($F_{{R,y}}$):</strong> $F_{{R,y}} = F_R \\cdot \\cos\\theta = {fmt(F_R)} \\cdot \\cos({fmt(theta_deg)}^\\circ) = {fmt(F_Ry)}\\text{{ {force_unit}}}$ (hacia abajo)</li>
            </ul>
        </div>
        """)

        # Paso 4: Centro de Presión
        if is_fully_submerged:
            cp_formulas = f"""
                <li><strong>Distancia centroidal en el plano ($y_{{cg}}$):</strong> $y_{{cg}} = \\frac{{h_{{cg}}}}{{\\sin\\theta}} = \\frac{{ {fmt(h_cg)} }}{{\\sin({fmt(theta_deg)}^\\circ)}} = {fmt(y_cg)}\\text{{ {length_unit}}}$</li>
                <li><strong>Momento de Inercia centroidal ($I_{{xx,cg}}$):</strong> $I_{{xx,cg}} = \\frac{{b \\cdot L^3}}{{12}} = \\frac{{ {b} \\cdot {fmt(L)}^3 }}{{12}} = {fmt(I_xx_cg)}\\text{{ {length_unit}}}^4$</li>
                <li><strong>Centro de Presión ($y_{{cp}}$):</strong> $y_{{cp}} = y_{{cg}} + \\frac{{I_{{xx,cg}}}}{{y_{{cg}} \\cdot A_{{sub}}}} = {fmt(y_cg)} + \\frac{{ {fmt(I_xx_cg)} }}{{ {fmt(y_cg)} \\cdot {fmt(A_sub)} }} = {fmt(y_cp)}\\text{{ {length_unit}}}$</li>
                <li><strong>Distancia a la articulación B ($d_B$):</strong> $d_B = y_B - y_{{cp}} = \\frac{{H}}{{\\sin\\theta}} - y_{{cp}} = {fmt(y_B)} - {fmt(y_cp)} = {fmt(d_B)}\\text{{ {length_unit}}}$</li>
            """
        else:
            cp_formulas = f"""
                <li><strong>Longitud sumergida ($L_{{sub}}$):</strong> $L_{{sub}} = {fmt(L_sub)}\\text{{ {length_unit}}}$</li>
                <li><strong>Momento de Inercia sumergido ($I_{{xx,cg}}$):</strong> $I_{{xx,cg}} = \\frac{{b \\cdot L_{{sub}}^3}}{{12}} = \\frac{{ {b} \\cdot {fmt(L_sub)}^3 }}{{12}} = {fmt(I_xx_cg)}\\text{{ {length_unit}}}^4$</li>
                <li><strong>Centro de Presión ($y_{{cp}}$):</strong> $y_{{cp}} = y_{{cg}} + \\frac{{I_{{xx,cg}}}}{{y_{{cg}} \\cdot A_{{sub}}}} = \\frac{{ L_{{sub}} }}{{ 2 }} + \\frac{{ L_{{sub}} }}{{ 6 }} = \\frac{{ 2 }}{{ 3 }}L_{{sub}} = {fmt(y_cp)}\\text{{ {length_unit}}}$</li>
                <li><strong>Distancia a la articulación B ($d_B$):</strong> $d_B = L_{{sub}} - y_{{cp}} = \\frac{{ 1 }}{{ 3 }}L_{{sub}} = {fmt(d_B)}\\text{{ {length_unit}}}$</li>
            """

        proc.append(f"""
        <div class="step-card">
            <div class="step-num">Paso 4</div>
            <h3>Punto de Aplicación (Centro de Presión)</h3>
            <p>La fuerza resultante actúa en el centro de presión, el cual siempre se encuentra a mayor profundidad que el centroide geométrico debido al incremento lineal de la presión hidrostática:</p>
            <ul>
                {cp_formulas}
            </ul>
        </div>
        """)

        # Paso 5: Reacción en A (Pared)
        proc.append(f"""
        <div class="step-card">
            <div class="step-num">Paso 5</div>
            <h3>Equilibrio de Momentos (Fuerza $P$ en A)</h3>
            <p>Tomamos momentos alrededor de la articulación B para aislar la fuerza de reacción horizontal $P$ ejercida por la pared lisa en A. Como la pared es vertical y lisa, la fuerza de soporte es puramente horizontal hacia la izquierda:</p>
            <div class="formula-box">$$\\Sigma M_B = 0 \\implies P \\cdot dy - F_R \\cdot d_B = 0$$</div>
            <p>Despejando la magnitud $P$:</p>
            <div class="formula-box">$$P = \\frac{{F_R \\cdot d_B}}{{dy}} = \\frac{{ {fmt(F_R)} \\cdot {fmt(d_B)} }}{{ {dy} }} = {fmt(P)}\\text{{ {force_unit}}}$$</div>
            <p>Por acción y reacción, la fuerza ejercida por la compuerta <strong>sobre la pared en A</strong> es horizontal hacia la derecha con magnitud $P = {fmt(P)}\\text{{ {force_unit}}}$.</p>
        </div>
        """)

        # Paso 6: Reacciones en la Hinge B
        proc.append(f"""
        <div class="step-card">
            <div class="step-num">Paso 6</div>
            <h3>Reacciones en la Articulación B</h3>
            <p>Aplicamos las ecuaciones de equilibrio estático para encontrar las fuerzas horizontal y vertical en la charnela B:</p>
            <ul>
                <li><strong>Equilibrio de Fuerzas Horizontales:</strong>
                    <br>$$\\Sigma F_x = 0 \\implies B_x - P + F_{{R,x}} = 0$$
                    <br>$$B_x = P - F_{{R,x}} = {fmt(P)} - {fmt(F_Rx)} = {fmt(B_x)}\\text{{ {force_unit}}}$$
                    <br><span class="direction-note">({"" if B_x >= 0 else "Dirección corregida: "}actuando hacia la {"derecha" if B_x >= 0 else "izquierda"})</span>
                </li>
                <li><strong>Equilibrio de Fuerzas Verticales:</strong>
                    <br>$$\\Sigma F_y = 0 \\implies B_y - F_{{R,y}} = 0$$
                    <br>$$B_y = F_{{R,y}} = {fmt(B_y)}\\text{{ {force_unit}}}$$
                    <br><span class="direction-note">(actuando hacia arriba)</span>
                </li>
                <li><strong>Fuerza Total Resultante en B:</strong>
                    <br>$$B = \\sqrt{{B_x^2 + B_y^2}} = \\sqrt{{ {fmt(B_x)}^2 + {fmt(B_y)}^2 }} = {fmt(B_mag)}\\text{{ {force_unit}}}$$
                    <br>con un ángulo de inclinación de ${fmt(B_angle)}^\\circ$ respecto al eje horizontal.
                </li>
            </ul>
        </div>
        """)

        # 7. Análisis Físico
        analysis_text = f"""
        <div class="analysis-card">
            <h3>Interpretación Física y Análisis de Sensibilidad</h3>
            <p>El comportamiento físico del sistema ante los parámetros dados revela lo siguiente:</p>
            <ol>
                <li>
                    <strong>Desplazamiento del Centro de Presión:</strong> 
                    El centro de presión (punto donde actúa la fuerza hidrostática total) se encuentra a un nivel 
                    y<sub>cp</sub> = {fmt(y_cp)} {length_unit}, que está a una distancia de <strong>{fmt(y_cp - y_cg)} {length_unit}</strong> por debajo del centroide geométrico de la sección sumergida (y<sub>cg</sub> = {fmt(y_cg)} {length_unit}). 
                    Esto ocurre debido a que la presión hidrostática aumenta de forma lineal con la profundidad.
                </li>
                <li>
                    <strong>Efecto de la Profundidad del Agua:</strong> 
                    A medida que aumenta la altura de agua H, la fuerza resultante aumenta rápidamente (de forma cuadrática si es parcial, y lineal si ya está totalmente sumergida). 
                    A profundidades muy grandes (H &gt;&gt; dy), la distancia centroidal y<sub>cg</sub> se vuelve muy grande, por lo que la excentricidad (y<sub>cp</sub> - y<sub>cg</sub>) tiende a cero. 
                    Físicamente, a gran profundidad la distribución de presiones deja de ser marcadamente trapezoidal y se vuelve casi rectangular (uniforme), haciendo que la fuerza resultante actúe prácticamente en el baricentro.
                </li>
                <li>
                    <strong>Carga sobre el Apoyo A (Pared):</strong> 
                    La reacción de la pared lisa P es de {fmt(P)} {force_unit}. Esta fuerza equilibra el momento de rotación provocado por el agua. 
                    Si cambiamos el ángulo de inclinación de la compuerta haciendo que sea más empinada (mayor dy, menor dx), el brazo de palanca de la fuerza de la pared (dy) aumenta, lo cual disminuye la fuerza horizontal necesaria en la pared para equilibrar el mismo momento torsor.
                </li>
                <li>
                    <strong>Carga en la Charnela B:</strong>
                    La charnela B experimenta una reacción vertical de {fmt(B_y)} {force_unit} y una reacción horizontal de {fmt(B_x)} {force_unit}.
                    La fuerza horizontal en la charnela B<sub>x</sub> es de {fmt(B_x)} {force_unit}. Si B<sub>x</sub> es positiva, significa que el pasador empuja hacia la derecha para evitar el deslizamiento. El valor y signo de B<sub>x</sub> depende del balance entre la fuerza normal de la pared P y la componente horizontal del empuje del agua F<sub>R,x</sub>.
                </li>
            </ol>
        </div>
        """

        return {
            "geom": {
                "L": L,
                "theta_deg": theta_deg,
                "A_total": L * b,
                "A_sub": A_sub,
                "L_sub": L_sub,
                "submerged_status": submerged_status,
                "is_fully_submerged": is_fully_submerged
            },
            "fluid": {
                "fluid_name": fluid_name,
                "gamma": gamma,
                "density_unit": density_unit,
                "force_unit": force_unit,
                "pressure_unit": pressure_unit,
                "length_unit": length_unit
            },
            "results": {
                "h_cg": h_cg,
                "p_cg": p_cg,
                "F_R": F_R,
                "F_Rx": F_Rx,
                "F_Ry": F_Ry,
                "y_cg": y_cg,
                "y_cp": y_cp,
                "d_B": d_B,
                "d_A": d_A,
                "P": P,
                "B_x": B_x,
                "B_y": B_y,
                "B_mag": B_mag,
                "B_angle": B_angle
            },
            "procedure_html": "\n".join(proc),
            "analysis_html": analysis_text
        }

class MainHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        url_path = urllib.parse.urlparse(path).path
        relative_path = url_path.lstrip('/')
        if relative_path == "" or url_path.endswith('/'):
            relative_path = "index.html"
        return os.path.join(PUBLIC_DIR, relative_path)

    def do_POST(self):
        if self.path == '/api/solve':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                params = json.loads(post_data.decode('utf-8'))
                
                units = params.get('units', 'US')
                H = float(params.get('H', 15.0))
                dx = float(params.get('dx', 8.0))
                dy = float(params.get('dy', 6.0))
                b = float(params.get('b', 5.0))
                density_type = params.get('density_type', 'seawater')
                custom_density = float(params.get('custom_density', 0.0))
                
                result = FluidSolver.solve(units, H, dx, dy, b, density_type, custom_density)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
                
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    if not os.path.exists(PUBLIC_DIR):
        os.makedirs(PUBLIC_DIR)
        
    print(f"Iniciando servidor en http://localhost:{PORT}...")
    print(f"Sirviendo archivos desde: {PUBLIC_DIR}")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MainHTTPHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido por el usuario.")
