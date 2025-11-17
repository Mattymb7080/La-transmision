/* * script.js 
 * Script principal que maneja la lógica de la UI del menú.
 */

// Importamos las funciones y datos que necesitamos
import {
    setDevice,
    getDevice,
    setTheme,
    getTheme,
    resetAllSettings,
    THEME_PALETTES
} from './settings-manager.js';


// --- Esperar a que el DOM esté cargado ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a Elementos del DOM ---
    const screens = {
        deviceSelect: document.getElementById('device-select'),
        mainMenu: document.getElementById('main-menu'),
        settings: document.getElementById('settings')
    };

    const buttons = {
        devicePc: document.getElementById('device-pc'),
        deviceMobile: document.getElementById('device-mobile'),
        play: document.getElementById('play-button'),
        settings: document.getElementById('settings-button'),
        changeDevice: document.getElementById('change-device-button'),
        resetData: document.getElementById('reset-data-button'),
        back: document.getElementById('back-button')
    };

    const themeSelect = document.getElementById('theme-select');

    // --- Funciones de Lógica de UI ---

    /**
     * Oculta todas las pantallas y muestra la especificada por ID.
     * @param {string} screenId ('deviceSelect', 'mainMenu', 'settings')
     */
    function showScreen(screenId) {
        // Ocultar todas las pantallas
        for (const key in screens) {
            screens[key].style.display = 'none';
        }
        // Mostrar la pantalla deseada
        screens[screenId].style.display = 'flex';
    }

    /**
     * Aplica el tipo de dispositivo al <body>
     * @param {string} deviceType ('pc' o 'mobile')
     */
    function applyDevice(deviceType) {
        if (deviceType === 'mobile') {
            document.body.classList.add('es-celular');
        } else {
            document.body.classList.remove('es-celular');
        }
    }

    /**
     * Aplica un tema cambiando el atributo data-theme y las variables CSS
     * @param {string} themeName (ej. 'verde-crt', 'ambar')
     */
    function applyTheme(themeName) {
        // 1. Establecer el atributo en el body (para el CSS)
        document.body.dataset.theme = themeName;

        // 2. Establecer las variables CSS en :root
        const palette = THEME_PALETTES[themeName];
        const root = document.documentElement;
        if (palette) {
            for (const key in palette) {
                root.style.setProperty(key, palette[key]);
            }
        }
    }


    // --- Configuración de Eventos (Listeners) ---

    // Selección de Dispositivo
    buttons.devicePc.addEventListener('click', () => {
        setDevice('pc');
        applyDevice('pc');
        showScreen('mainMenu');
    });

    buttons.deviceMobile.addEventListener('click', () => {
        setDevice('mobile');
        applyDevice('mobile');
        showScreen('mainMenu');
    });

    // Menú Principal
    buttons.play.addEventListener('click', () => {
        console.log('Botón JUGAR presionado');
        // Aquí iría la lógica para iniciar el juego...
    });

    buttons.settings.addEventListener('click', () => {
        showScreen('settings');
    });

    // Menú de Ajustes
    buttons.back.addEventListener('click', () => {
        showScreen('mainMenu');
    });

    buttons.changeDevice.addEventListener('click', () => {
        showScreen('deviceSelect');
    });

    buttons.resetData.addEventListener('click', () => {
        resetAllSettings();
    });

    themeSelect.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        setTheme(newTheme);
        applyTheme(newTheme);
    });


    // --- Función de Inicialización (INIT) ---
    function init() {
        const savedDevice = getDevice();
        const savedTheme = getTheme();

        // 1. Aplicar tema guardado (o por defecto)
        applyTheme(savedTheme);
        themeSelect.value = savedTheme; // Actualizar el desplegable

        // 2. Comprobar si ya se eligió un dispositivo
        if (savedDevice) {
            applyDevice(savedDevice);
            showScreen('mainMenu'); // Ir directo al menú
        } else {
            showScreen('deviceSelect'); // Mostrar selección de dispositivo
        }
    }

    // ¡Empezar la aplicación!
    init();

});