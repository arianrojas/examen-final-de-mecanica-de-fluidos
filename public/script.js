// State variables
let state = {
    units: 'US',
    H: 15.0,
    dx: 8.0,
    dy: 6.0,
    b: 5.0,
    density_type: 'seawater',
    custom_density: 64.0
};

// UI Elements
const paramH = document.getElementById('param-H');
const paramDx = document.getElementById('param-dx');
const paramDy = document.getElementById('param-dy');
const paramB = document.getElementById('param-b');

const valHDisplay = document.getElementById('val-H-display');
const valDxDisplay = document.getElementById('val-dx-display');
const valDyDisplay = document.getElementById('val-dy-display');
const valBDisplay = document.getElementById('val-b-display');

const fluidSelect = document.getElementById('fluid-select');
const customDensityContainer = document.getElementById('custom-density-container');
const customDensityInput = document.getElementById('custom-density-input');
const densityUnitLabel = document.querySelector('.density-unit-label');

const btnResetExample = document.getElementById('btn-reset-example');
const submergedBadgeStatus = document.getElementById('submerged-badge-status');

// Results elements
const resFR = document.getElementById('res-FR');
const resYCP = document.getElementById('res-ycp');
const resP = document.getElementById('res-P');
const resB = document.getElementById('res-B');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const procedureContent = document.getElementById('procedure-content');
const analysisContent = document.getElementById('analysis-content');

// Unit Limits
const limits = {
    US: {
        H: { min: 1.0, max: 30.0, step: 0.5, default: 15.0 },
        dx: { min: 1.0, max: 20.0, step: 0.5, default: 8.0 },
        dy: { min: 1.0, max: 20.0, step: 0.5, default: 6.0 },
        b: { min: 1.0, max: 20.0, step: 0.5, default: 5.0 },
        custom_density: { default: 64.0 }
    },
    SI: {
        H: { min: 0.3, max: 10.0, step: 0.1, default: 4.5 },
        dx: { min: 0.3, max: 6.0, step: 0.1, default: 2.4 },
        dy: { min: 0.3, max: 6.0, step: 0.1, default: 1.8 },
        b: { min: 0.3, max: 6.0, step: 0.1, default: 1.5 },
        custom_density: { default: 1025.0 }
    }
};

// Initialize app
function init() {
    setupEventListeners();
    updateUIFromState();
    solve();
}

function setupEventListeners() {
    // Inputs & Sliders
    paramH.addEventListener('input', (e) => {
        state.H = parseFloat(e.target.value);
        valHDisplay.textContent = `${state.H.toFixed(1)} ${state.units === 'US' ? 'ft' : 'm'}`;
        solve();
    });

    paramDx.addEventListener('input', (e) => {
        state.dx = parseFloat(e.target.value);
        valDxDisplay.textContent = `${state.dx.toFixed(1)} ${state.units === 'US' ? 'ft' : 'm'}`;
        solve();
    });

    paramDy.addEventListener('input', (e) => {
        state.dy = parseFloat(e.target.value);
        valDyDisplay.textContent = `${state.dy.toFixed(1)} ${state.units === 'US' ? 'ft' : 'm'}`;
        solve();
    });

    paramB.addEventListener('input', (e) => {
        state.b = parseFloat(e.target.value);
        valBDisplay.textContent = `${state.b.toFixed(1)} ${state.units === 'US' ? 'ft' : 'm'}`;
        solve();
    });

    // Fluid Select
    fluidSelect.addEventListener('change', (e) => {
        state.density_type = e.target.value;
        if (state.density_type === 'custom') {
            customDensityContainer.classList.remove('hidden');
            state.custom_density = parseFloat(customDensityInput.value);
        } else {
            customDensityContainer.classList.add('hidden');
        }
        solve();
    });

    customDensityInput.addEventListener('input', (e) => {
        state.custom_density = parseFloat(e.target.value) || 0;
        solve();
    });

    // Unit Buttons
    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newUnit = e.target.dataset.unit;
            if (newUnit !== state.units) {
                toggleUnits(newUnit);
            }
        });
    });

    // Reset button
    btnResetExample.addEventListener('click', () => {
        resetToExample();
    });

    // Tabs
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');

            // Si es la pestaña de procedimiento, re-renderizar LaTeX por si acaso
            if (tabId === 'tab-procedure' && window.renderMathInElement) {
                setTimeout(() => {
                    renderMathInElement(procedureContent, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false }
                        ]
                    });
                }, 50);
            }
        });
    });
}

function updateUIFromState() {
    // Actualizar sliders min, max, step y valores
    const currentLimits = limits[state.units];

    densityUnitLabel.textContent = state.units === 'US' ? 'lbf/ft³' : 'kg/m³';

    // Configurar rangos
    updateSliderRange(paramH, currentLimits.H, state.H);
    updateSliderRange(paramDx, currentLimits.dx, state.dx);
    updateSliderRange(paramDy, currentLimits.dy, state.dy);
    updateSliderRange(paramB, currentLimits.b, state.b);

    // Texto de displays
    const unitSuf = state.units === 'US' ? 'ft' : 'm';
    valHDisplay.textContent = `${state.H.toFixed(1)} ${unitSuf}`;
    valDxDisplay.textContent = `${state.dx.toFixed(1)} ${unitSuf}`;
    valDyDisplay.textContent = `${state.dy.toFixed(1)} ${unitSuf}`;
    valBDisplay.textContent = `${state.b.toFixed(1)} ${unitSuf}`;

    // Selector de fluido opciones texto y valor
    fluidSelect.value = state.density_type;
    if (state.units === 'US') {
        fluidSelect.options[0].text = "Agua Marina (64.0 lbf/ft³)";
        fluidSelect.options[1].text = "Agua Dulce (62.4 lbf/ft³)";
    } else {
        fluidSelect.options[0].text = "Agua Marina (1025.0 kg/m³)";
        fluidSelect.options[1].text = "Agua Dulce (1000.0 kg/m³)";
    }

    if (state.density_type === 'custom') {
        customDensityContainer.classList.remove('hidden');
        customDensityInput.value = state.custom_density;
    } else {
        customDensityContainer.classList.add('hidden');
    }
}

function updateSliderRange(slider, limit, value) {
    slider.min = limit.min;
    slider.max = limit.max;
    slider.step = limit.step;
    slider.value = value;
}

function toggleUnits(newUnit) {
    const oldUnit = state.units;
    state.units = newUnit;

    // Activar botón
    document.querySelectorAll('.unit-btn').forEach(btn => {
        if (btn.dataset.unit === newUnit) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Conversiones físicas para mantener consistencia de valores al cambiar
    if (newUnit === 'SI' && oldUnit === 'US') {
        state.H = state.H * 0.3048;
        state.dx = state.dx * 0.3048;
        state.dy = state.dy * 0.3048;
        state.b = state.b * 0.3048;
        if (state.density_type === 'custom') {
            state.custom_density = state.custom_density * 16.0185;
        } else {
            state.custom_density = 1025.0; // seawater SI default
        }
    } else if (newUnit === 'US' && oldUnit === 'SI') {
        state.H = state.H / 0.3048;
        state.dx = state.dx / 0.3048;
        state.dy = state.dy / 0.3048;
        state.b = state.b / 0.3048;
        if (state.density_type === 'custom') {
            state.custom_density = state.custom_density / 16.0185;
        } else {
            state.custom_density = 64.0; // seawater US default
        }
    }

    // Ajustar valores a los nuevos límites para evitar desbordamientos
    const curLimits = limits[newUnit];
    state.H = Math.max(curLimits.H.min, Math.min(curLimits.H.max, state.H));
    state.dx = Math.max(curLimits.dx.min, Math.min(curLimits.dx.max, state.dx));
    state.dy = Math.max(curLimits.dy.min, Math.min(curLimits.dy.max, state.dy));
    state.b = Math.max(curLimits.b.min, Math.min(curLimits.b.max, state.b));

    updateUIFromState();
    solve();
}

function resetToExample() {
    state.units = 'US';
    state.H = 15.0;
    state.dx = 8.0;
    state.dy = 6.0;
    state.b = 5.0;
    state.density_type = 'seawater';
    state.custom_density = 64.0;

    // Actualizar botones de unidades
    document.querySelectorAll('.unit-btn').forEach(btn => {
        if (btn.dataset.unit === 'US') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    fluidSelect.value = 'seawater';
    updateUIFromState();
    solve();
}

// ============================================================
// FLUID SOLVER - Lógica de cálculo 100% en el navegador
// (No requiere servidor Python ni backend)
// ============================================================
function fluidSolverJS(units, H, dx, dy, b, density_type, custom_density) {
    const g = 9.81;
    let gamma, rho, fluid_name, density_unit, force_unit, pressure_unit, length_unit, area_unit;

    if (units === 'US') {
        if (density_type === 'seawater') { gamma = 64.0; fluid_name = "Agua Marina"; }
        else if (density_type === 'freshwater') { gamma = 62.4; fluid_name = "Agua Dulce"; }
        else { gamma = parseFloat(custom_density); fluid_name = "Fluido Personalizado"; }
        rho = null;
        density_unit = "lbf/ft³"; force_unit = "lbf"; pressure_unit = "lbf/ft²"; length_unit = "ft"; area_unit = "ft²";
    } else {
        if (density_type === 'seawater') { rho = 1025.0; fluid_name = "Agua Marina"; }
        else if (density_type === 'freshwater') { rho = 1000.0; fluid_name = "Agua Dulce"; }
        else { rho = parseFloat(custom_density); fluid_name = "Fluido Personalizado"; }
        gamma = rho * g;
        density_unit = "kg/m³"; force_unit = "N"; pressure_unit = "Pa (N/m²)"; length_unit = "m"; area_unit = "m²";
    }

    // Geometría
    const L = Math.sqrt(dx * dx + dy * dy);
    const theta_rad = Math.atan2(dy, dx);
    const theta_deg = theta_rad * 180 / Math.PI;
    const sin_theta = Math.sin(theta_rad);
    const cos_theta = Math.cos(theta_rad);

    let submerged_status, is_fully_submerged;
    let h_A, h_B, h_cg, L_sub, A_sub, y_cg, y_B, y_A, y_cp, d_B, d_A, I_xx_cg;

    if (H >= dy) {
        submerged_status = "Totalmente Sumergida";
        is_fully_submerged = true;
        h_A = H - dy; h_B = H;
        h_cg = (h_A + h_B) / 2.0;
        L_sub = L; A_sub = L_sub * b;
        y_cg = h_cg / sin_theta;
        y_B = h_B / sin_theta;
        y_A = h_A / sin_theta;
        I_xx_cg = (b * Math.pow(L_sub, 3)) / 12.0;
        y_cp = y_cg + I_xx_cg / (y_cg * A_sub);
        d_B = y_B - y_cp;
        d_A = y_cp - y_A;
    } else {
        submerged_status = "Parcialmente Sumergida";
        is_fully_submerged = false;
        h_B = H; h_cg = H / 2.0;
        L_sub = H / sin_theta; A_sub = L_sub * b;
        y_cg = L_sub / 2.0;
        y_B = L_sub;
        I_xx_cg = (b * Math.pow(L_sub, 3)) / 12.0;
        y_cp = y_cg + I_xx_cg / (y_cg * A_sub);
        d_B = y_B - y_cp;
        d_A = L - d_B;
        h_A = 0; y_A = 0;
    }

    const p_cg = gamma * h_cg;
    const F_R = p_cg * A_sub;
    const F_Rx = F_R * sin_theta;
    const F_Ry = F_R * cos_theta;
    const P = (F_R * d_B) / dy;
    const B_x = P - F_Rx;
    const B_y = F_Ry;
    const B_mag = Math.sqrt(B_x * B_x + B_y * B_y);
    const B_angle = B_x !== 0 ? Math.atan2(B_y, B_x) * 180 / Math.PI : 90.0;

    const fmt = (v, dec = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });

    // --- HTML del Procedimiento ---
    const proc = [];

    proc.push(`
    <div class="step-card">
        <div class="step-num">Paso 1</div>
        <h3>Geometría de la Compuerta</h3>
        <p>Calculamos los parámetros geométricos de la compuerta a partir de sus dimensiones:</p>
        <ul>
            <li><strong>Longitud total ($L$):</strong> $L = \\sqrt{dx^2 + dy^2} = \\sqrt{ ${dx}^2 + ${dy}^2 } = ${fmt(L)}\\text{ ${length_unit}}$</li>
            <li><strong>Ángulo de inclinación ($\\theta$):</strong> $\\theta = \\arctan\\left(\\frac{dy}{dx}\\right) = \\arctan\\left(\\frac{ ${dy} }{ ${dx} }\\right) = ${fmt(theta_deg)}^\\circ$</li>
            <li><strong>Ancho ($b$):</strong> $b = ${b}\\text{ ${length_unit}}$</li>
            <li><strong>Área total de la compuerta ($A$):</strong> $A = L \\cdot b = ${fmt(L)} \\cdot ${b} = ${fmt(L * b)}\\text{ ${area_unit}}$</li>
        </ul>
    </div>`);

    if (is_fully_submerged) {
        proc.push(`
        <div class="step-card">
            <div class="step-num">Paso 2</div>
            <h3>Análisis de Sumergimiento y Centroide</h3>
            <p>Dado que la profundidad del agua ($H = ${H}\\text{ ${length_unit}}$) es mayor o igual a la altura vertical del apoyo ($dy = ${dy}\\text{ ${length_unit}}$), la compuerta está <strong>totalmente sumergida</strong>.</p>
            <ul>
                <li><strong>Profundidad al punto superior A ($h_A$):</strong> $h_A = H - dy = ${H} - ${dy} = ${fmt(h_A)}\\text{ ${length_unit}}$</li>
                <li><strong>Profundidad al punto inferior B ($h_B$):</strong> $h_B = H = ${fmt(h_B)}\\text{ ${length_unit}}$</li>
                <li><strong>Profundidad al centroide ($h_{cg}$):</strong> $h_{cg} = \\frac{h_A + h_B}{2} = \\frac{ ${fmt(h_A)} + ${fmt(h_B)} }{2} = ${fmt(h_cg)}\\text{ ${length_unit}}$</li>
                <li><strong>Área sumergida ($A_{sub}$):</strong> $A_{sub} = A = ${fmt(A_sub)}\\text{ ${area_unit}}$</li>
            </ul>
        </div>`);
    } else {
        proc.push(`
        <div class="step-card">
            <div class="step-num">Paso 2</div>
            <h3>Análisis de Sumergimiento y Centroide</h3>
            <p>Dado que la profundidad del agua ($H = ${H}\\text{ ${length_unit}}$) es menor a la altura vertical de la compuerta ($dy = ${dy}\\text{ ${length_unit}}$), la compuerta está <strong>parcialmente sumergida</strong>.</p>
            <ul>
                <li><strong>Límite superior sumergido (superficie libre):</strong> $h_{A,sub} = 0\\text{ ${length_unit}}$</li>
                <li><strong>Profundidad en el fondo ($h_B$):</strong> $h_B = H = ${fmt(h_B)}\\text{ ${length_unit}}$</li>
                <li><strong>Profundidad al centroide sumergido ($h_{cg}$):</strong> $h_{cg} = \\frac{H}{2} = \\frac{ ${H} }{2} = ${fmt(h_cg)}\\text{ ${length_unit}}$</li>
                <li><strong>Longitud sumergida ($L_{sub}$):</strong> $L_{sub} = \\frac{H}{\\sin\\theta} = \\frac{ ${H} }{\\sin(${fmt(theta_deg)}^\\circ)} = ${fmt(L_sub)}\\text{ ${length_unit}}$</li>
                <li><strong>Área sumergida ($A_{sub}$):</strong> $A_{sub} = L_{sub} \\cdot b = ${fmt(L_sub)} \\cdot ${b} = ${fmt(A_sub)}\\text{ ${area_unit}}$</li>
            </ul>
        </div>`);
    }

    const dens_calc = units === 'US'
        ? `\\gamma = ${fmt(gamma)}\\text{ ${density_unit}}`
        : `\\gamma = \\rho \\cdot g = ${fmt(rho)}\\text{ kg/m³} \\cdot 9.81\\text{ m/s²} = ${fmt(gamma)}\\text{ N/m³}`;

    proc.push(`
    <div class="step-card">
        <div class="step-num">Paso 3</div>
        <h3>Fuerza Hidrostática sobre la Compuerta</h3>
        <p>La fuerza ejercida por la presión del fluido sobre la superficie plana se calcula mediante la presión en el centroide multiplicada por el área sumergida:</p>
        <ul>
            <li><strong>Peso específico del fluido ($\\gamma$):</strong> $${dens_calc}$</li>
            <li><strong>Presión en el centroide ($p_{cg}$):</strong> $p_{cg} = \\gamma \\cdot h_{cg} = ${fmt(gamma)} \\cdot ${fmt(h_cg)} = ${fmt(p_cg)}\\text{ ${pressure_unit}}$</li>
            <li><strong>Fuerza resultante ($F_R$):</strong> $F_R = p_{cg} \\cdot A_{sub} = ${fmt(p_cg)} \\cdot ${fmt(A_sub)} = ${fmt(F_R)}\\text{ ${force_unit}}$</li>
            <li><strong>Componente Horizontal ($F_{R,x}$):</strong> $F_{R,x} = F_R \\cdot \\sin\\theta = ${fmt(F_R)} \\cdot \\sin(${fmt(theta_deg)}^\\circ) = ${fmt(F_Rx)}\\text{ ${force_unit}}$</li>
            <li><strong>Componente Vertical ($F_{R,y}$):</strong> $F_{R,y} = F_R \\cdot \\cos\\theta = ${fmt(F_R)} \\cdot \\cos(${fmt(theta_deg)}^\\circ) = ${fmt(F_Ry)}\\text{ ${force_unit}}$ (hacia abajo)</li>
        </ul>
    </div>`);

    let cp_formulas;
    if (is_fully_submerged) {
        cp_formulas = `
            <li><strong>Distancia centroidal en el plano ($y_{cg}$):</strong> $y_{cg} = \\frac{h_{cg}}{\\sin\\theta} = \\frac{ ${fmt(h_cg)} }{\\sin(${fmt(theta_deg)}^\\circ)} = ${fmt(y_cg)}\\text{ ${length_unit}}$</li>
            <li><strong>Momento de Inercia centroidal ($I_{xx,cg}$):</strong> $I_{xx,cg} = \\frac{b \\cdot L^3}{12} = \\frac{ ${b} \\cdot ${fmt(L)}^3 }{12} = ${fmt(I_xx_cg)}\\text{ ${length_unit}}^4$</li>
            <li><strong>Centro de Presión ($y_{cp}$):</strong> $y_{cp} = y_{cg} + \\frac{I_{xx,cg}}{y_{cg} \\cdot A_{sub}} = ${fmt(y_cg)} + \\frac{ ${fmt(I_xx_cg)} }{ ${fmt(y_cg)} \\cdot ${fmt(A_sub)} } = ${fmt(y_cp)}\\text{ ${length_unit}}$</li>
            <li><strong>Distancia a la articulación B ($d_B$):</strong> $d_B = y_B - y_{cp} = \\frac{H}{\\sin\\theta} - y_{cp} = ${fmt(y_B)} - ${fmt(y_cp)} = ${fmt(d_B)}\\text{ ${length_unit}}$</li>`;
    } else {
        cp_formulas = `
            <li><strong>Longitud sumergida ($L_{sub}$):</strong> $L_{sub} = ${fmt(L_sub)}\\text{ ${length_unit}}$</li>
            <li><strong>Momento de Inercia sumergido ($I_{xx,cg}$):</strong> $I_{xx,cg} = \\frac{b \\cdot L_{sub}^3}{12} = \\frac{ ${b} \\cdot ${fmt(L_sub)}^3 }{12} = ${fmt(I_xx_cg)}\\text{ ${length_unit}}^4$</li>
            <li><strong>Centro de Presión ($y_{cp}$):</strong> $y_{cp} = y_{cg} + \\frac{I_{xx,cg}}{y_{cg} \\cdot A_{sub}} = \\frac{ L_{sub} }{ 2 } + \\frac{ L_{sub} }{ 6 } = \\frac{ 2 }{ 3 }L_{sub} = ${fmt(y_cp)}\\text{ ${length_unit}}$</li>
            <li><strong>Distancia a la articulación B ($d_B$):</strong> $d_B = L_{sub} - y_{cp} = \\frac{ 1 }{ 3 }L_{sub} = ${fmt(d_B)}\\text{ ${length_unit}}$</li>`;
    }

    proc.push(`
    <div class="step-card">
        <div class="step-num">Paso 4</div>
        <h3>Punto de Aplicación (Centro de Presión)</h3>
        <p>La fuerza resultante actúa en el centro de presión, el cual siempre se encuentra a mayor profundidad que el centroide geométrico debido al incremento lineal de la presión hidrostática:</p>
        <ul>${cp_formulas}</ul>
    </div>`);

    proc.push(`
    <div class="step-card">
        <div class="step-num">Paso 5</div>
        <h3>Equilibrio de Momentos (Fuerza $P$ en A)</h3>
        <p>Tomamos momentos alrededor de la articulación B para aislar la fuerza de reacción horizontal $P$ ejercida por la pared lisa en A. Como la pared es vertical y lisa, la fuerza de soporte es puramente horizontal hacia la izquierda:</p>
        <div class="formula-box">$$\\Sigma M_B = 0 \\implies P \\cdot dy - F_R \\cdot d_B = 0$$</div>
        <p>Despejando la magnitud $P$:</p>
        <div class="formula-box">$$P = \\frac{F_R \\cdot d_B}{dy} = \\frac{ ${fmt(F_R)} \\cdot ${fmt(d_B)} }{ ${dy} } = ${fmt(P)}\\text{ ${force_unit}}$$</div>
        <p>Por acción y reacción, la fuerza ejercida por la compuerta <strong>sobre la pared en A</strong> es horizontal hacia la derecha con magnitud $P = ${fmt(P)}\\text{ ${force_unit}}$.</p>
    </div>`);

    proc.push(`
    <div class="step-card">
        <div class="step-num">Paso 6</div>
        <h3>Reacciones en la Articulación B</h3>
        <p>Aplicamos las ecuaciones de equilibrio estático para encontrar las fuerzas horizontal y vertical en la charnela B:</p>
        <ul>
            <li><strong>Equilibrio de Fuerzas Horizontales:</strong>
                <br>$$\\Sigma F_x = 0 \\implies B_x - P + F_{R,x} = 0$$
                <br>$$B_x = P - F_{R,x} = ${fmt(P)} - ${fmt(F_Rx)} = ${fmt(B_x)}\\text{ ${force_unit}}$$
                <br><span class="direction-note">(${B_x >= 0 ? '' : 'Dirección corregida: '}actuando hacia la ${B_x >= 0 ? 'derecha' : 'izquierda'})</span>
            </li>
            <li><strong>Equilibrio de Fuerzas Verticales:</strong>
                <br>$$\\Sigma F_y = 0 \\implies B_y - F_{R,y} = 0$$
                <br>$$B_y = F_{R,y} = ${fmt(B_y)}\\text{ ${force_unit}}$$
                <br><span class="direction-note">(actuando hacia arriba)</span>
            </li>
            <li><strong>Fuerza Total Resultante en B:</strong>
                <br>$$B = \\sqrt{B_x^2 + B_y^2} = \\sqrt{ ${fmt(B_x)}^2 + ${fmt(B_y)}^2 } = ${fmt(B_mag)}\\text{ ${force_unit}}$$
                <br>con un ángulo de inclinación de $${fmt(B_angle)}^\\circ$ respecto al eje horizontal.
            </li>
        </ul>
    </div>`);

    const analysis_html = `
    <div class="analysis-card">
        <h3>Interpretación Física y Análisis de Sensibilidad</h3>
        <p>El comportamiento físico del sistema ante los parámetros dados revela lo siguiente:</p>
        <ol>
            <li>
                <strong>Desplazamiento del Centro de Presión:</strong> 
                El centro de presión (punto donde actúa la fuerza hidrostática total) se encuentra a un nivel 
                y<sub>cp</sub> = ${fmt(y_cp)} ${length_unit}, que está a una distancia de <strong>${fmt(y_cp - y_cg)} ${length_unit}</strong> por debajo del centroide geométrico de la sección sumergida (y<sub>cg</sub> = ${fmt(y_cg)} ${length_unit}). 
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
                La reacción de la pared lisa P es de ${fmt(P)} ${force_unit}. Esta fuerza equilibra el momento de rotación provocado por el agua. 
                Si cambiamos el ángulo de inclinación de la compuerta haciendo que sea más empinada (mayor dy, menor dx), el brazo de palanca de la fuerza de la pared (dy) aumenta, lo cual disminuye la fuerza horizontal necesaria en la pared para equilibrar el mismo momento torsor.
            </li>
            <li>
                <strong>Carga en la Charnela B:</strong>
                La charnela B experimenta una reacción vertical de ${fmt(B_y)} ${force_unit} y una reacción horizontal de ${fmt(B_x)} ${force_unit}.
                La fuerza horizontal en la charnela B<sub>x</sub> es de ${fmt(B_x)} ${force_unit}. Si B<sub>x</sub> es positiva, significa que el pasador empuja hacia la derecha para evitar el deslizamiento.
            </li>
        </ol>
    </div>`;

    return {
        geom: { L, theta_deg, A_total: L * b, A_sub, L_sub, submerged_status, is_fully_submerged },
        fluid: { fluid_name, gamma, density_unit, force_unit, pressure_unit, length_unit },
        results: { h_cg, p_cg, F_R, F_Rx, F_Ry, y_cg, y_cp, d_B, d_A, P, B_x, B_y, B_mag, B_angle },
        procedure_html: proc.join('\n'),
        analysis_html
    };
}

// Calcula y actualiza la UI completamente en el navegador (sin servidor)
function solve() {
    try {
        const data = fluidSolverJS(
            state.units, state.H, state.dx, state.dy, state.b,
            state.density_type, state.custom_density
        );

        updateResultsPanel(data);
        drawDiagram(data);

        procedureContent.innerHTML = data.procedure_html;
        analysisContent.innerHTML = data.analysis_html;

        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        if (activeTab === 'tab-procedure' && window.renderMathInElement) {
            renderMathInElement(procedureContent, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ]
            });
        }
    } catch (error) {
        console.error('Error al resolver:', error);
        resFR.textContent = "Error";
        resYCP.textContent = "Error";
        resP.textContent = "Error";
        resB.textContent = "Error";
    }
}

function updateResultsPanel(data) {
    const fUnit = data.fluid.force_unit;
    const lUnit = data.fluid.length_unit;

    // Mostrar magnitudes formateadas
    resFR.textContent = `${formatNum(data.results.F_R)} ${fUnit}`;
    resYCP.textContent = `${formatNum(data.results.y_cp)} ${lUnit}`;
    resP.textContent = `${formatNum(data.results.P)} ${fUnit}`;
    resB.textContent = `${formatNum(data.results.B_mag)} ${fUnit}`;

    // Estado sumergido badge
    submergedBadgeStatus.textContent = data.geom.submerged_status;
    if (data.geom.is_fully_submerged) {
        submergedBadgeStatus.style.background = 'rgba(0, 229, 255, 0.15)';
        submergedBadgeStatus.style.borderColor = 'rgba(0, 229, 255, 0.3)';
        submergedBadgeStatus.style.color = 'var(--accent-cyan)';
    } else {
        submergedBadgeStatus.style.background = 'rgba(244, 63, 94, 0.15)';
        submergedBadgeStatus.style.borderColor = 'rgba(244, 63, 94, 0.3)';
        submergedBadgeStatus.style.color = 'var(--accent-pink)';
    }
}

function formatNum(val) {
    return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Renderizado dinámico del SVG físico
function drawDiagram(data) {
    const svgGroup = document.getElementById('dynamic-group');
    svgGroup.innerHTML = ''; // Limpiar dibujo anterior

    const H = state.H;
    const dx = state.dx;
    const dy = state.dy;
    const isSub = data.geom.is_fully_submerged;

    const theta_rad = Math.atan2(dy, dx);
    const cos_t = Math.cos(theta_rad);
    const sin_t = Math.sin(theta_rad);

    // Dimensiones en pixeles de la compuerta y agua
    // Escala dinámica para ajustar todo en el viewBox (800x600)
    // El punto de la bisagra B estará fijo en (250, 500)
    const bx = 250;
    const by = 500;

    const scale = Math.min(500 / dx, 420 / Math.max(H, dy));

    const dx_px = dx * scale;
    const dy_px = dy * scale;
    const H_px = H * scale;

    const ax = bx + dx_px;
    const ay = by - dy_px; // y en SVG es invertido

    // 1. Dibujar el agua (Polígono translúcido)
    let waterPoints = "";
    const tankLeft = 80;

    if (isSub) {
        // Agua llega por encima de la compuerta
        const waterY = by - H_px;
        waterPoints = `${tankLeft},${by} ${bx},${by} ${ax},${ay} ${ax},${waterY} ${tankLeft},${waterY}`;
    } else {
        // Parcialmente sumergido: el agua intersecta la compuerta a altura H_px
        const waterY = by - H_px;
        // Distancia horizontal desde B hasta la superficie en la compuerta: H_px / tan(theta)
        const sub_x = H_px / Math.tan(theta_rad);
        const interX = bx + sub_x;
        const interY = waterY;
        waterPoints = `${tankLeft},${by} ${bx},${by} ${interX},${interY} ${tankLeft},${interY}`;
    }

    const waterPoly = createSVGElement('polygon', {
        points: waterPoints,
        fill: 'url(#water-grad)',
        stroke: 'none'
    });
    svgGroup.appendChild(waterPoly);

    // 1.1 Línea de la superficie del agua (wavy effect)
    const waterY = by - H_px;
    const waterWidth = (isSub ? ax : (bx + H_px / Math.tan(theta_rad))) - tankLeft;
    const wavePathStr = getWavePath(tankLeft, waterY, waterWidth);
    const waterSurface = createSVGElement('path', {
        d: wavePathStr,
        stroke: '#00e5ff',
        'stroke-width': 2.5,
        fill: 'none'
    });
    svgGroup.appendChild(waterSurface);

    // Simbolo de la superficie del agua (triángulo y líneas horizontales estándar)
    const symX = tankLeft + 40;
    const symY = waterY - 8;
    const waterSymbol = createSVGElement('g', {
        stroke: '#00e5ff',
        'stroke-width': 1.5,
        fill: 'none'
    });
    waterSymbol.innerHTML = `
        <line x1="${symX - 10}" y1="${symY}" x2="${symX + 10}" y2="${symY}" />
        <line x1="${symX - 7}" y1="${symY + 4}" x2="${symX + 7}" y2="${symY + 4}" />
        <line x1="${symX - 4}" y1="${symY + 8}" x2="${symX + 4}" y2="${symY + 8}" />
        <polygon points="${symX - 4},${symY} ${symX + 4},${symY} ${symX},${symY - 6}" fill="#00e5ff" stroke="none" />
    `;
    svgGroup.appendChild(waterSymbol);

    // 2. Dibujar el Suelo / Tanque Izquierdo
    const floor = createSVGElement('line', {
        x1: tankLeft,
        y1: by,
        x2: bx,
        y2: by,
        stroke: '#455a64',
        'stroke-width': 4
    });
    svgGroup.appendChild(floor);

    // 3. Dibujar la pared lisa en A
    // La pared es vertical, comienza en A (ax, ay) y va hacia arriba
    const wall = createSVGElement('rect', {
        x: ax,
        y: 50,
        width: 35,
        height: ay - 50,
        fill: '#37474f',
        stroke: '#455a64',
        'stroke-width': 2
    });
    svgGroup.appendChild(wall);

    // Línea de contacto lisa vertical en la pared (cara izquierda)
    const wallContact = createSVGElement('line', {
        x1: ax,
        y1: ay,
        x2: ax,
        y2: 50,
        stroke: '#cfd8dc',
        'stroke-width': 2
    });
    svgGroup.appendChild(wallContact);

    // 4. Prisma de Presión Hidrostática
    // Normal unitaria apuntando hacia el agua (izquierda y arriba en pantalla): (-sin_t, -cos_t)
    const nx = -sin_t;
    const ny = -cos_t;

    // Ancho visual máximo del prisma: 90 píxeles para presión máxima (a profundidad H)
    const maxPrismW = 90;

    let pressurePoints = [];
    let pressureArrows = [];

    if (isSub) {
        // Totalmente sumergida
        // Presión en la base B (h=H): magnitud maxPrismW
        const pBx = bx + nx * maxPrismW;
        const pBy = by + ny * maxPrismW;

        // Presión en el tope A (h = H - dy): magnitud proporcional
        const pRatioA = (H - dy) / H;
        const prismWA = maxPrismW * pRatioA;
        const pAx = ax + nx * prismWA;
        const pAy = ay + ny * prismWA;

        pressurePoints = `${bx},${by} ${pBx},${pBy} ${pAx},${pAy} ${ax},${ay}`;

        // Generar flechas de distribución internas (4 flechas)
        const steps = 4;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps; // Interpola a lo largo de la compuerta de B a A
            const gx = bx + t * dx_px;
            const gy = by - t * dy_px;

            // Profundidad interpolada
            const depthRatio = (H - t * dy) / H;
            const arrLen = maxPrismW * depthRatio;

            const sx = gx + nx * arrLen;
            const sy = gy + ny * arrLen;

            pressureArrows.push({ x1: sx, y1: sy, x2: gx, y2: gy });
        }
    } else {
        // Parcialmente sumergida
        // Intersección con el agua
        const sub_len_px = H_px / sin_t;
        const ix = bx + sub_len_px * cos_t;
        const iy = by - sub_len_px * sin_t;

        // Presión en B (h=H): maxPrismW
        const pBx = bx + nx * maxPrismW;
        const pBy = by + ny * maxPrismW;

        // En la intersección con el agua la presión es 0
        pressurePoints = `${bx},${by} ${pBx},${pBy} ${ix},${iy}`;

        // Generar flechas (4 flechas)
        const steps = 4;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps; // Interpola desde B hasta la intersección
            const gx = bx + t * (ix - bx);
            const gy = by + t * (iy - by);

            const arrLen = maxPrismW * (1 - t); // disminuye a 0 en la superficie

            if (arrLen > 2) {
                const sx = gx + nx * arrLen;
                const sy = gy + ny * arrLen;
                pressureArrows.push({ x1: sx, y1: sy, x2: gx, y2: gy });
            }
        }
    }

    // Dibujar polígono del prisma
    const prismPoly = createSVGElement('polygon', {
        points: pressurePoints,
        fill: 'url(#pressure-grad)',
        stroke: 'rgba(255, 152, 0, 0.4)',
        'stroke-width': 1.5
    });
    svgGroup.appendChild(prismPoly);

    // Dibujar flechas del prisma
    pressureArrows.forEach(arr => {
        const line = createSVGElement('line', {
            x1: arr.x1,
            y1: arr.y1,
            x2: arr.x2,
            y2: arr.y2,
            stroke: 'rgba(255, 255, 255, 0.45)',
            'stroke-width': 1.2,
            marker: 'url(#arrow-pressure)'
        });
        svgGroup.appendChild(line);
    });

    // 5. Dibujar la Compuerta (Estructura de metal rígido)
    const gateObj = createSVGElement('line', {
        x1: bx,
        y1: by,
        x2: ax,
        y2: ay,
        stroke: 'url(#gate-grad)',
        'stroke-width': 12,
        'stroke-linecap': 'round'
    });
    svgGroup.appendChild(gateObj);

    // Línea de eje central de la compuerta para aspecto técnico
    const gateCenterLine = createSVGElement('line', {
        x1: bx,
        y1: by,
        x2: ax,
        y2: ay,
        stroke: '#37474f',
        'stroke-width': 1,
        'stroke-dasharray': '5,3'
    });
    svgGroup.appendChild(gateCenterLine);

    // 6. Soportes (Charnela B y Contacto A)
    // Triángulo soporte en B
    const supportB = createSVGElement('polygon', {
        points: `${bx},${by} ${bx - 15},${by + 22} ${bx + 15},${by + 22}`,
        fill: '#546e7a',
        stroke: '#37474f',
        'stroke-width': 1.5
    });
    svgGroup.appendChild(supportB);

    // Línea de suelo bajo el soporte B (hatching effect)
    const hatchLine = createSVGElement('line', {
        x1: bx - 20,
        y1: by + 22,
        x2: bx + 20,
        y2: + by + 22,
        stroke: '#37474f',
        'stroke-width': 3
    });
    svgGroup.appendChild(hatchLine);

    // Perno de la bisagra en B
    const pinB = createSVGElement('circle', {
        cx: bx,
        cy: by,
        r: 6,
        fill: '#eceff1',
        stroke: '#37474f',
        'stroke-width': 2
    });
    svgGroup.appendChild(pinB);

    // Rodillo / Contacto suave en A (Pequeño círculo en A)
    const rollerA = createSVGElement('circle', {
        cx: ax,
        cy: ay,
        r: 5,
        fill: '#cfd8dc',
        stroke: '#37474f',
        'stroke-width': 1.5
    });
    svgGroup.appendChild(rollerA);

    // 7. VECTORES DE FUERZA (F_R, P, B_x, B_y)
    // Escala para los vectores de fuerza
    // Queremos que la fuerza máxima tenga un tamaño de unos 120px en la pantalla
    const F_R_val = data.results.F_R;
    const P_val = data.results.P;
    const Bx_val = data.results.B_x;
    const By_val = data.results.B_y;
    const Bmag = data.results.B_mag;

    const maxF = Math.max(F_R_val, P_val, Bmag);
    const f_scale = maxF > 0 ? 120 / maxF : 1;

    // A. Fuerza Hidrostática F_R
    // Se aplica en el centro de presión CP
    const dB_px = data.results.d_B * scale;
    // CP está a una distancia dB_px desde B a lo largo de la compuerta
    const cpx = bx + dB_px * cos_t;
    const cpy = by - dB_px * sin_t;

    // Vector F_R normal apuntando hacia el gate (abajo y derecha): (sin_t, cos_t)
    // El vector entra en la compuerta, así que la flecha termina en (cpx, cpy)
    const lenFR = F_R_val * f_scale;
    const startFR_x = cpx - lenFR * sin_t;
    const startFR_y = cpy - lenFR * cos_t;

    const arrowFR = createSVGElement('line', {
        x1: startFR_x,
        y1: startFR_y,
        x2: cpx,
        y2: cpy,
        stroke: 'var(--color-fr)',
        'stroke-width': 3.5,
        marker: 'url(#arrow-red)'
    });
    svgGroup.appendChild(arrowFR);

    // Etiqueta F_R
    const lblFR = createSVGElement('text', {
        x: startFR_x - 15 * sin_t - 20,
        y: startFR_y - 15 * cos_t,
        fill: 'var(--color-fr)',
        'font-size': '14px',
        'font-weight': 'bold'
    });
    lblFR.textContent = `F_R = ${formatNum(F_R_val)} ${data.fluid.force_unit}`;
    svgGroup.appendChild(lblFR);

    // Punto del centro de presión
    const cpPoint = createSVGElement('circle', {
        cx: cpx,
        cy: cpy,
        r: 3.5,
        fill: '#fff',
        stroke: 'var(--color-fr)',
        'stroke-width': 1.5
    });
    svgGroup.appendChild(cpPoint);

    // Línea indicadora para etiquetar CP
    const cpText = createSVGElement('text', {
        x: cpx + 20,
        y: cpy + 15,
        fill: '#94a3b8',
        'font-size': '11px'
    });
    cpText.innerHTML = `CP (y<sub>cp</sub>)`;
    svgGroup.appendChild(cpText);

    // B. Fuerza P (Apoyo pared A)
    // Actúa sobre la compuerta horizontalmente hacia la izquierda
    // Termina en A (ax, ay)
    const lenP = P_val * f_scale;
    const startP_x = ax + lenP;
    const startP_y = ay;

    const arrowP = createSVGElement('line', {
        x1: startP_x,
        y1: startP_y,
        x2: ax,
        y2: ay,
        stroke: 'var(--color-p)',
        'stroke-width': 3,
        marker: 'url(#arrow-green)'
    });
    svgGroup.appendChild(arrowP);

    // Etiqueta P
    const lblP = createSVGElement('text', {
        x: startP_x + 10,
        y: startP_y - 8,
        fill: 'var(--color-p)',
        'font-size': '13px',
        'font-weight': 'bold'
    });
    lblP.textContent = `P = ${formatNum(P_val)} ${data.fluid.force_unit}`;
    svgGroup.appendChild(lblP);

    // C. Reacciones en la Charnela B (Bx, By)
    // Dibujados partiendo de B (bx, by) hacia afuera

    // Horizontal Bx
    const lenBx = Math.abs(Bx_val) * f_scale;
    const endBx_x = Bx_val >= 0 ? bx + lenBx : bx - lenBx;
    const arrowBx = createSVGElement('line', {
        x1: bx,
        y1: by,
        x2: endBx_x,
        y2: by,
        stroke: 'var(--color-b)',
        'stroke-width': 2.5,
        marker: 'url(#arrow-purple)'
    });
    svgGroup.appendChild(arrowBx);

    // Etiqueta Bx
    const lblBx = createSVGElement('text', {
        x: Bx_val >= 0 ? endBx_x + 8 : endBx_x - 30,
        y: by + 16,
        fill: 'var(--color-b)',
        'font-size': '12px'
    });
    lblBx.textContent = `Bx = ${formatNum(Bx_val)} ${data.fluid.force_unit}`;
    svgGroup.appendChild(lblBx);

    // Vertical By
    const lenBy = Math.abs(By_val) * f_scale;
    const endBy_y = By_val >= 0 ? by - lenBy : by + lenBy; // en SVG arriba es restar
    const arrowBy = createSVGElement('line', {
        x1: bx,
        y1: by,
        x2: bx,
        y2: endBy_y,
        stroke: 'var(--color-b)',
        'stroke-width': 2.5,
        marker: 'url(#arrow-purple)'
    });
    svgGroup.appendChild(arrowBy);

    // Etiqueta By
    const lblBy = createSVGElement('text', {
        x: bx - 70,
        y: endBy_y - 8,
        fill: 'var(--color-b)',
        'font-size': '12px'
    });
    lblBy.textContent = `By = ${formatNum(By_val)} ${data.fluid.force_unit}`;
    svgGroup.appendChild(lblBy);

    // 8. Líneas de Cota / Geométricas (Dimlines)
    const labelUnit = data.fluid.length_unit;

    // Cota H (Izquierda)
    const dimHX = tankLeft - 30;
    drawDimensionLine(svgGroup, dimHX, by, dimHX, by - H_px, `H = ${H.toFixed(1)} ${labelUnit}`, 'vertical', 'left');

    // Cota dy (Derecha de la compuerta, cerca del rodillo)
    const dimDyX = ax + 55;
    drawDimensionLine(svgGroup, dimDyX, by, dimDyX, ay, `dy = ${dy.toFixed(1)} ${labelUnit}`, 'vertical', 'right');

    // Cota dx (Horizontal inferior, desde B a la vertical de A)
    const dimDxY = by + 40;
    drawDimensionLine(svgGroup, bx, dimDxY, ax, dimDxY, `dx = ${dx.toFixed(1)} ${labelUnit}`, 'horizontal', 'bottom');

    // Línea de referencia vertical para la cota dx
    const refLineA = createSVGElement('line', {
        x1: ax,
        y1: ay + 5,
        x2: ax,
        y2: dimDxY + 10,
        stroke: 'rgba(255, 255, 255, 0.15)',
        'stroke-width': 1,
        'stroke-dasharray': '2,2'
    });
    svgGroup.appendChild(refLineA);
}

// Genera un trazado de olas decorativo para la superficie libre del agua
function getWavePath(startX, y, width) {
    const waveLength = 25;
    const waveHeight = 3;
    const steps = Math.ceil(width / waveLength);
    let path = `M ${startX},${y}`;

    for (let i = 0; i < steps; i++) {
        const x1 = startX + i * waveLength + waveLength / 2;
        const y1 = y - waveHeight;
        const x2 = startX + (i + 1) * waveLength;
        const y2 = y;
        path += ` Q ${x1},${y1} ${x2},${y2}`;
    }

    return path;
}

// Helper para crear elementos SVG de forma elegante
function createSVGElement(type, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', type);
    for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
    return element;
}

// Función auxiliar para dibujar líneas de dimensión de aspecto técnico
function drawDimensionLine(group, x1, y1, x2, y2, text, orientation, side) {
    // Línea de cota principal
    const dimLine = createSVGElement('line', {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        stroke: '#94a3b8',
        'stroke-width': 1,
        'stroke-dasharray': '3,3'
    });
    group.appendChild(dimLine);

    // Ticks en los extremos
    const tickLen = 6;
    if (orientation === 'vertical') {
        const tick1 = createSVGElement('line', { x1: x1 - tickLen, y1: y1, x2: x1 + tickLen, y2: y1, stroke: '#94a3b8', 'stroke-width': 1 });
        const tick2 = createSVGElement('line', { x1: x2 - tickLen, y1: y2, x2: x2 + tickLen, y2: y2, stroke: '#94a3b8', 'stroke-width': 1 });
        group.appendChild(tick1);
        group.appendChild(tick2);

        // Texto centrado al lado
        const txtX = side === 'left' ? x1 - 10 : x1 + 10;
        const txtY = (y1 + y2) / 2 + 4;
        const txt = createSVGElement('text', {
            x: txtX,
            y: txtY,
            fill: '#94a3b8',
            'font-size': '12px',
            'text-anchor': side === 'left' ? 'end' : 'start'
        });
        txt.textContent = text;
        group.appendChild(txt);
    } else {
        const tick1 = createSVGElement('line', { x1: x1, y1: y1 - tickLen, x2: x1, y2: y1 + tickLen, stroke: '#94a3b8', 'stroke-width': 1 });
        const tick2 = createSVGElement('line', { x1: x2, y1: y2 - tickLen, x2: x2, y2: y2 + tickLen, stroke: '#94a3b8', 'stroke-width': 1 });
        group.appendChild(tick1);
        group.appendChild(tick2);

        // Texto centrado arriba/abajo
        const txtX = (x1 + x2) / 2;
        const txtY = side === 'top' ? y1 - 10 : y1 + 18;
        const txt = createSVGElement('text', {
            x: txtX,
            y: txtY,
            fill: '#94a3b8',
            'font-size': '12px',
            'text-anchor': 'middle'
        });
        txt.textContent = text;
        group.appendChild(txt);
    }
}

// Iniciar aplicación al cargar
window.addEventListener('DOMContentLoaded', init);
