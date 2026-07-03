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

const resFR = document.getElementById('res-FR');
const resYCP = document.getElementById('res-ycp');
const resP = document.getElementById('res-P');
const resB = document.getElementById('res-B');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const procedureContent = document.getElementById('procedure-content');
const analysisContent = document.getElementById('analysis-content');

const manualInputs = {};
let warningBox = null;

const fieldLabels = {
    H: 'Altura del fluido H',
    dx: 'Distancia horizontal dx',
    dy: 'Distancia vertical dy',
    b: 'Ancho b'
};

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
    bindNumericControl('H', paramH, valHDisplay);
    bindNumericControl('dx', paramDx, valDxDisplay);
    bindNumericControl('dy', paramDy, valDyDisplay);
    bindNumericControl('b', paramB, valBDisplay);

    fluidSelect.addEventListener('change', (e) => {
        state.density_type = e.target.value;

        if (state.density_type === 'custom') {
            customDensityContainer.classList.remove('hidden');
            state.custom_density = parseManualNumber(customDensityInput.value);
        } else {
            customDensityContainer.classList.add('hidden');
            markInvalid(customDensityInput, false);
        }

        solve();
    });

    customDensityInput.addEventListener('input', (e) => {
        const value = parseManualNumber(e.target.value);

        if (!Number.isFinite(value) || value <= 0) {
            showWarning('La densidad personalizada debe ser un número mayor que 0.');
            markInvalid(customDensityInput, true);
            setResultsAsInvalid();
            return;
        }

        state.custom_density = value;
        markInvalid(customDensityInput, false);
        clearWarning();
        solve();
    });

    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newUnit = e.target.dataset.unit;
            if (newUnit !== state.units) toggleUnits(newUnit);
        });
    });

    btnResetExample.addEventListener('click', resetToExample);

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');

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

function bindNumericControl(key, slider, display) {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `manual-${key}`;
    input.className = 'manual-param-input';
    input.setAttribute('aria-label', fieldLabels[key]);

    manualInputs[key] = input;
    display.insertAdjacentElement('afterend', input);

    slider.addEventListener('input', (e) => {
        updateNumericState(key, parseFloat(e.target.value), 'slider');
    });

    input.addEventListener('input', (e) => {
        updateNumericState(key, parseManualNumber(e.target.value), 'manual');
    });
}

function parseManualNumber(value) {
    if (typeof value !== 'string') return NaN;
    return parseFloat(value.replace(',', '.'));
}

function updateNumericState(key, value, source) {
    const validation = validateNumericField(key, value);
    const slider = getSliderByKey(key);
    const input = manualInputs[key];

    if (!validation.ok) {
        showWarning(validation.message);
        markInvalid(slider, true);
        markInvalid(input, true);
        setResultsAsInvalid();
        return;
    }

    state[key] = value;

    markInvalid(slider, false);
    markInvalid(input, false);
    clearWarning();

    if (source !== 'slider') slider.value = value;
    if (source !== 'manual') input.value = formatInputValue(value);

    updateFieldDisplay(key);
    solve();
}

function validateNumericField(key, value) {
    if (!Number.isFinite(value)) {
        return { ok: false, message: `${fieldLabels[key]} debe ser un número válido.` };
    }

    const limit = limits[state.units][key];
    const unit = state.units === 'US' ? 'ft' : 'm';

    if (value < limit.min || value > limit.max) {
        return {
            ok: false,
            message: `${fieldLabels[key]} debe estar entre ${limit.min} y ${limit.max} ${unit}.`
        };
    }

    return { ok: true };
}

function validateState() {
    for (const key of ['H', 'dx', 'dy', 'b']) {
        const validation = validateNumericField(key, state[key]);
        if (!validation.ok) return validation;
    }

    if (state.density_type === 'custom') {
        if (!Number.isFinite(state.custom_density) || state.custom_density <= 0) {
            return { ok: false, message: 'La densidad personalizada debe ser un número mayor que 0.' };
        }
    }

    return { ok: true };
}

function updateUIFromState() {
    const currentLimits = limits[state.units];

    densityUnitLabel.textContent = state.units === 'US' ? 'lbf/ft³' : 'kg/m³';

    updateSliderRange(paramH, currentLimits.H, state.H);
    updateSliderRange(paramDx, currentLimits.dx, state.dx);
    updateSliderRange(paramDy, currentLimits.dy, state.dy);
    updateSliderRange(paramB, currentLimits.b, state.b);

    syncManualInput('H');
    syncManualInput('dx');
    syncManualInput('dy');
    syncManualInput('b');

    updateFieldDisplay('H');
    updateFieldDisplay('dx');
    updateFieldDisplay('dy');
    updateFieldDisplay('b');

    fluidSelect.value = state.density_type;

    if (state.units === 'US') {
        fluidSelect.options[0].text = 'Agua Marina (64.0 lbf/ft³)';
        fluidSelect.options[1].text = 'Agua Dulce (62.4 lbf/ft³)';
    } else {
        fluidSelect.options[0].text = 'Agua Marina (1025.0 kg/m³)';
        fluidSelect.options[1].text = 'Agua Dulce (1000.0 kg/m³)';
    }

    if (state.density_type === 'custom') {
        customDensityContainer.classList.remove('hidden');
        customDensityInput.value = formatInputValue(state.custom_density);
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

function syncManualInput(key) {
    const input = manualInputs[key];
    if (!input) return;

    const limit = limits[state.units][key];
    input.min = limit.min;
    input.max = limit.max;
    input.step = limit.step;
    input.value = formatInputValue(state[key]);
}

function updateFieldDisplay(key) {
    const unitSuf = state.units === 'US' ? 'ft' : 'm';
    const displays = {
        H: valHDisplay,
        dx: valDxDisplay,
        dy: valDyDisplay,
        b: valBDisplay
    };

    displays[key].textContent = `${state[key].toFixed(1)} ${unitSuf}`;
}

function toggleUnits(newUnit) {
    const oldUnit = state.units;
    state.units = newUnit;

    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === newUnit);
    });

    if (newUnit === 'SI' && oldUnit === 'US') {
        state.H *= 0.3048;
        state.dx *= 0.3048;
        state.dy *= 0.3048;
        state.b *= 0.3048;
        state.custom_density = state.density_type === 'custom'
            ? state.custom_density * 16.0185
            : 1025.0;
    } else if (newUnit === 'US' && oldUnit === 'SI') {
        state.H /= 0.3048;
        state.dx /= 0.3048;
        state.dy /= 0.3048;
        state.b /= 0.3048;
        state.custom_density = state.density_type === 'custom'
            ? state.custom_density / 16.0185
            : 64.0;
    }

    const curLimits = limits[newUnit];
    state.H = clamp(state.H, curLimits.H.min, curLimits.H.max);
    state.dx = clamp(state.dx, curLimits.dx.min, curLimits.dx.max);
    state.dy = clamp(state.dy, curLimits.dy.min, curLimits.dy.max);
    state.b = clamp(state.b, curLimits.b.min, curLimits.b.max);

    updateUIFromState();
    solve();
}

function resetToExample() {
    state = {
        units: 'US',
        H: 15.0,
        dx: 8.0,
        dy: 6.0,
        b: 5.0,
        density_type: 'seawater',
        custom_density: 64.0
    };

    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === 'US');
    });

    fluidSelect.value = 'seawater';
    clearWarning();
    updateUIFromState();
    solve();
}

function fluidSolverJS(units, H, dx, dy, b, density_type, custom_density) {
    const g = 9.81;
    let gamma, rho, fluid_name, density_unit, force_unit, pressure_unit, length_unit, area_unit;

    if (units === 'US') {
        if (density_type === 'seawater') {
            gamma = 64.0;
            fluid_name = 'Agua Marina';
        } else if (density_type === 'freshwater') {
            gamma = 62.4;
            fluid_name = 'Agua Dulce';
        } else {
            gamma = custom_density;
            fluid_name = 'Fluido Personalizado';
        }

        rho = null;
        density_unit = 'lbf/ft³';
        force_unit = 'lbf';
        pressure_unit = 'lbf/ft²';
        length_unit = 'ft';
        area_unit = 'ft²';
    } else {
        if (density_type === 'seawater') {
            rho = 1025.0;
            fluid_name = 'Agua Marina';
        } else if (density_type === 'freshwater') {
            rho = 1000.0;
            fluid_name = 'Agua Dulce';
        } else {
            rho = custom_density;
            fluid_name = 'Fluido Personalizado';
        }

        gamma = rho * g;
        density_unit = 'kg/m³';
        force_unit = 'N';
        pressure_unit = 'Pa (N/m²)';
        length_unit = 'm';
        area_unit = 'm²';
    }

    const L = Math.sqrt(dx * dx + dy * dy);
    const theta_rad = Math.atan2(dy, dx);
    const theta_deg = theta_rad * 180 / Math.PI;
    const sin_theta = Math.sin(theta_rad);
    const cos_theta = Math.cos(theta_rad);

    let submerged_status, is_fully_submerged;
    let h_A, h_B, h_cg, L_sub, A_sub, y_cg, y_B, y_A, y_cp, d_B, d_A, I_xx_cg;

    if (H >= dy) {
        submerged_status = 'Totalmente Sumergida';
        is_fully_submerged = true;

        h_A = H - dy;
        h_B = H;
        h_cg = (h_A + h_B) / 2.0;
        L_sub = L;
        A_sub = L_sub * b;
        y_cg = h_cg / sin_theta;
        y_B = h_B / sin_theta;
        y_A = h_A / sin_theta;
        I_xx_cg = (b * Math.pow(L_sub, 3)) / 12.0;
        y_cp = y_cg + I_xx_cg / (y_cg * A_sub);
        d_B = y_B - y_cp;
        d_A = y_cp - y_A;
    } else {
        submerged_status = 'Parcialmente Sumergida';
        is_fully_submerged = false;

        h_A = 0;
        h_B = H;
        h_cg = H / 2.0;
        L_sub = H / sin_theta;
        A_sub = L_sub * b;
        y_cg = L_sub / 2.0;
        y_B = L_sub;
        y_A = 0;
        I_xx_cg = (b * Math.pow(L_sub, 3)) / 12.0;
        y_cp = y_cg + I_xx_cg / (y_cg * A_sub);
        d_B = y_B - y_cp;
        d_A = L - d_B;
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

    const procedure_html = buildProcedureHTML({
        units, H, dx, dy, b, gamma, rho, fluid_name, density_unit,
        force_unit, pressure_unit, length_unit, area_unit, L, theta_deg,
        submerged_status, is_fully_submerged, h_A, h_B, h_cg, L_sub,
        A_sub, y_cg, y_cp, d_B, I_xx_cg, p_cg, F_R, F_Rx, F_Ry,
        P, B_x, B_y, B_mag
    });

    const analysis_html = buildAnalysisHTML({
        force_unit, length_unit, pressure_unit, fluid_name, gamma,
        F_R, y_cp, P, B_mag, B_angle, submerged_status
    });

    return {
        fluid: {
            gamma, rho, fluid_name, density_unit,
            force_unit, pressure_unit, length_unit, area_unit
        },
        geom: {
            L, theta_rad, theta_deg, sin_theta, cos_theta,
            submerged_status, is_fully_submerged,
            h_A, h_B, h_cg, L_sub, A_sub, y_cg, y_B, y_A,
            y_cp, d_B, d_A, I_xx_cg
        },
        results: {
            p_cg, F_R, F_Rx, F_Ry, P, B_x, B_y, B_mag, B_angle,
            y_cp, d_B
        },
        procedure_html,
        analysis_html
    };
}

function buildProcedureHTML(data) {
    return `
        <div class="step-card">
            <div class="step-num">Paso 1</div>
            <h3>Geometría de la compuerta</h3>
            <p>Se calcula la longitud inclinada y el ángulo de la compuerta.</p>
            <ul>
                <li><strong>Longitud:</strong> $L = \\sqrt{dx^2 + dy^2} = ${fmt(data.L)}\\text{ ${data.length_unit}}$</li>
                <li><strong>Ángulo:</strong> $\\theta = \\tan^{-1}(dy/dx) = ${fmt(data.theta_deg)}^\\circ$</li>
                <li><strong>Área sumergida:</strong> $A_{sub} = ${fmt(data.A_sub)}\\text{ ${data.area_unit}}$</li>
            </ul>
        </div>

        <div class="step-card">
            <div class="step-num">Paso 2</div>
            <h3>Condición de sumergimiento</h3>
            <p>La compuerta está <strong>${data.submerged_status.toLowerCase()}</strong>.</p>
            <ul>
                <li><strong>Profundidad al centroide:</strong> $h_{cg} = ${fmt(data.h_cg)}\\text{ ${data.length_unit}}$</li>
                <li><strong>Longitud sumergida:</strong> $L_{sub} = ${fmt(data.L_sub)}\\text{ ${data.length_unit}}$</li>
            </ul>
        </div>

        <div class="step-card">
            <div class="step-num">Paso 3</div>
            <h3>Fuerza hidrostática</h3>
            <ul>
                <li><strong>Peso específico:</strong> $\\gamma = ${fmt(data.gamma)}\\text{ ${data.density_unit}}$</li>
                <li><strong>Presión en el centroide:</strong> $p_{cg} = \\gamma h_{cg} = ${fmt(data.p_cg)}\\text{ ${data.pressure_unit}}$</li>
                <li><strong>Fuerza resultante:</strong> $F_R = p_{cg} A_{sub} = ${fmt(data.F_R)}\\text{ ${data.force_unit}}$</li>
            </ul>
        </div>

        <div class="step-card">
            <div class="step-num">Paso 4</div>
            <h3>Centro de presión</h3>
            <ul>
                <li><strong>Centro de presión:</strong> $y_{cp} = ${fmt(data.y_cp)}\\text{ ${data.length_unit}}$</li>
                <li><strong>Distancia a la articulación B:</strong> $d_B = ${fmt(data.d_B)}\\text{ ${data.length_unit}}$</li>
            </ul>
        </div>

        <div class="step-card">
            <div class="step-num">Paso 5</div>
            <h3>Equilibrio de la compuerta</h3>
            <ul>
                <li><strong>Fuerza de apoyo en A:</strong> $P = ${fmt(data.P)}\\text{ ${data.force_unit}}$</li>
                <li><strong>Reacción horizontal en B:</strong> $B_x = ${fmt(data.B_x)}\\text{ ${data.force_unit}}$</li>
                <li><strong>Reacción vertical en B:</strong> $B_y = ${fmt(data.B_y)}\\text{ ${data.force_unit}}$</li>
                <li><strong>Magnitud de reacción en B:</strong> $B = ${fmt(data.B_mag)}\\text{ ${data.force_unit}}$</li>
            </ul>
        </div>
    `;
}

function buildAnalysisHTML(data) {
    return `
        <div class="analysis-card">
            <h3>Resumen del análisis</h3>
            <p>Fluido seleccionado: <strong>${data.fluid_name}</strong>.</p>
            <p>Estado de la compuerta: <strong>${data.submerged_status}</strong>.</p>
            <ul>
                <li><strong>Fuerza resultante:</strong> ${formatNum(data.F_R)} ${data.force_unit}</li>
                <li><strong>Centro de presión:</strong> ${formatNum(data.y_cp)} ${data.length_unit}</li>
                <li><strong>Fuerza P:</strong> ${formatNum(data.P)} ${data.force_unit}</li>
                <li><strong>Reacción en B:</strong> ${formatNum(data.B_mag)} ${data.force_unit}</li>
                <li><strong>Ángulo de reacción en B:</strong> ${formatNum(data.B_angle)}°</li>
            </ul>
        </div>
    `;
}

function solve() {
    const validation = validateState();

    if (!validation.ok) {
        showWarning(validation.message);
        setResultsAsInvalid();
        return;
    }

    clearWarning();

    try {
        const data = fluidSolverJS(
            state.units,
            state.H,
            state.dx,
            state.dy,
            state.b,
            state.density_type,
            state.custom_density
        );

        updateResultsPanel(data);
        drawDiagram(data);

        procedureContent.innerHTML = data.procedure_html;
        analysisContent.innerHTML = data.analysis_html;

        const activeBtn = document.querySelector('.tab-btn.active');
        const activeTab = activeBtn ? activeBtn.dataset.tab : null;

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
        showWarning('Ocurrió un error durante el cálculo. Revisa los datos ingresados.');
        setResultsAsInvalid();
    }
}

function updateResultsPanel(data) {
    const fUnit = data.fluid.force_unit;
    const lUnit = data.fluid.length_unit;

    resFR.textContent = `${formatNum(data.results.F_R)} ${fUnit}`;
    resYCP.textContent = `${formatNum(data.results.y_cp)} ${lUnit}`;
    resP.textContent = `${formatNum(data.results.P)} ${fUnit}`;
    resB.textContent = `${formatNum(data.results.B_mag)} ${fUnit}`;

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

function drawDiagram(data) {
    const svgGroup = document.getElementById('dynamic-group');
    if (!svgGroup) return;

    svgGroup.innerHTML = '';

    const H = state.H;
    const dx = state.dx;
    const dy = state.dy;

    const bx = 250;
    const by = 500;
    const scale = Math.min(500 / dx, 420 / Math.max(H, dy));

    const dx_px = dx * scale;
    const dy_px = dy * scale;
    const H_px = H * scale;

    const ax = bx + dx_px;
    const ay = by - dy_px;
    const tankLeft = 80;
    const waterY = by - H_px;

    const water = createSVGElement('polygon', {
        points: `${tankLeft},${by} ${bx},${by} ${ax},${ay} ${ax},${waterY} ${tankLeft},${waterY}`,
        fill: 'url(#water-grad)',
        stroke: 'none'
    });
    svgGroup.appendChild(water);

    const floor = createSVGElement('line', {
        x1: tankLeft,
        y1: by,
        x2: bx + dx_px + 80,
        y2: by,
        stroke: '#455a64',
        'stroke-width': 4
    });
    svgGroup.appendChild(floor);

    const wall = createSVGElement('rect', {
        x: ax,
        y: 50,
        width: 35,
        height: Math.max(0, ay - 50),
        fill: '#37474f',
        stroke: '#455a64',
        'stroke-width': 2
    });
    svgGroup.appendChild(wall);

    const gate = createSVGElement('line', {
        x1: bx,
        y1: by,
        x2: ax,
        y2: ay,
        stroke: 'url(#gate-grad)',
        'stroke-width': 12,
        'stroke-linecap': 'round'
    });
    svgGroup.appendChild(gate);

    const pinB = createSVGElement('circle', {
        cx: bx,
        cy: by,
        r: 7,
        fill: '#eceff1',
        stroke: '#37474f',
        'stroke-width': 2
    });
    svgGroup.appendChild(pinB);

    const rollerA = createSVGElement('circle', {
        cx: ax,
        cy: ay,
        r: 6,
        fill: '#cfd8dc',
        stroke: '#37474f',
        'stroke-width': 2
    });
    svgGroup.appendChild(rollerA);

    const theta = Math.atan2(dy, dx);
    const cpDistance = data.results.d_B * scale;
    const cpx = bx + cpDistance * Math.cos(theta);
    const cpy = by - cpDistance * Math.sin(theta);

    const fr = createSVGElement('line', {
        x1: cpx - 80 * Math.sin(theta),
        y1: cpy - 80 * Math.cos(theta),
        x2: cpx,
        y2: cpy,
        stroke: 'var(--color-fr)',
        'stroke-width': 3.5,
        marker: 'url(#arrow-red)'
    });
    svgGroup.appendChild(fr);

    const cp = createSVGElement('circle', {
        cx: cpx,
        cy: cpy,
        r: 4,
        fill: '#fff',
        stroke: 'var(--color-fr)',
        'stroke-width': 2
    });
    svgGroup.appendChild(cp);

    drawDimensionLine(svgGroup, tankLeft - 30, by, tankLeft - 30, waterY, `H = ${H.toFixed(1)} ${data.fluid.length_unit}`, 'vertical', 'left');
    drawDimensionLine(svgGroup, bx, by + 40, ax, by + 40, `dx = ${dx.toFixed(1)} ${data.fluid.length_unit}`, 'horizontal', 'bottom');
    drawDimensionLine(svgGroup, ax + 55, by, ax + 55, ay, `dy = ${dy.toFixed(1)} ${data.fluid.length_unit}`, 'vertical', 'right');
}

function createSVGElement(type, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', type);

    for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
    }

    return element;
}

function drawDimensionLine(group, x1, y1, x2, y2, text, orientation, side) {
    const dimLine = createSVGElement('line', {
        x1,
        y1,
        x2,
        y2,
        stroke: '#94a3b8',
        'stroke-width': 1,
        'stroke-dasharray': '3,3'
    });
    group.appendChild(dimLine);

    const txt = createSVGElement('text', {
        x: orientation === 'vertical' ? (side === 'left' ? x1 - 10 : x1 + 10) : (x1 + x2) / 2,
        y: orientation === 'vertical' ? (y1 + y2) / 2 : y1 + 18,
        fill: '#94a3b8',
        'font-size': '12px',
        'text-anchor': orientation === 'vertical'
            ? (side === 'left' ? 'end' : 'start')
            : 'middle'
    });

    txt.textContent = text;
    group.appendChild(txt);
}

function showWarning(message) {
    const box = ensureWarningBox();
    box.textContent = message;
    box.hidden = false;
}

function clearWarning() {
    const box = ensureWarningBox();
    box.textContent = '';
    box.hidden = true;
}

function ensureWarningBox() {
    if (warningBox) return warningBox;

    warningBox = document.getElementById('input-warning');

    if (!warningBox) {
        warningBox = document.createElement('div');
        warningBox.id = 'input-warning';
        warningBox.setAttribute('role', 'alert');
        warningBox.hidden = true;

        const target = document.querySelector('.control-panel') || document.querySelector('.controls-panel') || document.body;
        target.prepend(warningBox);
    }

    return warningBox;
}

function setResultsAsInvalid() {
    resFR.textContent = 'Dato inválido';
    resYCP.textContent = 'Dato inválido';
    resP.textContent = 'Dato inválido';
    resB.textContent = 'Dato inválido';
}

function markInvalid(element, invalid) {
    if (!element) return;

    element.classList.toggle('is-invalid', invalid);
    element.setAttribute('aria-invalid', invalid ? 'true' : 'false');
}

function getSliderByKey(key) {
    return {
        H: paramH,
        dx: paramDx,
        dy: paramDy,
        b: paramB
    }[key];
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatInputValue(value) {
    if (!Number.isFinite(value)) return '';
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatNum(val) {
    return val.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmt(val, dec = 2) {
    return val.toLocaleString('es-ES', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
    });
}

window.addEventListener('DOMContentLoaded', init);