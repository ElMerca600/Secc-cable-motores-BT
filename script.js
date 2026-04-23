// Constantes de Motor
const VOLTAGE = 380; // V
const COS_PHI = 0.85;
const EFFICIENCY = 0.88;
const RHO_CU = 0.021; // ohmios.mm2/m
const MAX_DV_PERCENT = 3;
const MAX_DV_VOLTS = (MAX_DV_PERCENT / 100) * VOLTAGE;

// Secciones Comerciales (mm2)
const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

// Tablas simplificadas IRAM 2178 para Cte Admisible (Iz) en Amperes.
// Estructura: insulation -> installation_method -> array de Iz correspondiente a SECTIONS
const IZ_TABLE = {
    'PVC': {
        // PVC 70°C
        'direct': [24, 33, 43, 53, 71, 91, 116, 139, 164, 201, 238, 271, 306, 345, 396], // Directamente enterrado (multipolares aprox)
        'duct': [19, 25, 33, 41, 55, 71, 90, 108, 128, 157, 185, 211, 238, 270, 311],     // Conducto enterrado
        'tray': [15, 21, 28, 36, 50, 66, 88, 109, 131, 167, 202, 236, 266, 305, 361],     // Bandeja perforada / aire multipolar
        'air': [15, 21, 28, 36, 50, 66, 88, 109, 131, 167, 202, 236, 266, 305, 361]       // Similar a bandeja para simplificar
    },
    'XLPE': {
        // XLPE 90°C
        'direct': [31, 41, 54, 67, 89, 115, 148, 178, 211, 257, 306, 349, 395, 447, 517],
        'duct': [23, 31, 41, 51, 68, 88, 113, 136, 162, 199, 236, 269, 304, 345, 400],
        'tray': [18, 25, 34, 44, 60, 80, 108, 133, 163, 208, 252, 292, 335, 385, 461],
        'air': [18, 25, 34, 44, 60, 80, 108, 133, 163, 208, 252, 292, 335, 385, 461]
    }
};

// DOM Elements
const form = document.getElementById('calc-form');
const inpPower = document.getElementById('power-kw');
const inpLength = document.getElementById('length-m');
const selInsulation = document.getElementById('insulation');
const selMethod = document.getElementById('installation-method');

const elSection = document.getElementById('final-section');
const elIn = document.getElementById('current-nominal');
const elIz = document.getElementById('admissible-current');
const elDv = document.getElementById('voltage-drop');
const elMsg = document.getElementById('criteria-msg');

function calculate() {
    const powerKW = parseFloat(inpPower.value);
    const length = parseFloat(inpLength.value);
    const insulation = selInsulation.value;
    const method = selMethod.value;

    if (isNaN(powerKW) || isNaN(length) || powerKW <= 0 || length <= 0) {
        resetDisplay();
        return;
    }

    // 1. Calcular Corriente Nominal (In)
    // In = (P_kW * 1000) / (sqrt(3) * 380 * 0.85 * 0.88)
    const currentNominal = (powerKW * 1000) / (Math.sqrt(3) * VOLTAGE * COS_PHI * EFFICIENCY);
    
    // 2 y 3. Tablas e iteración
    const izArray = IZ_TABLE[insulation][method];
    let selectedSection = -1;
    let selectedIz = -1;
    let selectedDvVolts = -1;
    let limitReason = '';

    for (let i = 0; i < SECTIONS.length; i++) {
        const s = SECTIONS[i];
        const iz = izArray[i];

        // Criterio térmico
        if (iz >= currentNominal) {
            // Criterio de caída de tensión
            // dV = (sqrt(3) * L * In * rho * cosFi) / S
            const dvVolts = (Math.sqrt(3) * length * currentNominal * RHO_CU * COS_PHI) / s;

            if (dvVolts <= MAX_DV_VOLTS) {
                selectedSection = s;
                selectedIz = iz;
                selectedDvVolts = dvVolts;
                
                // Determinar factor limitante (meramente informativo)
                const thermalUtil = currentNominal / iz;
                const dvUtil = dvVolts / MAX_DV_VOLTS;
                
                if (thermalUtil > dvUtil) {
                    limitReason = 'Limitado por capacidad térmica';
                } else {
                    limitReason = 'Limitado por caída de tensión';
                }
                break;
            }
        }
    }

    updateDisplay(selectedSection, currentNominal, selectedIz, selectedDvVolts, limitReason);
}

function resetDisplay() {
    elSection.textContent = '--';
    elIn.textContent = '--';
    elIz.textContent = '--';
    elDv.textContent = '--';
    elMsg.textContent = '';
}

function updateDisplay(section, in_A, iz_A, dv_V, msg) {
    elIn.textContent = in_A.toFixed(2);
    
    if (section === -1) {
        elSection.textContent = '>240';
        elSection.classList.replace('text-emerald-400', 'text-red-400');
        elIz.textContent = '--';
        elDv.textContent = '--';
        elMsg.textContent = 'Sección requerida excede 240 mm²';
        elMsg.classList.add('text-red-400');
    } else {
        elSection.textContent = section;
        elSection.classList.contains('text-red-400') && elSection.classList.replace('text-red-400', 'text-emerald-400');
        elIz.textContent = iz_A;
        
        const dvPercent = (dv_V / VOLTAGE) * 100;
        elDv.textContent = dvPercent.toFixed(2);
        
        elMsg.textContent = msg;
        elMsg.classList.remove('text-red-400');
    }
}

// Event Listeners for reactivity
form.addEventListener('input', calculate);
form.addEventListener('change', calculate);

// Initial calculation
calculate();
