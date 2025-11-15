// --- CONSTANTES Y UTILIDADES ---

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Claves de LocalStorage
const SAVE_KEY_CURRENT = 'transmision_current';
const SAVE_KEY_CHECKPOINT = 'transmision_checkpoint';
const SAVE_KEY_DEVICE = 'transmision_device';
const SAVE_KEY_THEME = 'transmision_theme';

// Pantallas
const mainMenu = $('#main-menu');
const settingsScreen = $('#settings-screen');
const difficultySelectScreen = $('#difficulty-select-screen');
const gameScreen = $('#game-screen');
const deviceSelectOverlay = $('#device-select-overlay');

// Elementos del juego
const narrativeLog = $('#narrative-log');
const notificationLog = $('#notification-log');
const narrativeContainer = $('#narrative-container');
const optionsContainer = $('#options-container');
const locationMenu = $('#location-menu');
const appContainer = $('#app');
const playerStateButton = $('#player-state-button');
const playerStateUI = $('#player-state');
const ruloHud = $('#rulo-hud');
const ruloStateUI = $('#rulo-state');
const noiseBar = $('#noise-bar');
const noiseValueUI = $('#noise-value');
const noiseTextUI = $('#noise-text');
const backpackModal = $('#backpack-modal');
const backpackList = $('#backpack-list');
const saveIcon = $('#save-icon');
const reactionBtn = $('#reaction-btn');
const monsterProbHud = $('#monster-prob-hud'); // Medidor de prob. en Header
const monsterProbValue = $('#monster-prob-value');
const ruloProbHeader = $('#rulo-prob-header'); // Medidor de prob. en Columna Notif.
const deathOverlay = $('#death-overlay'); // Overlay de muerte

// Modales
const playerStatsModal = $('#player-stats-modal');
const playerStatsList = $('#player-stats-list');
const ruloStatsModal = $('#rulo-stats-modal');
const ruloStatsList = $('#rulo-stats-list');
const confirmModal = $('#confirm-modal');
const calmMinigame = $('#calm-minigame');
const calmTapArea = $('#calm-tap-area'); // Área de toque para móvil

// Minijuego Fusibles
const fuseMinigameModal = $('#fuse-minigame-modal');
const fuseTimer = $('#fuse-timer');
const fuseHintBox = $('#fuse-hint-box');
const fuseOptionsContainer = $('#fuse-options-container');
const fuseSequenceDisplay = $('#fuse-sequence-display');
const fuseConfirmBtn = $('#fuse-confirm-btn');
const fuseClearBtn = $('#fuse-clear-btn');

// Estado del juego
let gameState = {};
let gameLoopInterval = null;

// Estado de la escritura (Tipeo)
let isTyping = false;
let charTimeout = null;
let sentenceTimeout = null;
let currentSentences = [];
let currentSentenceIndex = 0;
let currentOnCompleteCallback = null;
let clearLogOnType = false;

// Estado del Botón de Reacción
let reactionTimeout = null;
let reactionTimerInterval = null;
let reactionWindowMs = 0;
let reactionStartTime = 0;

// Estado del Minijuego de Calma
let calmGameActive = false;
let calmGameInterval = null;
let calmGameTimeout = null;
let calmMarkerPos = 0;
let calmMarkerDir = 1;
let calmMarkerSpeed = 2.5; // % por frame
let calmTargetLeft = 0;
let calmTargetWidth = 0;

// Estado del Minijuego de Fusibles
let fuseGameActive = false;
let fuseGameTimer = null;
let fuseGameData = {
    solution: [],
    options: [],
    hint: "",
    timeLimit: 30,
    baseNoise: 0
};
let fuseGameSequence = [];

// Parámetros del Juego
const RULO_ALERT_COOLDOWN = 30;
const RULO_ALERT_BASE_PROB = 0.2;
const RULO_ALERT_SKILL_FACTOR = 0.6;

// Límite de Búsquedas (por ID de sala)
const SEARCH_LIMITS = {
    'sala_vigilancia': 6,
    'pasillo_este_hub': 8,
    'almacen': 8,
    'oficina_seguridad': 4
};

// Definición de temas de color (sin cambios)
const themes = {
    green: { 
        name: 'theme-green',
        bg: '#000000', text: '#00ff41', dim: '#008f25', bright: '#adffc6', glow: '0 0 5px #00ff41, 0 0 10px #00ff41',
        sfx: '#f59e0b', scare: '#ef4444', calm: '#0284c7', agitated: '#f59e0b', hurt: '#dc2626' 
    },
    amber: { 
        name: 'theme-amber',
        bg: '#0a0a0a', text: '#f59e0b', dim: '#b45309', bright: '#fcd34d', glow: '0 0 5px #f59e0b, 0 0 10px #f59e0b',
        sfx: '#fde047', scare: '#ef4444', calm: '#38bdf8', agitated: '#f59e0b', hurt: '#dc2626'
    },
    blue: { 
        name: 'theme-blue',
        bg: '#030712', text: '#38bdf8', dim: '#0369a1', bright: '#bfdbfe', glow: '0 0 5px #38bdf8, 0 0 10px #38bdf8',
        sfx: '#f59e0b', scare: '#ef4444', calm: '#38bdf8', agitated: '#f59e0b', hurt: '#dc2626'
    },
    blanco: { 
        name: 'theme-blanco',
        bg: '#f4f4f5', text: '#18181b', dim: '#71717a', bright: '#000000', glow: 'none',
        sfx: '#b45309', scare: '#ef4444', calm: '#0284c7', agitated: '#b45309', hurt: '#dc2626' 
    },
    negro: { 
        name: 'theme-negro',
        bg: '#000000', text: '#ffffff', dim: '#a1a1aa', bright: '#ffffff', glow: '0 0 5px #ffffff',
        sfx: '#f59e0b', scare: '#ef4444', calm: '#38bdf8', agitated: '#f59e0b', hurt: '#dc2626' 
    }
};

// --- GESTIÓN DE ESTADOS (Jugador y Rulo) ---

function updatePlayerStat(stat, amount) {
    if (!gameState.playerStats || gameState.playerStats[stat] === undefined) return;
    
    let currentValue = gameState.playerStats[stat];
    let newValue = currentValue + amount;
    
    if (stat === 'hambre' || stat === 'agua' || stat === 'vida') {
        newValue = Math.max(0, Math.min(100, newValue));
    }
    else if (stat === 'ansiedad') {
        newValue = Math.max(0, Math.min(100, newValue));
    }
    
    gameState.playerStats[stat] = newValue;

    // Trigger de muerte
    if (stat === 'vida' && newValue <= 0) {
        handlePlayerDeath();
    }
    
    // No renderizar aquí para evitar sobrecarga, el game loop lo hará.
}

function updateRuloStat(stat, amount) {
    if (!gameState.ruloStats || gameState.ruloStats[stat] === undefined) return;
    
    let currentValue = gameState.ruloStats[stat];
    let newValue = currentValue + amount;
    
    newValue = Math.max(0, Math.min(100, newValue));
    gameState.ruloStats[stat] = newValue;

    if (stat === 'vida' && newValue <= 0 && !gameState.flags.rulo_dead) {
        ruloDies();
    }
    if ((stat === 'hambre' || stat === 'agua') && newValue <= 0 && gameState.flags.rulo_joins) {
        ruloLeaves("hambre/sed");
    }
}

// Funciones de curación gradual
function startHealing(target) {
    if (target === 'player') {
        if (gameState.playerStats.healing.active) return; // Ya se está curando
        let anxiety = gameState.playerStats.ansiedad;
        // Entre más ansiedad, más lento (ej: 0.5/s en 0 ans, 0.1/s en 100 ans)
        let healRate = Math.max(0.1, 0.5 - (anxiety / 250));
        gameState.playerStats.healing = { active: true, remaining: 30, perSecond: healRate };
        logNotification("Empiezas a vendarte. La curación será lenta.", 'info');
    } else {
        if (gameState.ruloStats.healing.active) return;
        // Rulo no tiene ansiedad, cura a tasa fija
        gameState.ruloStats.healing = { active: true, remaining: 30, perSecond: 0.5 };
        logNotification("Rulo se aplica un vendaje.", 'info');
    }
}

function updatePlayerHealing() {
    if (!gameState.playerStats.healing.active) return;
    
    let healing = gameState.playerStats.healing;
    updatePlayerStat('vida', healing.perSecond);
    healing.remaining -= healing.perSecond;
    
    if (healing.remaining <= 0 || gameState.playerStats.vida >= 100) {
        healing.active = false;
        healing.remaining = 0;
        logNotification("Has terminado de curarte.", 'info');
    }
}

function updateRuloHealing() {
    if (!gameState.ruloStats.healing.active) return;
    
    let healing = gameState.ruloStats.healing;
    updateRuloStat('vida', healing.perSecond);
    healing.remaining -= healing.perSecond;
    
    if (healing.remaining <= 0 || gameState.ruloStats.vida >= 100) {
        healing.active = false;
        healing.remaining = 0;
    }
}

function getPlayerStateSummary() {
    const stats = gameState.playerStats;
    if (!stats) return "CALMADO";
    
    if (stats.vida <= 40) return "HERIDO";
    if (stats.vida <= 70) return "DAÑADO";
    if (stats.ansiedad >= 70) return "AGITADO";
    if (stats.ansiedad >= 40) return "ANSIOSO";
    // MODIFICADO: Hambre y agua ahora son < 40 para ser un problema
    if (stats.hambre <= 40 || stats.agua <= 40) return "FATIGADO";
    
    return "CALMADO";
}

function getPlayerStateClass() {
    const stats = gameState.playerStats;
    if (!stats) return "life-ok";
    
    if (stats.vida <= 40) return "life-danger"; // Rojo
    if (stats.ansiedad >= 70) return "life-danger"; // Rojo
    if (stats.vida <= 70) return "life-low"; // Naranja
    if (stats.ansiedad >= 40) return "life-anxious"; // Magenta
    if (stats.hambre <= 40 || stats.agua <= 40) return "life-low"; // Naranja
    
    return "life-ok"; // Azul
}

// --- SISTEMA DE GUARDADO Y CARGA ---

function saveGameState() {
    try {
        localStorage.setItem(SAVE_KEY_CURRENT, JSON.stringify(gameState));
    } catch (e) {
        console.error("Error guardando el estado del juego:", e);
    }
}

function loadGameState() {
    try {
        const savedData = localStorage.getItem(SAVE_KEY_CURRENT);
        if (savedData) {
            gameState = JSON.parse(savedData);
            
            // --- Corrección de estado guardado antiguo ---
            if (!gameState.unlockedLocations) gameState.unlockedLocations = ['sala_vigilancia'];
            
            // Migración de stats viejos (0 -> 100) a nuevos (100 -> 0)
            if (!gameState.playerStats) {
                gameState.playerStats = { vida: 100, ansiedad: 0, hambre: 100, agua: 100, healing: { active: false, remaining: 0, perSecond: 0 } };
            } else {
                if (gameState.playerStats.hambre === 0) gameState.playerStats.hambre = 100;
                if (gameState.playerStats.agua === 0) gameState.playerStats.agua = 100;
                if (!gameState.playerStats.healing) gameState.playerStats.healing = { active: false, remaining: 0, perSecond: 0 };
            }

            // Migración de Rulo
            if (gameState.ruloHP !== undefined) { // Si existe la variable vieja
                gameState.ruloStats = { vida: gameState.ruloHP, hambre: 100, agua: 100, healing: { active: false, remaining: 0, perSecond: 0 } };
                delete gameState.ruloHP; // Borra la variable vieja
            } else if (!gameState.ruloStats) { // Si no existe nada de Rulo
                gameState.ruloStats = { vida: 100, hambre: 100, agua: 100, healing: { active: false, remaining: 0, perSecond: 0 } };
            }
            
            if (!gameState.roomNoise) {
                const oldNoise = gameState.noise || 0;
                gameState.roomNoise = { 'sala_vigilancia': oldNoise, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0, 'sotano': 0 };
                delete gameState.noise;
            }
            if (!gameState.roomCounters) gameState.roomCounters = { 'sala_vigilancia': 0, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0 };
            if (!gameState.location || gameState.location === 'start') gameState.location = 'sala_vigilancia';
            if (!gameState.previousLocation) gameState.previousLocation = 'sala_vigilancia';
            if (!gameState.difficulty) gameState.difficulty = 'medium';
            
            // Añadir flags nuevas si no existen
            if (gameState.flags.radio_forced_count === undefined) gameState.flags.radio_forced_count = 0;
            if (gameState.flags.rulo_rejected_join === undefined) gameState.flags.rulo_rejected_join = false;
            if (gameState.flags.rulo_dead === undefined) gameState.flags.rulo_dead = false;
            if (gameState.flags.pasillo_este_route_chosen === undefined) gameState.flags.pasillo_este_route_chosen = false;
            if (gameState.flags.player_dead === undefined) gameState.flags.player_dead = false;
            // --- Fin corrección ---
            
            return true;
        }
    } catch (e) {
        console.error("Error cargando el estado del juego:", e);
    }
    return false;
}

function saveCheckpoint() {
    try {
        localStorage.setItem(SAVE_KEY_CHECKPOINT, JSON.stringify(gameState));
        localStorage.setItem(SAVE_KEY_CURRENT, JSON.stringify(gameState));
        flashSaveIcon();
    } catch (e) {
        console.error("Error guardando checkpoint:", e);
    }
}

function loadCheckpoint() {
    try {
        const savedData = localStorage.getItem(SAVE_KEY_CHECKPOINT);
        if (savedData) {
            gameState = JSON.parse(savedData);
            saveGameState(); // Sobrescribe el guardado actual con el del checkpoint
            
            // Reinicia el juego manualmente con el estado cargado
            stopGameLoop();
            showScreen('game');
            renderAllUI();
            
            // Reinicia flags de muerte
            gameState.flags.player_dead = false;
            deathOverlay.classList.add('hidden');
            deathOverlay.classList.remove('player-dying');
            
            showNode(gameState.location); 
            startGameLoop();
        } else {
            console.warn("No hay punto de guardado.");
            logNotification("No se encontró punto de guardado.", "info");
        }
    } catch (e) {
        console.error("Error cargando checkpoint:", e);
    }
}

function resetAllData() {
    localStorage.removeItem(SAVE_KEY_CURRENT);
    localStorage.removeItem(SAVE_KEY_CHECKPOINT);
    localStorage.removeItem(SAVE_KEY_DEVICE);
    localStorage.removeItem(SAVE_KEY_THEME);
    location.reload(); // Recarga la página para un reinicio limpio
}

function flashSaveIcon() {
    saveIcon.style.opacity = '1';
    setTimeout(() => {
        saveIcon.style.opacity = '0';
    }, 1500);
}

function resetGame() {
    // Nota: Esta función NO borra dispositivo ni tema, solo el progreso.
    localStorage.removeItem(SAVE_KEY_CURRENT);
    localStorage.removeItem(SAVE_KEY_CHECKPOINT);
    
    gameState = {
        location: 'sala_vigilancia',
        previousLocation: 'sala_vigilancia',
        difficulty: 'medium', // Dificultad por defecto
        inventory: {},
        roomNoise: {
            'sala_vigilancia': 0, 'pasillo_este_hub': 0, 'almacen': 0, 
            'oficina_seguridad': 0, 'sotano': 0
        },
        playerStats: { 
            vida: 100, 
            ansiedad: 0, 
            hambre: 100, 
            agua: 100,
            healing: { active: false, remaining: 0, perSecond: 0 }
        },
        ruloStats: { 
            vida: 100, 
            hambre: 100, 
            agua: 100,
            healing: { active: false, remaining: 0, perSecond: 0 }
        },
        flags: {
            rulo_awake: false, rulo_awake_calm: false, radio_pista: false,
            panel_abierto: false, rulo_talked: false, rulo_joins: false,
            backpack_enabled: false,
            radio_forced_count: 0,
            rulo_rejected_join: false,
            rulo_dead: false,
            pasillo_este_route_chosen: false,
            player_dead: false
        },
        unlockedLocations: ['sala_vigilancia'],
        monsterPresent: false,
        monsterApproaching: false,
        monsterTime: 0,
        ruloAlertCooldown: 0,
        ruloAlertActive: false,
        ruloAlertSkill: 0.7,
        roomCounters: {
            'sala_vigilancia': 0, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0
        }
    };
    saveGameState();
}

// --- NAVEGACIÓN Y MENÚS ---

function showScreen(screenId) {
    mainMenu.style.display = 'none';
    settingsScreen.style.display = 'none';
    difficultySelectScreen.style.display = 'none';
    gameScreen.style.display = 'none';
    deviceSelectOverlay.style.display = 'none';
    
    const gameMenuBtn = $('#game-back-to-menu-btn');
    
    if (screenId === 'main') mainMenu.style.display = 'flex';
    if (screenId === 'settings') settingsScreen.style.display = 'flex';
    if (screenId === 'difficulty_select') difficultySelectScreen.style.display = 'flex';
    if (screenId === 'game') gameScreen.style.display = 'flex';
    if (screenId === 'device_select') deviceSelectOverlay.style.display = 'flex';
    
    // Controla el botón de "MENÚ" dentro del juego
    if (gameMenuBtn) {
        if (screenId === 'game') gameMenuBtn.classList.remove('hidden');
        else gameMenuBtn.classList.add('hidden');
    }
}

function changeTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;
    
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', theme.bg);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-text-dim', theme.dim);
    root.style.setProperty('--theme-text-bright', theme.bright);
    root.style.setProperty('--theme-glow', theme.glow);
    root.style.setProperty('--theme-sfx', theme.sfx);
    root.style.setProperty('--theme-scare', theme.scare);
    root.style.setProperty('--theme-calm', theme.calm);
    root.style.setProperty('--theme-agitated', theme.agitated);
    root.style.setProperty('--theme-hurt', theme.hurt);
    
    Object.values(themes).forEach(t => document.body.classList.remove(t.name));
    document.body.classList.add(theme.name);
    
    localStorage.setItem(SAVE_KEY_THEME, themeName);
}

function selectDevice(type) {
    const body = document.body;
    body.classList.remove('device-pc', 'device-mobile');
    
    if (type === 'mobile') {
        body.classList.add('device-mobile');
        localStorage.setItem(SAVE_KEY_DEVICE, 'mobile');
        $('#backpack-btn').textContent = 'MOCHILA'; 
    } else {
        body.classList.add('device-pc');
        localStorage.setItem(SAVE_KEY_DEVICE, 'pc');
        $('#backpack-btn').textContent = 'MOCHILA [M]'; 
    }
    
    deviceSelectOverlay.style.display = 'none'; 
    showScreen('main'); 
}

function startGameFromMenu() {
    stopGameLoop();
    let isContinue = $('#play-btn').textContent === 'Continuar';
    
    if (isContinue && loadGameState()) {
        // --- Cargar Partida ---
        showScreen('game');
        renderAllUI();
        showNode(gameState.location);
        startGameLoop();
    } else {
        // --- Nueva Partida ---
        resetGame();
        showScreen('difficulty_select');
    }
}

function selectDifficulty(difficulty) {
    resetGame(); // Empieza un estado limpio
    gameState.difficulty = difficulty;
    saveGameState(); // Guarda el estado inicial con la dificultad
    
    // Inicia el juego
    showScreen('game');
    renderAllUI();
    showNode(gameState.location); // Muestra 'sala_vigilancia'
    startGameLoop();
}

function goToMenu() {
    stopGameLoop();
    if (gameScreen.style.display === 'flex') {
        saveGameState(); // Solo guarda si salimos *desde* el juego
    }
    showScreen('main');
    // Actualiza el botón de "Jugar/Continuar"
    if (localStorage.getItem(SAVE_KEY_CURRENT)) {
        $('#play-btn').textContent = 'Continuar';
    } else {
        $('#play-btn').textContent = 'Jugar';
    }
}

// --- BUCLE DE JUEGO (Actualizaciones por segundo) ---

function startGameLoop() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(updateGameLoop, 1000); // 1 vez por segundo
}

function stopGameLoop() {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
}

function isGamePaused() {
    // El juego se pausa si hay un modal abierto O un minijuego activo
    return !backpackModal.classList.contains('hidden') ||
           !playerStatsModal.classList.contains('hidden') ||
           !ruloStatsModal.classList.contains('hidden') ||
           !confirmModal.classList.contains('hidden') ||
           calmGameActive ||
           fuseGameActive ||
           gameState.monsterPresent || // Pausa durante el ataque
           gameState.flags.player_dead; // Pausa si está muerto
}

function updateGameLoop() {
    if (isGamePaused()) {
        // Si el juego está pausado, solo actualizamos la UI de los modales
        updateStatsModalRealtime();
        return;
    }

    // --- Lógica de Stats del Jugador ---
    updatePlayerStatsDecay();
    updatePlayerHealing();
    updateAnsiedad();
    
    // --- Lógica de Stats de Rulo ---
    if (gameState.flags.rulo_joins && !gameState.flags.rulo_dead) {
        updateRuloStatsDecay();
        updateRuloHealing();
    }

    // --- Lógica del Entorno ---
    if (gameState.ruloAlertCooldown > 0) {
        gameState.ruloAlertCooldown--;
    }
    checkRuloAlert();
    
    if (!gameState.monsterApproaching) {
        checkMonsterSpawn();
    }
    
    // --- Renderizado de UI ---
    renderNoiseBar();
    renderPlayerState();
    renderMonsterProb();
    updateStatsModalRealtime(); // Actualiza modales si están abiertos
}

function updatePlayerStatsDecay() {
    const stats = gameState.playerStats;
    // Tasa de hambre/agua aumenta si la vida es baja
    let lifeFactor = (stats.vida < 50) ? 1.5 : 1.0;
    lifeFactor = (stats.vida < 25) ? 2.0 : lifeFactor;
    
    // Tasas base por segundo
    let hungerRate = (0.05 * lifeFactor);
    let waterRate = (0.08 * lifeFactor);
    
    updatePlayerStat('hambre', -hungerRate);
    updatePlayerStat('agua', -waterRate);
    
    // Penalización por hambre/sed
    let damage = 0;
    if (stats.hambre <= 0) damage += 0.1;
    if (stats.agua <= 0) damage += 0.2;
    
    // Daño por hambre/sed aumenta con ansiedad
    if (damage > 0) {
        let anxietyFactor = 1 + (stats.ansiedad / 100); // de 1x a 2x
        updatePlayerStat('vida', -(damage * anxietyFactor));
    }
}

function updateRuloStatsDecay() {
    const stats = gameState.ruloStats;
    let lifeFactor = (stats.vida < 50) ? 1.5 : 1.0;
    
    let hungerRate = (0.04 * lifeFactor); // Rulo consume un poco menos
    let waterRate = (0.06 * lifeFactor);
    
    updateRuloStat('hambre', -hungerRate);
    updateRuloStat('agua', -waterRate);
    
    // Rulo no recibe daño por hambre/sed, pero se va (manejado en updateRuloStat)
}

function updateAnsiedad() {
    const stats = gameState.playerStats;
    let anxietyChange = 0;
    
    // Hambre/Sed aumentan ansiedad
    if (stats.hambre < 30) anxietyChange += 0.1;
    if (stats.agua < 30) anxietyChange += 0.15;
    
    // Ruido bajo o Rulo calman
    if (gameState.roomNoise[gameState.location] < 15) {
        anxietyChange -= 0.1;
    } else if (gameState.flags.rulo_joins && !gameState.flags.rulo_dead) {
        anxietyChange -= 0.05; // Rulo ayuda, pero menos que el silencio
    }
    
    updatePlayerStat('ansiedad', anxietyChange);

    // Penalización por ansiedad alta
    if (stats.ansiedad >= 100) {
        updatePlayerStat('vida', -0.2); // Daño por pánico
        if (Math.random() < 0.01 && gameState.flags.rulo_joins) { // 1% de prob por segundo
            ruloLeaves("ansiedad");
        }
    }
}

function ruloLeaves(reason) {
    gameState.flags.rulo_joins = false;
    gameState.flags.rulo_rejected_join = true; // No volverá
    
    let msg = "Rulo ya no puede más. Te ha abandonado.";
    if (reason === "ansiedad") {
        msg = "¡Estás fuera de control! Asustas a Rulo y se esconde. Te ha abandonado.";
    } else if (reason === "hambre/sed") {
        msg = "Rulo está demasiado débil para continuar. Se detiene y te abandona.";
    }
    logNotification(msg, 'scare');
    renderRuloState();
    renderMonsterProb();
}

function ruloDies() {
    if (gameState.flags.rulo_dead) return;
    
    gameState.flags.rulo_dead = true;
    gameState.flags.rulo_joins = false;
    
    appContainer.classList.add('shake');
    setTimeout(() => appContainer.classList.remove('shake'), 500);
    
    logNotification("¡RULO HA MUERTO!", 'scare');
    logNotification("La dificultad del juego ha aumentado.", 'scare');
    
    // Limpia el HUD de Rulo
    renderRuloState();
    renderMonsterProb();
}

function handlePlayerDeath() {
    if (gameState.flags.player_dead) return; // Evitar doble trigger
    
    gameState.flags.player_dead = true;
    stopGameLoop();
    
    deathOverlay.classList.remove('hidden');
    deathOverlay.classList.add('player-dying'); // Activa animación CSS
    
    setTimeout(() => {
        loadCheckpoint(); // Carga el último guardado
        // loadCheckpoint se encarga de reiniciar el loop y mostrar el nodo
        
        // Muestra mensajes de muerte DESPUÉS de cargar
        setTimeout(() => {
            logNotification("Moriste.", 'scare');
            typeText("...¿Qué pasó?...", true, () => {
                // Muestra las opciones de la sala cargada
                renderOptions(GAME_CONTENT[gameState.location].options, gameState.location);
            });
        }, 200); // Pequeño delay para que la UI de carga termine

    }, 4000); // Duración de la animación de muerte
}


// --- SISTEMA DE ESCRITURA (TIPEO) ---

function typeText(fullText, clearLog = false, onComplete = () => {}) {
    if (isTyping) {
        finishTyping(true); 
    }
    
    // NO pausar el juego, solo manejar el tipeo
    
    if (clearLog) {
        narrativeLog.innerHTML = '';
    }
    clearLogOnType = clearLog;

    currentSentences = fullText.split('\n').filter(s => s.trim().length > 0);
    currentSentenceIndex = 0;
    currentOnCompleteCallback = onComplete;
    isTyping = true;
    
    typeSentence();
}

function typeSentence() {
    if (currentSentenceIndex >= currentSentences.length) {
        finishTyping(false); 
        return;
    }

    const sentence = currentSentences[currentSentenceIndex];
    
    if (currentSentenceIndex === 0 && clearLogOnType) {
         const prefix = document.createElement('span');
         prefix.className = 'text-gray-500';
         prefix.textContent = '> ';
         narrativeLog.appendChild(prefix);
    }
    
    const textSpan = document.createElement('span');
    narrativeLog.appendChild(textSpan);

    const cursor = document.createElement('span');
    cursor.id = 'cursor';
    narrativeLog.appendChild(cursor);
    
    narrativeLog.scrollTop = narrativeLog.scrollHeight;

    let i = 0;
    function typeChar() {
        if (i < sentence.length) {
            textSpan.innerHTML += sentence.charAt(i);
            i++;
            charTimeout = setTimeout(typeChar, 25);
        } else {
            cursor.remove();
            textSpan.innerHTML += '<br>';
            currentSentenceIndex++;
            sentenceTimeout = setTimeout(typeSentence, 350);
        }
    }
    typeChar();
}

function skipTyping() {
    if (!isTyping) return;

    clearTimeout(charTimeout);
    clearTimeout(sentenceTimeout);

    const cursor = $('#cursor');
    
    if (cursor) {
        const textSpan = cursor.previousElementSibling;
        if (textSpan && currentSentences[currentSentenceIndex]) { 
            textSpan.innerHTML = currentSentences[currentSentenceIndex];
            textSpan.innerHTML += '<br>';
        }
        cursor.remove();
    }
    
    currentSentenceIndex++;
    typeSentence();
}


function finishTyping(internalSkip = false) {
    isTyping = false;
    clearTimeout(charTimeout);
    clearTimeout(sentenceTimeout);
    $('#cursor')?.remove();

    if (!internalSkip && currentOnCompleteCallback) {
        currentOnCompleteCallback();
    }
    
    currentOnCompleteCallback = null;
    currentSentences = [];
    currentSentenceIndex = 0;
    clearLogOnType = false;
}

// --- LÓGICA DE NODOS Y OPCIONES ---

function showNode(nodeId) {
    const node = GAME_CONTENT[nodeId];
    if (!node) {
        console.error(`Nodo no encontrado: ${nodeId}`);
        return;
    }
    
    // Manejo de lógica OnEnter antes de mostrar texto
    if (node.onEnter) {
        let result = true;
        if (node.onEnter.params) {
            result = window[node.onEnter.func](node.onEnter.params);
        } else {
            result = window[node.onEnter.func]();
        }
        // Si onEnter devuelve false (p.ej. check de mochila), detenemos la navegación
        if (result === false) {
            return;
        }
    }

    // Si es un Hub (sala principal), actualiza la ubicación y el checkpoint
    if (node.isLocationHub) {
        gameState.previousLocation = gameState.location;
        gameState.location = nodeId;
        if (node.isCheckpoint) {
            saveCheckpoint();
        }
    }

    optionsContainer.innerHTML = '';
    
    if (node.effect) {
        gameEffects[node.effect.name](node.effect.params);
    }
    
    renderNoiseBar(); // Renderiza el ruido de la sala (gameState.location)
    
    typeText(node.text, true, () => {
        // Pasamos el nodeId actual para que las opciones sepan dónde están
        renderOptions(node.options, nodeId);
    });
    
    if (node.isLocationHub) {
        renderLocations(); // Solo actualiza los botones de sala si estamos en un hub
    }
}

function renderOptions(options, nodeId) {
    optionsContainer.innerHTML = '';
    if (!options || options.length === 0) return;
    
    options.forEach(option => {
        if (option.condition && !window[option.condition.func](option.condition.params)) {
            return;
        }

        const optEl = document.createElement('a');
        optEl.className = 'option-item';
        
        let optionText = option.text;
        if (option.countsSearch) {
            const count = gameState.roomCounters[option.countsSearch] || 0;
            const max = SEARCH_LIMITS[option.countsSearch] || 0;
            optionText += ` (${count}/${max})`;
        }
        
        optEl.textContent = `[ ${optionText} ]`;
        
        optEl.onclick = () => handleOptionClick(option, nodeId);
        optionsContainer.appendChild(optEl);
    });
    // Scroll forzoso para asegurar que se vean las opciones
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
    optionsContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function handleOptionClick(option, nodeId) {
    optionsContainer.innerHTML = '';
    
    if (option.countsSearch) {
        const count = gameState.roomCounters[option.countsSearch] || 0;
        const max = SEARCH_LIMITS[option.countsSearch] || 0;
        
        if (count >= max) {
            typeText("No queda nada más por aquí.", true, () => {
                // Vuelve a renderizar las opciones del nodo actual
                renderOptions(GAME_CONTENT[nodeId].options, nodeId);
            });
            return;
        }
        gameState.roomCounters[option.countsSearch]++;
    }
    
    if (option.action) {
        if (option.action.params) {
            window[option.action.func](option.action.params);
        } else {
             window[option.action.func]();
        }
    } else if (option.target) {
        showNode(option.target);
    }
}

// --- RENDERIZADO DE UI ---

function renderAllUI() {
    renderLocations();
    renderNoiseBar();
    renderPlayerState();
    renderRuloState();
    renderHeaderUI();
    renderMonsterProb();
}

function renderHeaderUI() {
    const backpackBtn = $('#backpack-btn');
    if (gameState.flags.backpack_enabled) {
        backpackBtn.classList.remove('hidden');
    } else {
        backpackBtn.classList.add('hidden');
    }
}

function renderLocations() {
    locationMenu.innerHTML = '';
    const locations = [
        { id: 'sala_vigilancia', name: 'Sala de Vigilancia' },
        { id: 'pasillo_este_hub', name: 'Pasillo Este' },
        { id: 'almacen', name: 'Almacén' },
        { id: 'oficina_seguridad', name: 'Oficina Seguridad' },
        { id: 'sotano', name: 'Sótano' },
    ];
    
    const unlocked = gameState.unlockedLocations || ['sala_vigilancia'];

    locations.forEach(loc => {
        const isLocked = !unlocked.includes(loc.id);
        const locBtn = document.createElement('button');
        locBtn.textContent = loc.name;
        
        if (isLocked) {
            locBtn.className = 'location-btn locked';
            locBtn.disabled = true;
        } else {
            locBtn.className = 'location-btn';
            if (gameState.location === loc.id) {
                locBtn.classList.add('active');
            }
            locBtn.onclick = () => showNode(loc.id);
        }
        locationMenu.appendChild(locBtn);
    });
}

function renderNoiseBar() {
    const noise = gameState.roomNoise[gameState.location] || 0;
    noiseValueUI.textContent = Math.round(noise);
    noiseBar.style.width = `${noise}%`;
    
    if (noise >= 75) {
        noiseBar.style.backgroundColor = 'var(--theme-scare)';
        noiseTextUI.textContent = 'Peligro';
        noiseTextUI.style.color = 'var(--theme-scare)';
    } else if (noise >= 50) {
        noiseBar.style.backgroundColor = 'var(--theme-agitated)';
        noiseTextUI.textContent = 'Inquieto';
        noiseTextUI.style.color = 'var(--theme-agitated)';
    } else {
        noiseBar.style.backgroundColor = 'var(--theme-calm)';
        noiseTextUI.textContent = 'Tranquilo';
        noiseTextUI.style.color = 'var(--theme-calm)';
    }
}

function renderPlayerState() {
    const stateText = getPlayerStateSummary();
    const stateClass = getPlayerStateClass();
    
    playerStateUI.textContent = stateText;
    playerStateUI.className = 'font-bold';
    playerStateUI.classList.add(stateClass);
}

function renderRuloState() {
    if (gameState.flags.rulo_dead) {
        ruloHud.classList.remove('hidden');
        ruloStateUI.textContent = "MUERTO";
        ruloStateUI.className = 'font-bold life-danger';
        return;
    }
    
    if (!gameState.flags.rulo_joins) {
        ruloHud.classList.add('hidden');
        return;
    }
    
    ruloHud.classList.remove('hidden');
    const hp = gameState.ruloStats.vida;
    let stateText = "OK";
    let stateClass = "life-ok";
    
    if (hp <= 40) { stateText = "HERIDO"; stateClass = "life-danger"; }
    else if (hp <= 70) { stateText = "DAÑADO"; stateClass = "life-low"; }
    else if (gameState.ruloStats.hambre <= 40 || gameState.ruloStats.agua <= 40) {
        stateText = "FATIGADO"; stateClass = "life-low";
    }
    
    ruloStateUI.textContent = stateText;
    ruloStateUI.className = 'font-bold';
    ruloStateUI.classList.add(stateClass);
}

// --- Modales (Confirmación, Stats, Mochila) ---

function showConfirmationModal(message, onConfirmCallback) {
    $('#confirm-message').textContent = message;
    
    // Limpia listeners antiguos y añade nuevos
    const confirmBtn = $('#confirm-btn-yes');
    const cancelBtn = $('#confirm-btn-no');
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.addEventListener('click', () => {
        onConfirmCallback();
        closeAllModals();
    });
    newCancelBtn.addEventListener('click', closeAllModals);
    
    closeAllModals(); // Cierra otros modales
    confirmModal.classList.remove('hidden');
}


function toggleBackpack() {
    if (!gameState.flags.backpack_enabled) return;
    
    if (backpackModal.classList.contains('hidden')) {
        closeAllModals();
        renderBackpack();
        backpackModal.classList.remove('hidden');
    } else {
        closeAllModals();
    }
}

function togglePlayerStats() {
    if (playerStatsModal.classList.contains('hidden')) {
        closeAllModals();
        renderPlayerStatsModal();
        playerStatsModal.classList.remove('hidden');
    } else {
        closeAllModals();
    }
}

function toggleRuloStats() {
    // Puedes ver stats de Rulo incluso si no te acompaña, pero sí está despierto
    if (!gameState.flags.rulo_awake || gameState.flags.rulo_dead) return;
    
    if (ruloStatsModal.classList.contains('hidden')) {
        closeAllModals();
        renderRuloStatsModal();
        ruloStatsModal.classList.remove('hidden');
    } else {
        closeAllModals();
    }
}

function closeAllModals() {
    backpackModal.classList.add('hidden');
    playerStatsModal.classList.add('hidden');
    ruloStatsModal.classList.add('hidden');
    confirmModal.classList.add('hidden');
    
    // No cerrar minijuegos desde aquí
}

function handleNarrativeClick() {
    // No hacer nada si un minijuego o modal está activo
    if (calmGameActive || fuseGameActive || !backpackModal.classList.contains('hidden')) return; 
    closeAllModals();
    skipTyping();
}

function renderBackpack() {
    backpackList.innerHTML = '';
    const items = Object.values(gameState.inventory);
    
    if (items.length === 0) {
        backpackList.innerHTML = '<div class="backpack-item">Vacía...</div>';
        return;
    }
    
    items.forEach(item => {
        if (item.id === 'mochila') return; // No mostrar la mochila dentro de sí misma

        const el = document.createElement('div');
        el.className = 'backpack-item flex justify-between items-center';
        
        let rarityClass = 'rarity-c';
        if (item.rarity === 'R') rarityClass = 'rarity-r';
        if (item.rarity === 'L') rarityClass = 'rarity-l';
        
        const itemInfo = `
            <span><span class="${rarityClass}">(${item.rarity})</span> ${item.name}</span>
            <span>x${item.qty}</span>
        `;
        
        const actionsEl = document.createElement('div');
        actionsEl.className = 'backpack-item-actions';
        
        if (item.consumable) {
            const useBtn = document.createElement('button');
            useBtn.textContent = 'Usar';
            useBtn.className = 'btn-action';
            useBtn.onclick = () => useItem(item.id, 'player');
            actionsEl.appendChild(useBtn);
            
            // Solo puedes dar cosas a Rulo si está despierto y no muerto
            if (gameState.flags.rulo_awake && !gameState.flags.rulo_dead) {
                const giveBtn = document.createElement('button');
                giveBtn.textContent = 'Dar a Rulo';
                giveBtn.className = 'btn-action';
                giveBtn.onclick = () => useItem(item.id, 'rulo');
                actionsEl.appendChild(giveBtn);
            }
        }
        
        el.innerHTML = itemInfo;
        el.appendChild(actionsEl);
        backpackList.appendChild(el);
    });
}

// Actualiza los modales de stats en tiempo real (llamado por el game loop)
function updateStatsModalRealtime() {
    if (!playerStatsModal.classList.contains('hidden')) {
        renderPlayerStatsModal();
    }
    if (!ruloStatsModal.classList.contains('hidden')) {
        renderRuloStatsModal();
    }
}

function createStatBar(label, value, colorClass, buttonHtml = '') {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    let color;
    if (colorClass === 'herido') color = 'var(--state-herido)';
    else if (colorClass === 'hambre') color = 'var(--state-hambre)';
    else if (colorClass === 'ansioso') color = 'var(--state-ansioso)';
    else color = 'var(--state-calm)';
    
    return `
        <li class="stat-item">
            <div class="stat-item-main">
                <span style="color: ${color}">${label}: ${percent}%</span>
                <div class="stat-bar">
                    <div class="stat-bar-inner" style="width: ${percent}%; background-color: ${color};"></div>
                </div>
            </div>
            ${buttonHtml}
        </li>
    `;
}

function renderPlayerStatsModal() {
    const stats = gameState.playerStats;
    let html = '';
    html += createStatBar('Vida', stats.vida, (stats.vida <= 40 ? 'herido' : (stats.vida <= 70 ? 'hambre' : 'calm')));
    
    // Botón de calmar solo si ansiedad > 50%
    const calmBtnHtml = `<button id="start-calm-btn" class="btn-action">Calmar</button>`;
    html += createStatBar('Ansiedad', stats.ansiedad, (stats.ansiedad >= 70 ? 'herido' : (stats.ansiedad >= 40 ? 'ansioso' : 'calm')), (stats.ansiedad > 50 ? calmBtnHtml : ''));
    
    // Hambre y Agua (invertidos, menos es malo)
    html += createStatBar('Hambre', stats.hambre, (stats.hambre <= 40 ? 'hambre' : 'calm'));
    html += createStatBar('Agua', stats.agua, (stats.agua <= 40 ? 'hambre' : 'calm'));
    
    playerStatsList.innerHTML = html;
}

function renderRuloStatsModal() {
    const stats = gameState.ruloStats;
    let html = '';
    
    if (gameState.flags.rulo_dead) {
        html = '<li class="stat-item" style="color: var(--state-herido);">Rulo está muerto.</li>';
        ruloStatsList.innerHTML = html;
        return;
    }
    
    html += createStatBar('Vida', stats.vida, (stats.vida <= 40 ? 'herido' : (stats.vida <= 70 ? 'hambre' : 'calm')));
    html += createStatBar('Hambre', stats.hambre, (stats.hambre <= 40 ? 'hambre' : 'calm'));
    html += createStatBar('Agua', stats.agua, (stats.agua <= 40 ? 'hambre' : 'calm'));
    
    ruloStatsList.innerHTML = html;
}

function useItem(itemId, target) {
    if (!hasItem(itemId)) return;
    
    const item = gameState.inventory[itemId];
    let feedbackText = "";
    let consumed = true; // La mayoría de items se consumen
    
    switch (itemId) {
        case 'barrita':
            if (target === 'player') updatePlayerStat('hambre', 40);
            else updateRuloStat('hambre', 40);
            feedbackText = (target === 'player' ? "Comes" : "Le das a Rulo") + " la barrita.";
            break;
        case 'botella_agua':
            if (target === 'player') updatePlayerStat('agua', 50);
            else updateRuloStat('agua', 50);
            feedbackText = (target === 'player' ? "Bebes" : "Le das a Rulo") + " agua.";
            break;
        case 'vendaje':
            let targetHP = (target === 'player') ? gameState.playerStats.vida : gameState.ruloStats.vida;
            let healing = (target === 'player') ? gameState.playerStats.healing.active : gameState.ruloStats.healing.active;
            
            if (targetHP < 100 && !healing) {
                startHealing(target); // Inicia curación gradual
                feedbackText = (target === 'player' ? "Aplicas" : "Rulo aplica") + " el vendaje.";
            } else {
                feedbackText = (target === 'player' ? "No necesitas" : "Rulo no necesita") + " curarse ahora.";
                consumed = false; // No consumir si no se usa
            }
            break;
        default:
            return; 
    }
    
    if (consumed) {
        removeItem(itemId, 1);
    }
    
    closeAllModals();
    logNotification(feedbackText, 'info');
    
    // Actualiza la mochila si está abierta
    if (!backpackModal.classList.contains('hidden')) {
        renderBackpack();
    }
}

// --- EFECTOS DE JUEGO Y NOTIFICACIONES ---

function logNotification(text, type = 'info') {
    // Si el texto es sobre el monstruo y el diálogo está activo,
    // esta función se asegura de que no interrumpa el diálogo.
    const el = document.createElement('div');
    el.className = 'notification-item';
    
    if (type === 'static') el.classList.add('notification-static');
    else if (type === 'sfx') el.classList.add('notification-sfx');
    else if (type === 'scare') el.classList.add('notification-scare');
    else if (type === 'item') el.classList.add('notification-item-found');
    else el.classList.add('notification-info'); // 'info'
    
    el.textContent = text;
    
    notificationLog.appendChild(el);
    notificationLog.scrollTop = notificationLog.scrollHeight;
}

// gameEffects ahora solo loguea en notificaciones y añade efectos visuales
const gameEffects = {
    playScare: ({ text, shake }) => {
        logNotification(text, 'scare'); // A la columna de notificaciones
        if (shake) {
            appContainer.classList.add('shake');
            setTimeout(() => appContainer.classList.remove('shake'), 300);
        }
        updatePlayerStat('ansiedad', 25);
    },
    playSfx: (text) => {
        logNotification(text, 'sfx'); // A la columna de notificaciones
    },
    playStatic: (text) => {
        logNotification(text, 'static'); // A la columna de notificaciones
    }
};

// --- LÓGICA DEL MONSTRUO Y REACCIÓN ---

function calculateMonsterProb() {
    if (gameState.flags.rulo_dead) {
        return 99; // Probabilidad máxima si Rulo muere
    }

    const noise = gameState.roomNoise[gameState.location] || 0;
    const anxiety = gameState.playerStats.ansiedad || 0;
    
    let diffMultiplier = 1.0;
    if (gameState.difficulty === 'easy') diffMultiplier = 0.6;
    if (gameState.difficulty === 'hard') diffMultiplier = 1.5;
    if (gameState.difficulty === 'nightmare') diffMultiplier = 2.2;

    // Fórmula de probabilidad: Ruido es el factor principal, Ansiedad el secundario
    let prob = (noise * 0.7) + (anxiety * 0.3);
    prob *= diffMultiplier;
    
    // Rulo reduce la probabilidad (si te acompaña)
    if (gameState.flags.rulo_joins) {
        prob *= 0.7; // Rulo reduce la prob en 30%
    }
    
    return Math.min(99, Math.max(0, Math.round(prob)));
}

function renderMonsterProb() {
    const prob = calculateMonsterProb();
    
    // Actualiza el medidor del Header (siempre visible si Rulo acompaña)
    if (gameState.flags.rulo_joins) {
        monsterProbHud.classList.remove('hidden');
        monsterProbValue.textContent = `${prob}%`;
    } else {
        monsterProbHud.classList.add('hidden');
    }

    // Actualiza el medidor de la columna de Notificaciones
    if (gameState.flags.rulo_joins) {
        ruloProbHeader.classList.remove('hidden');
        ruloProbHeader.innerHTML = `PROBABILIDAD: <span class="font-bold text-lg" style="color: var(--theme-scare);">${prob}%</span>`;
    } else {
        ruloProbHeader.classList.add('hidden');
    }
}


function checkRuloAlert() {
    if (!gameState.flags.rulo_joins || gameState.ruloAlertCooldown > 0 || gameState.monsterPresent || gameState.monsterApproaching) {
        return;
    }
    
    const currentRoomNoise = gameState.roomNoise[gameState.location] || 0;
    const probDetect = RULO_ALERT_BASE_PROB + (RULO_ALERT_SKILL_FACTOR * gameState.ruloAlertSkill);
    if (Math.random() < probDetect && currentRoomNoise > 30) {
        gameState.ruloAlertActive = true;
        gameState.ruloAlertCooldown = RULO_ALERT_COOLDOWN;
        changeRoomNoise(gameState.location, -8);
        logNotification('RULO: “¡ALGO NO VA BIEN, CÁLLATE!”', 'sfx');
        
        // Intenta iniciar el minijuego de calma
        startCalmMinigame();
    }
}

function checkMonsterSpawn() {
    if (gameState.monsterPresent || gameState.monsterApproaching) return;

    // Probabilidad de spawn real (basada en la prob. mostrada)
    const displayProb = calculateMonsterProb();
    // Convertimos la prob. (0-99) a una prob. por segundo (0.0 a 0.05)
    const finalProbPerSecond = (displayProb / 100) * 0.05; 
    
    if (Math.random() < finalProbPerSecond) {
        initiateMonsterApproach();
    }
}

function initiateMonsterApproach() {
    gameState.monsterApproaching = true;
    
    // No pausar el juego, solo registrar el acercamiento
    
    logNotification("...una sombra se alarga bajo la puerta...", 'sfx');
    
    const delay = 1000 + (Math.random() * 1000);
    setTimeout(spawnMonster, delay);
}

function spawnMonster() {
    // No spawnear si el jugador justo abrió un modal
    if (isGamePaused()) {
        gameState.monsterPresent = false;
        gameState.monsterApproaching = false;
        logNotification("...la sombra retrocede. Tuviste suerte.", 'info');
        return;
    }
    
    gameState.monsterPresent = true;
    gameState.monsterApproaching = false;
    
    let statePenalty = 0;
    if (gameState.playerStats.ansiedad >= 70) statePenalty += 0.2;
    if (gameState.playerStats.vida <= 40) statePenalty += 0.15;
    
    let ruloBonus = 1.0;
    if (gameState.flags.rulo_joins && !gameState.flags.rulo_dead && gameState.ruloStats.vida > 50) ruloBonus = 1.15;
    
    // Modificador de dificultad (tamaño del botón)
    let diffFactor = 1.0; // medium
    if (gameState.difficulty === 'easy') diffFactor = 1.25; // 25% más grande
    if (gameState.difficulty === 'hard') diffFactor = 0.75; // 25% más pequeño
    if (gameState.difficulty === 'nightmare') diffFactor = 0.5; // 50% más pequeño

    const currentRoomNoise = gameState.roomNoise[gameState.location] || 0;

    // FÓRMULA DE TAMAÑO
    const sizeFactor = Math.max(0.4, Math.min(1.8, 0.6 + (currentRoomNoise / 200) - statePenalty)) * ruloBonus * diffFactor;
    const baseSize = 80;
    const size = Math.round(baseSize * sizeFactor);
    
    // FÓRMULA DE TIEMPO
    const normalizedFactor = (sizeFactor - 0.4) / (1.8 - 0.4);
    reactionWindowMs = (1000 + (normalizedFactor * 2000)) * ruloBonus;
    
    const narrativeRect = narrativeContainer.getBoundingClientRect();
    const rectWidth = narrativeRect.width || narrativeContainer.clientWidth;
    const rectHeight = narrativeRect.height || narrativeContainer.clientHeight;
    
    // Asegurarse de que el botón no aparezca sobre la columna de notificaciones
    const usableWidth = rectWidth * (document.body.classList.contains('device-mobile') ? 1.0 : 0.66);
    
    const btnX = Math.random() * (usableWidth - size - 40) + 20;
    const btnY = Math.random() * (rectHeight - size - 40) + 20;
    
    reactionBtn.style.width = `${size}px`;
    reactionBtn.style.height = `${size}px`;
    reactionBtn.style.top = `${btnY}px`;
    reactionBtn.style.left = `${btnX}px`;
    reactionBtn.textContent = (reactionWindowMs / 1000).toFixed(1);
    reactionBtn.style.display = 'flex';
    
    reactionStartTime = Date.now();
    
    reactionTimeout = setTimeout(failReaction, reactionWindowMs);
    reactionTimerInterval = setInterval(updateReactionTimer, 100);
}

function updateReactionTimer() {
    const elapsed = Date.now() - reactionStartTime;
    const remaining = Math.max(0, reactionWindowMs - elapsed);
    reactionBtn.textContent = (remaining / 1000).toFixed(1);
    
    // Lógica de reducción de tamaño (sin cambios)
    const timePenalty = (elapsed / 10000);
    let statePenalty = 0;
    if (gameState.playerStats.ansiedad >= 70) statePenalty += 0.2;
    if (gameState.playerStats.vida <= 40) statePenalty += 0.15;
    let ruloBonus = 1.0;
    if (gameState.flags.rulo_joins && !gameState.flags.rulo_dead && gameState.ruloStats.vida > 50) ruloBonus = 1.15;
    let diffFactor = 1.0;
    if (gameState.difficulty === 'easy') diffFactor = 1.25;
    if (gameState.difficulty === 'hard') diffFactor = 0.75;
    if (gameState.difficulty === 'nightmare') diffFactor = 0.5;
    
    const currentRoomNoise = gameState.roomNoise[gameState.location] || 0;
    const sizeFactor = Math.max(0.4, Math.min(1.8, 0.6 + (currentRoomNoise / 200) - statePenalty - timePenalty)) * ruloBonus * diffFactor;
    const baseSize = 80;
    const size = Math.round(baseSize * sizeFactor);
    reactionBtn.style.width = `${size}px`;
    reactionBtn.style.height = `${size}px`;
}

function clickReactionBtn() {
    clearTimeout(reactionTimeout);
    clearInterval(reactionTimerInterval);
    reactionBtn.style.display = 'none';
    
    gameState.monsterPresent = false;
    gameState.monsterTime = 0;
    changeRoomNoise(gameState.location, -15);
    updatePlayerStat('ansiedad', -30);
    
    logNotification("...un movimiento rápido. El Eco retrocede. Estás a salvo.", 'sfx');
    
    // No es necesario llamar a resumeGame(), el loop principal ya no se detiene
}

function failReaction() {
    clearInterval(reactionTimerInterval);
    reactionBtn.style.display = 'none';
    
    gameState.monsterPresent = false;
    gameState.monsterTime = 0;
    updatePlayerStat('vida', -25);
    updatePlayerStat('ansiedad', 20);
    
    const items = Object.keys(gameState.inventory);
    let lostItem = "";
    if (items.length > 0) {
        const itemsToLose = items.filter(id => id !== 'mochila' && id !== 'destornillador' && id !== 'llave_oxidada');
        if (itemsToLose.length > 0) {
            const itemToLoseId = itemsToLose[Math.floor(Math.random() * itemsToLose.length)];
            lostItem = gameState.inventory[itemToLoseId].name;
            removeItem(itemToLoseId);
        }
    }
    
    logNotification(`¡DEMASIADO TARDE! El Eco te roza. Pierdes tu [${lostItem || 'cordura'}].`, 'scare');
    
    // No es necesario llamar a resumeGame()
}

// --- MINIJUEGO DE CALMA (Ansiedad) ---

function startCalmMinigame() {
    if (calmGameActive) return;
    
    // Condición: Ansiedad > 50%
    if (gameState.playerStats.ansiedad <= 50) {
        logNotification("No te sientes lo suficientemente ansioso como para necesitar esto.", 'info');
        return;
    }
    
    calmGameActive = true;
    // No pausar el game loop, la pausa se maneja con isGamePaused()
    closeAllModals();
    
    // Configuración de dificultad
    let targetWidthPercent = 25; // medium
    calmMarkerSpeed = 2.5;
    if (gameState.difficulty === 'easy') { targetWidthPercent = 35; calmMarkerSpeed = 2.0; }
    if (gameState.difficulty === 'hard') { targetWidthPercent = 20; calmMarkerSpeed = 3.0; }
    if (gameState.difficulty === 'nightmare') { targetWidthPercent = 15; calmMarkerSpeed = 3.5; }

    calmTargetLeft = Math.random() * (100 - targetWidthPercent);
    calmTargetWidth = targetWidthPercent;
    
    $('#calm-target').style.left = `${calmTargetLeft}%`;
    $('#calm-target').style.width = `${calmTargetWidth}%`;
    
    calmMarkerPos = 0;
    calmMarkerDir = 1;
    $('#calm-marker').style.left = `0%`;
    
    calmMinigame.classList.remove('hidden');
    
    window.addEventListener('keydown', handleCalmKey);
    calmGameInterval = setInterval(updateCalmMarker, 16); // ~60fps
    calmGameTimeout = setTimeout(failCalmMinigame, 8000); // 8 segundos para intentarlo
}

function updateCalmMarker() {
    calmMarkerPos += calmMarkerDir * calmMarkerSpeed;
    if (calmMarkerPos >= 100) {
        calmMarkerPos = 100;
        calmMarkerDir = -1;
    }
    if (calmMarkerPos <= 0) {
        calmMarkerPos = 0;
        calmMarkerDir = 1;
    }
    $('#calm-marker').style.left = `${calmMarkerPos}%`;
}

function handleCalmKey(e) {
    if (!calmGameActive) return;
    
    // Solo reacciona a Espacio
    if (e.key === ' ') {
        e.preventDefault();
        checkCalmHit();
    }
    // Permite skipear texto con Enter
    if (e.key === 'Enter') {
        skipTyping();
    }
}

// Esta función es llamada por el 'onclick' del HTML en móvil
function checkCalmHit() {
    if (!calmGameActive) return;
    
    const markerLeft = calmMarkerPos;
    const targetRight = calmTargetLeft + calmTargetWidth;
    
    if (markerLeft >= calmTargetLeft && markerLeft <= targetRight) {
        successCalmMinigame();
    } else {
        failCalmMinigame();
    }
}

function successCalmMinigame() {
    logNotification("Respiras hondo. Te sientes más calmado.", 'sfx');
    updatePlayerStat('ansiedad', -15);
    
    if (gameState.ruloAlertActive) {
        logNotification("...el peligro parece pasar.", 'sfx');
        gameState.ruloAlertActive = false; // Éxito en ahuyentar
    }
    
    stopCalmMinigame();
}

function failCalmMinigame() {
    logNotification("No logras concentrarte. Tu ansiedad aumenta.", 'scare');
    updatePlayerStat('ansiedad', 30); // Penalización por fallo
    // ruloAlertActive se queda en true, aumentando la prob. de spawn
    stopCalmMinigame();
}

function stopCalmMinigame() {
    if (!calmGameActive) return;
    calmGameActive = false;
    
    clearInterval(calmGameInterval);
    clearTimeout(calmGameTimeout);
    window.removeEventListener('keydown', handleCalmKey);
    
    calmMinigame.classList.add('hidden');
    
    // El game loop se reanudará automáticamente
}


// --- MINIJUEGO DE FUSIBLES (Ruido) ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startFuseMinigame() {
    if (fuseGameActive) return;

    // Condición: Ruido > 15
    const currentNoise = gameState.roomNoise[gameState.location] || 0;
    if (currentNoise <= 15) {
        logNotification("El ruido no es lo suficientemente alto como para necesitar recalibración.", 'info');
        return;
    }
    
    fuseGameActive = true;
    fuseGameSequence = [];
    
    // 1. Generar el puzzle
    const allColors = [
        { id: 'Rojo', class: 'fuse-red' }, 
        { id: 'Azul', class: 'fuse-blue' }, 
        { id: 'Verde', class: 'fuse-green' }, 
        { id: 'Amarillo', class: 'fuse-yellow' }, 
        { id: 'Blanco', class: 'fuse-white' }
    ];
    
    // Determinar Nivel de Dificultad del Puzzle
    let numFuses = 3; // Fácil
    if (currentNoise > 30 || gameState.playerStats.ansiedad > 40) numFuses = 4; // Medio
    if (currentNoise > 60 || gameState.playerStats.ansiedad > 70) numFuses = 5; // Difícil
    
    let puzzleColors = shuffleArray([...allColors]).slice(0, numFuses);
    let solution = shuffleArray([...puzzleColors]);
    let options = shuffleArray([...puzzleColors]);
    
    // Generar Pista (Ej: "Rojo = 3, Azul = 1, Verde = 2")
    let positions = shuffleArray(Array.from({length: numFuses}, (_, i) => i + 1));
    let hint = "PISTA: ";
    hint += solution.map((colorObj, index) => `${colorObj.id} = ${positions[index]}`).join(', ');
    
    // Asignar solución real basada en la pista
    let solutionWithPositions = solution.map((colorObj, index) => ({
        id: colorObj.id,
        pos: positions[index]
    }));
    // Ordenar por posición para obtener la solución correcta
    solutionWithPositions.sort((a, b) => a.pos - b.pos);
    const finalSolution = solutionWithPositions.map(item => item.id);

    // 2. Determinar Tiempo Límite
    let timeLimit = 30; // 30s base en Fácil
    if (gameState.difficulty === 'medium') timeLimit = 25;
    if (gameState.difficulty === 'hard') timeLimit = 20;
    if (gameState.difficulty === 'nightmare') timeLimit = 15;
    if (numFuses === 4) timeLimit -= 5;
    if (numFuses === 5) timeLimit -= 10;
    
    fuseGameData = {
        solution: finalSolution,
        options: options,
        hint: hint,
        timeLimit: Math.max(10, timeLimit), // Mínimo 10 seg
        baseNoise: currentNoise
    };

    // 3. Renderizar UI
    fuseHintBox.textContent = fuseGameData.hint;
    fuseTimer.textContent = fuseGameData.timeLimit.toFixed(1);
    
    // Renderizar botones de opciones
    fuseOptionsContainer.innerHTML = '';
    fuseGameData.options.forEach(colorObj => {
        const btn = document.createElement('button');
        btn.className = `btn-fuse ${colorObj.class}`;
        btn.textContent = colorObj.id;
        btn.onclick = () => selectFuse(colorObj.id, btn);
        fuseOptionsContainer.appendChild(btn);
    });
    
    renderFuseSequence();
    
    // Mostrar Ruido actual
    logNotification(`[MINIJUEGO] Ruido de sala actual: ${Math.round(currentNoise)}`, 'info');
    
    fuseMinigameModal.classList.remove('hidden');
    
    // 4. Iniciar Timer
    fuseGameTimer = setInterval(updateFuseTimer, 100);
}

function selectFuse(colorId, buttonEl) {
    if (!fuseGameActive || fuseGameSequence.length >= fuseGameData.solution.length) return;
    
    fuseGameSequence.push(colorId);
    buttonEl.classList.add('fuse-selected'); // Marcar como usado
    buttonEl.disabled = true;
    renderFuseSequence();
}

function renderFuseSequence() {
    if (fuseGameSequence.length === 0) {
        fuseSequenceDisplay.textContent = '...';
    } else {
        fuseSequenceDisplay.textContent = fuseGameSequence.join(' -> ');
    }
}

function clearFuseSequence() {
    fuseGameSequence = [];
    renderFuseSequence();
    // Reactivar botones
    $$('#fuse-options-container .btn-fuse').forEach(btn => {
        btn.classList.remove('fuse-selected');
        btn.disabled = false;
    });
}

function updateFuseTimer() {
    fuseGameData.timeLimit -= 0.1;
    fuseTimer.textContent = fuseGameData.timeLimit.toFixed(1);
    
    if (fuseGameData.timeLimit <= 5) {
        fuseTimer.style.color = (Math.floor(fuseGameData.timeLimit * 10) % 2 === 0) 
            ? 'var(--theme-scare)' 
            : 'var(--theme-text-bright)';
    }
    
    if (fuseGameData.timeLimit <= 0) {
        fuseTimer.textContent = '0.0';
        failFuseMinigame("¡Tiempo agotado!");
    }
}

function confirmFuseSequence() {
    let correct = fuseGameSequence.length === fuseGameData.solution.length;
    if (correct) {
        for (let i = 0; i < fuseGameData.solution.length; i++) {
            if (fuseGameSequence[i] !== fuseGameData.solution[i]) {
                correct = false;
                break;
            }
        }
    }
    
    if (correct) {
        successFuseMinigame();
    } else {
        failFuseMinigame("¡Secuencia incorrecta!");
    }
}

function stopFuseMinigame() {
    if (!fuseGameActive) return;
    fuseGameActive = false;
    clearInterval(fuseGameTimer);
    fuseTimer.style.color = 'var(--theme-scare)'; // Reset color
    fuseMinigameModal.classList.add('hidden');
    clearFuseSequence();
    // El game loop se reanudará solo
}

function successFuseMinigame() {
    let noiseReduction = 10 + (fuseGameData.baseNoise * 0.3); // Reduce 10 + 30% del ruido actual
    changeRoomNoise(gameState.location, -noiseReduction);
    logNotification(`Éxito. Ruido reducido en ${Math.round(noiseReduction)}.`, 'sfx');
    stopFuseMinigame();
}

function failFuseMinigame(reason) {
    changeRoomNoise(gameState.location, 10); // Penalización
    logNotification(`${reason} Sobrecarga. El ruido aumenta.`, 'scare');
    stopFuseMinigame();
}


// --- ACCIONES Y CONDICIONES DEL JUEGO ---

function checkHasItem(id) { return hasItem(id); }
function checkFlagFalse(flag) { return !gameState.flags[flag]; }
function checkFlagTrue(flag) { return gameState.flags[flag]; }
function checkDifficulty(diff) { return gameState.difficulty === diff; }
function checkRadioForzable() { return hasItem('destornillador') && gameState.flags.radio_forced_count < 2; }
// Condición para "Hablar con Rulo" (preguntar si se une)
function checkCanAskRuloToJoin() {
    return gameState.flags.rulo_awake && 
           !gameState.flags.rulo_joins && 
           !gameState.flags.rulo_rejected_join && 
           !gameState.flags.rulo_dead;
}
// Condición para "Dar Barrita a Rulo"
function checkCanGiveBarrita() {
    return hasItem('barrita') && 
           gameState.flags.rulo_awake && 
           !gameState.flags.rulo_joins && 
           !gameState.flags.rulo_dead;
}
// Condición para rutas del pasillo
function checkPasilloRouteAvailable() {
    return !gameState.flags.pasillo_este_route_chosen;
}


function rollD100() { return Math.floor(Math.random() * 100) + 1; }
function hasItem(id) { return gameState.inventory[id] && gameState.inventory[id].qty > 0; }

function addItem(id, name, rarity, qty = 1, consumable = false) {
    if (id === 'mochila') { // Caso especial mochila
        if (gameState.inventory[id]) return; // Ya la tiene
        gameState.inventory[id] = { id, name, rarity, qty: 1, consumable: false };
    }
    else if (gameState.inventory[id]) {
        gameState.inventory[id].qty += qty;
    } else {
        gameState.inventory[id] = { id, name, rarity, qty, consumable };
    }
    logNotification(`¡Objeto hallado! ${name} x${qty}`, 'item');
}

function removeItem(id, qty = 1) {
     if (hasItem(id)) {
        gameState.inventory[id].qty -= qty;
        if (gameState.inventory[id].qty <= 0) {
            delete gameState.inventory[id];
        }
     }
}

function changeRoomNoise(roomId, amount, isDecay = false) {
    if (!roomId) roomId = gameState.location;
    if (!gameState.roomNoise.hasOwnProperty(roomId)) return;
    
    let currentNoise = gameState.roomNoise[roomId] || 0;
    let newNoise = Math.max(0, Math.min(100, currentNoise + amount));
    gameState.roomNoise[roomId] = newNoise;
    
    if (amount > 0 && !isDecay) {
        updatePlayerStat('ansiedad', amount / 5);
        logNotification(`Ruido aumentado: +${Math.round(amount)}`, 'info');
    }
    
    if (roomId === gameState.location) {
        renderNoiseBar();
    }
}

// MODIFICADO: Vuelve al hub de la ubicación actual
function returnToPreviousLocation() {
    showNode(gameState.location); // Vuelve al hub actual
}

// --- Acciones de Nodos ---

function onEnterPasilloIntro() {
    // Si ya tienes la mochila, omite este nodo y ve directo al hub
    if (gameState.flags.backpack_enabled) {
        showNode('pasillo_este_hub');
        return false; // Detiene la ejecución de showNode para 'pasillo_este_intro'
    }
    return true; // Continúa mostrando 'pasillo_este_intro'
}

function enableBackpack() {
    addItem('mochila', 'Mochila', 'C', 1, false);
    gameState.flags.backpack_enabled = true;
    renderHeaderUI();
}

function despertarRulo(type) {
    gameState.flags.rulo_awake = true;
    let text = "";
    if (type === 'calm') {
        gameState.flags.rulo_awake_calm = true;
        text = "Lo sacudes suavemente. Rulo se sobresalta...\n'¿Qué... dónde...?'\nSusurra, 'No... no recuerdo cómo llegamos. Solo... la estática.'";
    } else {
        gameState.flags.rulo_awake_calm = false;
        text = "Lo sacudes con fuerza. Rulo se despierta con un grito ahogado.\n'¡NO! ¡NO ME TOQUES!'\nSe tapa la boca, pero el ruido ya está hecho.";
        changeRoomNoise(null, 30);
        gameEffects.playSfx("*GRITO AHOGADO*");
        updateRuloStat('vida', -5); // Daño a Rulo
    }
    typeText(text, true, () => renderOptions(GAME_CONTENT.sala_vigilancia.options, 'sala_vigilancia'));
}

function sintonizarRadio() {
    const roll = rollD100();
    let text = "Giras el dial. La estática es ensordecedora.\n";
    
    if (roll > 95) {
        text = "Voz clara: '...no confíes...'. Un compartimento se abre.";
        addItem('cinta_magnetica', 'Cinta Magnética', 'R');
        gameState.flags.radio_pista = true;
    } else if (roll > 60) {
        text += "Distingues un patrón: tres tonos... pausa... uno... pausa... dos. (3-1-2)";
        gameState.flags.radio_pista = true;
    } else {
        text += "¡CLACK! La radio suelta un chispazo y sube el volumen al máximo antes de morir.";
        changeRoomNoise(null, 30);
        gameEffects.playScare("ESTÁTICA ENSORDECEDORA", true);
    }
    
    // Sintonizar siempre está disponible, así que volvemos al nodo de radio
    typeText(text, true, () => renderOptions(GAME_CONTENT.revisar_radio.options, 'revisar_radio'));
}

function forzarRadio() {
    if (gameState.flags.radio_forced_count >= 2) {
        typeText("Has forzado la radio demasiadas veces. Está destrozada.", true, () => renderOptions(GAME_CONTENT.revisar_radio.options, 'revisar_radio'));
        return;
    }
    
    gameState.flags.radio_forced_count++;
    const roll = rollD100();
    let text = "Usas el destornillador para forzar la carcasa...\n";
    
    if (roll <= 5) {
        text += "¡ERROR! El destornillador toca un capacitor. La radio explota. La puerta del Sótano retumba.";
        changeRoomNoise(null, 100);
        gameEffects.playScare("EXPLOSIÓN DE RADIO", true);
        // El monstruo aparecerá por el ruido extremo
    } else if (roll > 50) {
        text += "La carcasa cede. Dentro, encuentras una [Batería Vieja].";
        addItem('bateria', 'Batería Vieja', 'C', 1, true);
    } else {
        text += "Logras abrirla, pero no parece haber nada útil dentro.";
    }
    
    typeText(text, true, () => renderOptions(GAME_CONTENT.revisar_radio.options, 'revisar_radio'));
}

function buscarEnSala(roomId) {
    const roll = rollD100();
    let text = "Buscas entre las cajas y el equipo roto...\n";
    changeRoomNoise(roomId, 5);
    updatePlayerStat('hambre', -2);
    updatePlayerStat('agua', -3);
    
    let findChance = 0;
    if (gameState.difficulty === 'easy') findChance = 25;
    if (gameState.difficulty === 'hard') findChance = -15;
    if (gameState.difficulty === 'nightmare') findChance = -30;
    
    if (roomId === 'sala_vigilancia') {
        if (roll > (80 - findChance) && !hasItem('llave_oxidada')) {
            text = "Debajo de unos papeles quemados, brilla una [Llave Oxidada].";
            addItem('llave_oxidada', 'Llave Oxidada', 'R');
        } else if (roll > (60 - findChance)) {
            text = "En un botiquín de pared, encuentras un [Vendaje].";
            addItem('vendaje', 'Vendaje', 'C', 1, true);
        } else if (roll > (40 - findChance) && !hasItem('destornillador')) {
            text = "Encuentras un [Destornillador] en buen estado.";
            addItem('destornillador', 'Destornillador', 'C');
        } else if (roll > (20 - findChance)) {
            text = "Encuentras una [Nota Rasgada]: '...se alimenta del ruido.'";
            addItem('nota_rasgada', 'Nota Rasgada', 'R');
        } else {
            text += "Polvo, óxido y cables. Nada útil.";
        }
    }
    
    typeText(text, true, () => renderOptions(GAME_CONTENT[roomId].options, roomId));
}

function usarDestornilladorPanel() {
    const roll = rollD100();
    let text = "Metes el destornillador en el panel, intentando hacer palanca...\n";
    
    if (roll > 40) {
        text += "¡CLACK! Un relé se activa. Las luces parpadean en verde. La puerta al Pasillo Este se abre.";
        changeRoomNoise(null, 15);
        gameState.flags.panel_abierto = true;
        if (!gameState.unlockedLocations.includes('pasillo_este_hub')) {
            gameState.unlockedLocations.push('pasillo_este_hub');
        }
        renderLocations();
        setTimeout(() => showNode('parte1_fin_exito'), 1000);
    } else {
        text += "¡CHISPAZO! El destornillador resbala. Cortocircuito. La sala se oscurece un segundo.";
        changeRoomNoise(null, 40);
        gameEffects.playScare("CORTOCIRCUITO", true);
        typeText(text, true, () => renderOptions(GAME_CONTENT.panel_pasillo.options, 'panel_pasillo'));
    }
}

function usarLlavePanel() {
    let text = "Pruebas la llave oxidada en la cerradura manual...\n";
    text += "Gira con un chirrido metálico. La puerta al Pasillo Este se desbloquea y se abre.";
    changeRoomNoise(null, 20);
    gameEffects.playSfx("*CHIRRIDO METÁLICO*");
    gameState.flags.panel_abierto = true;
    if (!gameState.unlockedLocations.includes('pasillo_este_hub')) {
        gameState.unlockedLocations.push('pasillo_este_hub');
    }
    renderLocations();
    setTimeout(() => showNode('parte1_fin_exito'), 1000);
}

function forzarPalancaPanel() {
     const roll = rollD100();
     let text = "Agarras la palanca de emergencia y tiras con todas tus fuerzas...\n";
     
     if (roll <= 20) {
         text += "¡CRACK! La palanca se rompe. Un ruido metálico retumba por el complejo.";
         changeRoomNoise(null, 80);
         gameEffects.playScare("RUIDO ESTRUENDOSO", true);
     } else {
         text += "Tiras y tiras, pero está atascada. No se mueve.";
         changeRoomNoise(null, 10);
     }
     typeText(text, true, () => renderOptions(GAME_CONTENT.panel_pasillo.options, 'panel_pasillo'));
}

function hablarConRulo() {
    gameState.flags.rulo_talked = true;
    let text = "Te acercas a Rulo. Sigue temblando.\n'¿Vas a venir conmigo?'\n";
    
    // Si ya te rechazó, no puedes volver a preguntar
    if (gameState.flags.rulo_rejected_join) {
        text = "Rulo niega con la cabeza. 'Te dije que no. Déjame en paz.'";
        typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
        return;
    }
    
    let probAcompañar = 0.3;
    if (gameState.flags.rulo_awake_calm) probAcompañar = 0.6;
    if (gameState.ruloStats.vida < 80) probAcompañar = 0.1;
    if (gameState.playerStats.ansiedad > 70) probAcompañar = 0.1; // Menos prob si estás alterado
    
    if (Math.random() < probAcompañar) {
        // Diálogo ambiental en lugar de "Ahora te acompaña"
        text = "Rulo mira la puerta del pasillo y luego a ti. Asiente lentamente.\n'Ese pasillo... me da mala espina. Pero peor es quedarse aquí.'";
        gameState.flags.rulo_joins = true;
    } else {
        text += "Rulo niega con la cabeza. 'No. Es demasiado peligroso. La voz... nos encontrará. Me quedo aquí.'";
        gameState.flags.rulo_joins = false;
        gameState.flags.rulo_rejected_join = true; // Rechazo final
    }
    
    renderRuloState();
    renderMonsterProb();
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

// Nueva acción para dar barrita
function darBarritaRulo() {
    if (!hasItem('barrita')) return;
    
    removeItem('barrita', 1);
    updateRuloStat('hambre', 40); // Rulo come la barrita
    logNotification("Le das una barrita a Rulo. La acepta y la come en silencio.", 'info');
    
    let text = "Rulo termina la barrita. Te mira, más calmado.\n'Gracias... Quizá... quizá sí debería ir contigo.'\n";
    
    let probAcompañar = 0.35; // 35% base por la barrita
    if (gameState.flags.rulo_awake_calm) probAcompañar += 0.2; // +20% si lo despertaste bien
    
    if (Math.random() < probAcompañar) {
        text += "'Está bien. Iré. Pero vámonos ya.'";
        gameState.flags.rulo_joins = true;
        gameState.flags.rulo_rejected_join = false; // Ya no está rechazado
    } else {
        text += "'...Pero sigo sin estar seguro. Déjame pensarlo.'";
        // No se une, pero resetea el rechazo para que puedas volver a "Hablar con Rulo"
        gameState.flags.rulo_rejected_join = false; 
    }

    renderRuloState();
    renderMonsterProb();
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}


function explorarPasillo() {
    gameState.flags.pasillo_este_route_chosen = true; // Se marca al elegir
    const roll = rollD100();
    let text = "Revisas las cajas de cartón mojadas, haciendo algo de ruido...\n";
    changeRoomNoise(null, 12);
    updatePlayerStat('hambre', -3);
    updatePlayerStat('agua', -4);
    
    let findChance = 0;
    if (gameState.difficulty === 'easy') findChance = 20;
    if (gameState.difficulty === 'hard') findChance = -10;
    if (gameState.difficulty === 'nightmare') findChance = -25;
    
    let qtyMultiplier = 1;
    if (gameState.difficulty === 'nightmare') qtyMultiplier = 0.5;

    if (roll > (75 - findChance)) {
        text = "¡Genial! Encuentras [Baterías] nuevas.";
        addItem('bateria', 'Batería Vieja', 'C', 2, true);
    } else if (roll > (40 - findChance)) {
        let qty = Math.max(1, Math.round(1 * qtyMultiplier));
        text = `Dentro hay una [Barrita Energética]${qty > 0 ? '' : ' (rancia y rota)'}.`;
        if (qty > 0) addItem('barrita', 'Barrita Energética', 'C', qty, true);
    } else if (roll > (20 - findChance)) {
        let qty = Math.max(1, Math.round(1 * qtyMultiplier));
        text = `Encuentras una [Botella de Agua]${qty > 0 ? ' medio llena' : ' (vacía y sucia)'}.`;
        if (qty > 0) addItem('botella_agua', 'Botella de Agua', 'C', qty, true);
    } else {
        text += "Vacía. Solo poliestireno húmedo.";
    }
    
    text += "\n\nHas explorado la zona. Al fondo, el pasillo se bifurca: 'Almacén' y 'Oficina de Seguridad'.";
    if (!gameState.unlockedLocations.includes('almacen')) {
        gameState.unlockedLocations.push('almacen');
    }
    if (!gameState.unlockedLocations.includes('oficina_seguridad')) {
        gameState.unlockedLocations.push('oficina_seguridad');
    }
    renderLocations();

    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

function moverSigilo() {
    gameState.flags.pasillo_este_route_chosen = true; // Se marca al elegir
    let text = "Avanzas despacio, pegado a la pared. Casi imperceptible.\n";
    changeRoomNoise(null, 2);
    
    if (Math.random() < 0.1) {
        text = "Algo brilla en una esquina. Es una [Llave Pequeña].";
        addItem('llave_oficina', 'Llave Pequeña', 'R');
    }
    
    text += "\nLlegas al final del pasillo. Hay dos puertas: 'Almacén' y 'Oficina de Seguridad'.";
    
    if (!gameState.unlockedLocations.includes('almacen')) {
        gameState.unlockedLocations.push('almacen');
    }
    if (!gameState.unlockedLocations.includes('oficina_seguridad')) {
        gameState.unlockedLocations.push('oficina_seguridad');
    }
    renderLocations();
    
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

function moverRapido() {
    gameState.flags.pasillo_este_route_chosen = true; // Se marca al elegir
    let text = "Corres por el pasillo. Tus pisadas retumban.\n";
    changeRoomNoise(null, 35);
    updatePlayerStat('ansiedad', 10);
    updatePlayerStat('agua', -5);
    
    const roll = rollD100();
    
    if (roll <= 70) { // 70% de probabilidad de caer
        text += "¡Tropiezas con un tubo de metal! El estruendo es terrible. Caes de mala manera.";
        let lifeLoss = gameState.playerStats.vida * 0.8; // Pierdes 80% de vida ACTUAL
        updatePlayerStat('vida', -lifeLoss);
        changeRoomNoise(null, 25);
        gameEffects.playScare("ESTRUENDO METÁLICO", true);
    } else {
        text += "Llegas al final. Ves las puertas del 'Almacén' y la 'Oficina de Seguridad'.";
    }
    
    if (!gameState.unlockedLocations.includes('almacen')) {
        gameState.unlockedLocations.push('almacen');
    }
    if (!gameState.unlockedLocations.includes('oficina_seguridad')) {
        gameState.unlockedLocations.push('oficina_seguridad');
    }
    renderLocations();
    
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

// --- CONTENIDO DEL JUEGO (NODOS DE HISTORIA) ---

const GAME_CONTENT = {
    'start': {
        isLocationHub: false,
        text: "Cargando...",
        options: []
    },
    
    // --- Sala Vigilancia (HUB) ---
    'sala_vigilancia': {
        isLocationHub: true,
        isCheckpoint: true,
        text: "Te despiertas. La sala huele a polvo e incienso quemado. El monitor emite un zumbido bajo. En la esquina, una vieja radio en el canal 19.\n\nA tu lado está Rulo, dormido. En la pantalla parpadea: NO CONFÍE EN LAS VOCES.",
        options: [
            { text: "Revisar la radio", target: "revisar_radio" },
            { text: "Levantarte y buscar salida", target: "buscar_salida" },
            { 
                text: "Buscar algo útil en la sala", 
                action: { func: "buscarEnSala", params: "sala_vigilancia" }, 
                countsSearch: "sala_vigilancia"
            },
            { text: "Despertar a Rulo (Suavemente)", action: { func: "despertarRulo", params: "calm" }, condition: { func: "checkFlagFalse", params: "rulo_awake" } },
            { text: "Despertar a Rulo (Bruscamente)", action: { func: "despertarRulo", params: "brusco" }, condition: { func: "checkFlagFalse", params: "rulo_awake" } },
        ]
    },
    'revisar_radio': {
        isInteraction: true,
        text: "La radio emite estática. La luz del canal 19 parpadea.",
        options: [
            // Sintonizar se puede hacer siempre
            { text: "Intentar sintonizar manualmente", action: { func: "sintonizarRadio" } },
            // Forzar solo 2 veces
            { text: "Forzar radio con destornillador", action: { func: "forzarRadio" }, condition: { func: "checkRadioForzable" } },
            { text: "Volver", action: { func: "returnToPreviousLocation" } }
        ]
    },
    'buscar_salida': {
        isInteraction: true,
        text: "La única salida parece ser una puerta metálica pesada: 'PASILLO ESTE'. Está cerrada. Al lado hay un panel de control.",
        options: [
            { text: "Inspeccionar panel de control", target: "panel_pasillo" },
            { text: "Volver", action: { func: "returnToPreviousLocation" } }
        ]
    },
    'panel_pasillo': {
        isInteraction: true,
        text: "Un panel de acceso. La luz está en rojo. Necesita energía o una llave para anular el cierre.",
        options: [
            { text: "Usar Destornillador en el panel", action: { func: "usarDestornilladorPanel" }, condition: { func: "checkHasItem", params: "destornillador" } },
            { text: "Usar Llave Oxidada", action: { func: "usarLlavePanel" }, condition: { func: "checkHasItem", params: "llave_oxidada" } },
            { text: "Forzar palanca de emergencia", action: { func: "forzarPalancaPanel" } },
            { text: "Volver", action: { func: "returnToPreviousLocation" } }
        ]
    },
    'parte1_fin_exito': {
        isInteraction: true,
        text: "La puerta al pasillo chisporrotea y se abre.\nUn golpe seco viene del sótano.",
        // La notificación del monstruo se maneja por separado
        onEnter: { func: "gameEffects.playScare", params: { text: "SOMBRA EN EL SÓTANO", shake: true } },
        options: [
            { text: "[Entrar al Pasillo Este]", target: "pasillo_este_intro" },
        ]
    },
    
    // --- PARTE 2 ---
    'pasillo_este_intro': {
        isInteraction: true,
        isCheckpoint: true,
        text: "Abres la puerta al pasillo Este. La luz de emergencia titila en rojo. A la derecha, apoyada contra una columna, hay una mochila vieja.",
        // onEnter revisa si ya tienes la mochila
        onEnter: { func: "onEnterPasilloIntro" }, 
        options: [
            { text: "Abrir la mochila", target: "abrir_mochila" }
        ]
    },
    'abrir_mochila': {
        isInteraction: true,
        text: "Abres la mochila. Está vacía, pero limpia. Transfieres tus cosas a ella.",
        onEnter: { func: "enableBackpack" }, // Añade la mochila y activa el flag
        options: [
            { text: "Continuar por el pasillo", target: "pasillo_este_hub" }
        ]
    },
    'pasillo_este_hub': {
        isLocationHub: true,
        isCheckpoint: true,
        text: "Estás en el Pasillo Este. Hay cajas de suministros podridas. Al fondo, el pasillo se bifurca. El zumbido es más fuerte aquí.",
        options: [
            { 
                text: "Revisar cajas (Ruta Exploratoria)", 
                action: { func: "explorarPasillo" },
                countsSearch: "pasillo_este_hub"
            },
            // Opciones de Ruta (solo aparecen si no se ha elegido una)
            { text: "Avanzar con cuidado (Ruta Cautelosa)", action: { func: "moverSigilo" }, condition: { func: "checkPasilloRouteAvailable" } },
            { text: "Correr al fondo (Ruta Rápida)", action: { func: "moverRapido" }, condition: { func: "checkPasilloRouteAvailable" } },
            
            // Opciones de Rulo
            { 
                text: "Hablar con Rulo (¿Vienes?)", 
                action: { func: "hablarConRulo" }, 
                condition: { func: "checkCanAskRuloToJoin" },
            },
            {
                text: "Dar Barrita a Rulo",
                action: { func: "darBarritaRulo" },
                condition: { func: "checkCanGiveBarrita" },
            },
            { text: "Volver a la Sala de Vigilancia", target: "sala_vigilancia" }
        ]
    },
    
    'almacen': {
        isLocationHub: true,
        isCheckpoint: true,
        text: "Llegas al almacén. Cajas apiladas, olor a aceite. Se oyen rascaduras detrás de una estantería.",
        options: [
            { text: "Buscar suministros (Próximamente)", target: "almacen" },
            { text: "Volver al Pasillo Este", target: "pasillo_este_hub" }
        ]
    },
    'oficina_seguridad': {
        isLocationHub: true,
        isCheckpoint: true,
        text: "Entras a la oficina de seguridad. Un escritorio volcado, notas en el suelo. Hay una llave colgando de un tablero.",
        options: [
            { text: "Leer notas (Próximamente)", target: "oficina_seguridad" },
            { text: "Volver al Pasillo Este", target: "pasillo_este_hub" }
        ]
    },
    'sotano': {
        isLocationHub: true,
        isCheckpoint: true,
        text: "La puerta al sótano está cerrada con cadenas.",
        options: [
             { text: "Volver a la Sala de Vigilancia", target: "sala_vigilancia" }
        ]
    },
};


// --- INICIALIZACIÓN Y EVENT LISTENERS ---

function init() {
    // Navegación Menú
    $('#play-btn').addEventListener('click', () => startGameFromMenu());
    $('#load-checkpoint-btn').addEventListener('click', loadCheckpoint);
    $('#settings-btn').addEventListener('click', () => showScreen('settings'));
    $('#back-to-menu-btn').addEventListener('click', goToMenu);
    $('#game-back-to-menu-btn').addEventListener('click', goToMenu);
    $('#change-device-btn').addEventListener('click', () => showScreen('device_select'));
    
    $('#reset-data-btn').addEventListener('click', () => {
        showConfirmationModal(
            "¿Estás seguro de que quieres borrar TODOS los datos guardados? Esto incluye progreso, tema y selección de dispositivo. La acción no se puede deshacer.",
            resetAllData
        );
    });
    
    // Botones de Dificultad
    $('#difficulty-easy').addEventListener('click', () => selectDifficulty('easy'));
    $('#difficulty-medium').addEventListener('click', () => selectDifficulty('medium'));
    $('#difficulty-hard').addEventListener('click', () => selectDifficulty('hard'));
    $('#difficulty-nightmare').addEventListener('click', () => selectDifficulty('nightmare'));
    $('#difficulty-back-btn').addEventListener('click', goToMenu);

    // Opciones de Tema
    $('#theme-select').addEventListener('change', (e) => {
        changeTheme(e.target.value);
    });
    const savedTheme = localStorage.getItem(SAVE_KEY_THEME) || 'green';
    $('#theme-select').value = savedTheme;
    changeTheme(savedTheme);
    
    // UI del Juego
    $('#backpack-btn').addEventListener('click', toggleBackpack);
    $('#close-backpack-btn').addEventListener('click', closeAllModals);
    $('#reaction-btn').addEventListener('click', clickReactionBtn);
    
    // Modales de Stats
    $('#player-state-button').addEventListener('click', togglePlayerStats);
    $('#close-player-stats-btn').addEventListener('click', closeAllModals);
    $('#rulo-hud').addEventListener('click', toggleRuloStats);
    $('#close-rulo-stats-btn').addEventListener('click', closeAllModals);

    // Listener para botón de calma (delegación de eventos)
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'start-calm-btn') {
            startCalmMinigame();
        }
    });
    $('#calm-cancel-btn').addEventListener('click', () => stopCalmMinigame(true)); // Cancelar NO falla
    
    // Listeners Minijuego Fusibles
    $('#fuse-confirm-btn').addEventListener('click', confirmFuseSequence);
    $('#fuse-clear-btn').addEventListener('click', clearFuseSequence);
    
    // Listener de Teclado Global
    window.addEventListener('keydown', (e) => {
        // El minijuego de calma tiene su propio listener
        if (calmGameActive) {
            handleCalmKey(e);
            return;
        }

        if (gameScreen.style.display === 'flex') {
            if (e.key.toLowerCase() === 'm' && gameState.flags.backpack_enabled) {
                toggleBackpack();
            }
            if (e.key.toLowerCase() === 'e') {
                togglePlayerStats();
            }
        }

        if (e.key === 'Escape') {
            if (calmGameActive) { stopCalmMinigame(true); return; }
            if (fuseGameActive) { stopFuseMinigame(); return; }
            
            if (!backpackModal.classList.contains('hidden') || 
                !playerStatsModal.classList.contains('hidden') || 
                !ruloStatsModal.classList.contains('hidden') ||
                !confirmModal.classList.contains('hidden')) {
                closeAllModals();
            }
            else if (settingsScreen.style.display === 'flex' || difficultySelectScreen.style.display === 'flex') {
                showScreen('main');
            }
            else if (gameScreen.style.display === 'flex') {
                goToMenu();
            }
        }
    });
    
    // Click en la barra de ruido (inicia minijuego de fusibles)
    $('#noise-bar-container').addEventListener('click', () => {
        if (isTyping || isGamePaused() || gameScreen.style.display === 'none') return;
        startFuseMinigame(); // Esta función ahora contiene el chequeo de > 15
    });

    // Comprobar estado de guardado al cargar
    if (localStorage.getItem(SAVE_KEY_CURRENT)) {
        $('#play-btn').textContent = 'Continuar';
    } else {
        $('#play-btn').textContent = 'Jugar';
    }
    if (!localStorage.getItem(SAVE_KEY_CHECKPOINT)) {
        $('#load-checkpoint-btn').classList.add('hidden');
    }
    
    // Lógica de Inicio con Selector de Dispositivo
    $('#device-btn-mobile').addEventListener('click', () => selectDevice('mobile'));
    $('#device-btn-pc').addEventListener('click', () => selectDevice('pc'));
    
    const savedDevice = localStorage.getItem(SAVE_KEY_DEVICE);
    if (savedDevice) {
        selectDevice(savedDevice); 
    } else {
        showScreen('device_select'); 
    }
}

document.addEventListener('DOMContentLoaded', init);
