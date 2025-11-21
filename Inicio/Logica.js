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
    THEME_PALETTES,
    setDifficulty,
    DIFFICULTY_KEY,
    setNames,       // Importamos la función para guardar nombres
    PLAYER_NAME_KEY // Importamos la clave para comprobar si ya existe un nombre
} from './settings-manager.js';


// --- Esperar a que el DOM esté cargado ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a Elementos del DOM ---
    const screens = {
        deviceSelect: document.getElementById('device-select'),
        mainMenu: document.getElementById('main-menu'),
        difficultySelect: document.getElementById('difficulty-select'), // Nueva pantalla
        nameSelect: document.getElementById('name-select'), // Pantalla de nombres
        settings: document.getElementById('settings')
    };

    const buttons = {
        devicePc: document.getElementById('device-pc'),
        deviceMobile: document.getElementById('device-mobile'),
        play: document.getElementById('play-button'),
        settings: document.getElementById('settings-button'),
        changeDevice: document.getElementById('change-device-button'),
        resetData: document.getElementById('reset-data-button'),
        back: document.getElementById('back-button'),
        
        // Nuevos botones de dificultad
        difficultyEasy: document.getElementById('difficulty-easy'),
        difficultyNormal: document.getElementById('difficulty-normal'),
        difficultyHard: document.getElementById('difficulty-hard'),
        difficultyNightmare: document.getElementById('difficulty-nightmare'),
        difficultyBack: document.getElementById('difficulty-back-button'),

        // Botones pantalla nombres
        startGameFinal: document.getElementById('start-game-final-button'),
        nameBack: document.getElementById('name-back-button')
    };

    const themeSelect = document.getElementById('theme-select');

    const inputs = {
        playerName: document.getElementById('input-player-name'),
        companionName: document.getElementById('input-companion-name')
    };

    // --- Funciones de Lógica de UI ---

    /**
     * Oculta todas las pantallas y muestra la especificada por ID.
     * @param {string} screenId ('deviceSelect', 'mainMenu', 'settings', 'difficultySelect')
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
    
    /**
     * Guarda la dificultad y pasa a la selección de nombre
     * @param {string} difficulty ('easy', 'normal', 'hard', 'nightmare')
     */
    function selectDifficulty(difficulty) {
        console.log('Dificultad seleccionada:', difficulty);
        setDifficulty(difficulty);
        // Ahora no inicia el juego, sino que muestra la pantalla de nombres
        showScreen('nameSelect');
    }

    /**
     * Valida nombres y lanza el juego real
     */
    function finalizeGameStart() {
        const player = inputs.playerName.value.trim();
        const companion = inputs.companionName.value.trim();

        if (!player) {
            alert("IDENTIFICACIÓN REQUERIDA: INGRESE NOMBRE DEL JUGADOR");
            return;
        }

        setNames(player, companion);
        window.location.href = './Jugar/Habitacion/Principal.html';
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
        // ¡AQUÍ ESTÁ EL CAMBIO!
        // 1. Comprobamos si ya se ha guardado un nombre de jugador.
        const savedPlayerName = localStorage.getItem(PLAYER_NAME_KEY);

        if (savedPlayerName) {
            // 2. Si existe, vamos directo al juego.
            console.log('Datos de jugador encontrados. Cargando juego...');
            // (Usamos la misma ruta que la función finalizeGameStart)
            window.location.href = './Jugar/Habitacion/Principal.html';
        } else {
            // 3. Si no existe, mostramos la pantalla de selección de dificultad.
            console.log('Primera vez jugando. Mostrando selección de dificultad.');
            showScreen('difficultySelect');
        }
    });


    buttons.settings.addEventListener('click', () => {
        showScreen('settings');
    });
    
    // Menú de Dificultad (NUEVO)
    buttons.difficultyEasy.addEventListener('click', () => selectDifficulty('easy'));
    buttons.difficultyNormal.addEventListener('click', () => selectDifficulty('normal'));
    buttons.difficultyHard.addEventListener('click', () => selectDifficulty('hard'));
    buttons.difficultyNightmare.addEventListener('click', () => selectDifficulty('nightmare'));
    buttons.difficultyBack.addEventListener('click', () => showScreen('mainMenu'));

    // Menú de Nombres (NUEVO)
    buttons.startGameFinal.addEventListener('click', finalizeGameStart);
    buttons.nameBack.addEventListener('click', () => showScreen('difficultySelect'));


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