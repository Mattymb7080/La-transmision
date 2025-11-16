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
const saveIcon = $('#save-icon');
const reactionBtn = $('#reaction-btn');
const monsterProbHud = $('#monster-prob-hud'); // Medidor de prob. en Header
const monsterProbValue = $('#monster-prob-value');
const ruloProbHeader = $('#rulo-prob-header'); // Medidor de prob. en Columna Notif.
const deathOverlay = $('#death-overlay'); // Overlay de muerte
const talkRuloBtn = $('#talk-rulo-btn'); // Botón Hablar con Rulo

// Modales
const backpackModal = $('#backpack-modal');
const backpackList = $('#backpack-list');
const backpackNotesList = $('#backpack-notes-list'); // Lista de Notas
const noteReaderModal = $('#note-reader-modal'); // Lector de Notas
const noteReaderTitle = $('#note-reader-title');
const noteReaderContent = $('#note-reader-content');
const playerStatsModal = $('#player-stats-modal');
const playerStatsList = $('#player-stats-list');
const ruloStatsModal = $('#rulo-stats-modal');
const ruloStatsList = $('#rulo-stats-list');
const confirmModal = $('#confirm-modal');
const calmMinigame = $('#calm-minigame');
const calmTapArea = $('#calm-tap-area'); // Área de toque para móvil

// Modal Selección Minijuego Ruido
const noiseMinigameSelectModal = $('#noise-minigame-select-modal');
const noiseSelectCurrentNoise = $('#noise-select-current-noise');

// Minijuego Fusibles
const fuseMinigameModal = $('#fuse-minigame-modal');
const fuseTimer = $('#fuse-timer');
const fuseHintBox = $('#fuse-hint-box');
const fuseOptionsContainer = $('#fuse-options-container');
const fuseSequenceDisplay = $('#fuse-sequence-display');
const fuseConfirmBtn = $('#fuse-confirm-btn');
const fuseClearBtn = $('#fuse-clear-btn');

// Minijuego Resonancia
const resonanceMinigameModal = $('#resonance-minigame-modal');
const resonanceTimer = $('#resonance-timer');
const resonanceHintBox = $('#resonance-hint-box');
const resonanceCanvas = $('#resonance-canvas');

// Transición de Noche
const nightTransitionOverlay = $('#night-transition-overlay');
const nightTransitionText = $('#night-transition-text');

// Keypad Caja Fuerte
const safeKeypadModal = $('#safe-keypad-modal');
const keypadDigits = $$('.keypad-digit');

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

// Estado del Minijuego de Resonancia
let resonanceGameActive = false;
let resonanceGameTimer = null;
let resonanceGameData = {
    timeLimit: 90,
    solution: [], // Parte 2
    nodes: [] // Parte 2
};


// Parámetros del Juego
const RULO_ALERT_COOLDOWN = 30;
const RULO_ALERT_BASE_PROB = 0.2;
const RULO_ALERT_SKILL_FACTOR = 0.6;
const NOTIFICATION_LIMIT = 15; // Límite de notificaciones en pantalla

// Límite de Búsquedas (por ID de sala)
const SEARCH_LIMITS = {
    'sala_vigilancia': 6,
    'pasillo_este_hub': 8,
    'almacen': 8,
    'oficina_seguridad': 4,
    'sala_vigilancia_secreta': 3 
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

    if (stat === 'vida' && newValue <= 0) {
        handlePlayerDeath();
    }
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
    if (stat === 'bateria' && newValue <= 0 && gameState.flags.linterna_rulo) {
        logNotification("La linterna de Rulo se apaga. 'Se... se acabó.'", 'scare');
        gameState.flags.linterna_rulo = false; 
    }
}

// Funciones de curación gradual
function startHealing(target) {
    if (target === 'player') {
        if (gameState.playerStats.healing.active) return; 
        let anxiety = gameState.playerStats.ansiedad;
        let healRate = Math.max(0.1, 0.5 - (anxiety / 250));
        gameState.playerStats.healing = { active: true, remaining: 30, perSecond: healRate };
        logNotification("Empiezas a vendarte. La curación será lenta.", 'info');
    } else {
        if (gameState.ruloStats.healing.active) return;
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
    if (stats.ansiedad >= 70) return "AGITADO";
    if (stats.vida <= 70) return "DAÑADO";
    if (stats.ansiedad >= 40) return "ANSIOSO";
    if (stats.hambre <= 40 || stats.agua <= 40) return "FATIGADO";
    
    return "CALMADO";
}

function getPlayerStateClass() {
    const stats = gameState.playerStats;
    if (!stats) return "life-ok";
    
    if (stats.vida <= 40) return "life-danger"; 
    if (stats.ansiedad >= 70) return "life-danger"; 
    if (stats.vida <= 70) return "life-low"; 
    if (stats.ansiedad >= 40) return "life-anxious"; 
    if (stats.hambre <= 40 || stats.agua <= 40) return "life-low"; 
    
    return "life-ok"; 
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
            
            if (!gameState.playerStats) {
                gameState.playerStats = { vida: 100, ansiedad: 0, hambre: 100, agua: 100, healing: { active: false, remaining: 0, perSecond: 0 } };
            } else {
                if (gameState.playerStats.hambre === 0) gameState.playerStats.hambre = 100;
                if (gameState.playerStats.agua === 0) gameState.playerStats.agua = 100;
                if (!gameState.playerStats.healing) gameState.playerStats.healing = { active: false, remaining: 0, perSecond: 0 };
            }

            if (gameState.ruloHP !== undefined) { 
                gameState.ruloStats = { vida: gameState.ruloHP, hambre: 100, agua: 100, bateria: 0, healing: { active: false, remaining: 0, perSecond: 0 } };
                delete gameState.ruloHP; 
            } else if (!gameState.ruloStats) { 
                gameState.ruloStats = { vida: 100, hambre: 100, agua: 100, bateria: 0, healing: { active: false, remaining: 0, perSecond: 0 } };
            } else if (gameState.ruloStats.bateria === undefined) {
                gameState.ruloStats.bateria = 0; 
            }
            
            if (!gameState.roomNoise) {
                const oldNoise = gameState.noise || 0;
                gameState.roomNoise = { 'sala_vigilancia': oldNoise, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0, 'sotano': 0, 'sala_vigilancia_secreta': 0 };
                delete gameState.noise;
            } else if (!gameState.roomNoise.sala_vigilancia_secreta) {
                gameState.roomNoise.sala_vigilancia_secreta = 0;
            }

            if (!gameState.roomCounters) gameState.roomCounters = { 'sala_vigilancia': 0, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0, 'sala_vigilancia_secreta': 0 };
             else if (!gameState.roomCounters.sala_vigilancia_secreta) {
                gameState.roomCounters.sala_vigilancia_secreta = 0;
            }

            if (!gameState.location || gameState.location === 'start') gameState.location = 'sala_vigilancia';
            if (!gameState.previousLocation) gameState.previousLocation = 'sala_vigilancia';
            if (!gameState.difficulty) gameState.difficulty = 'medium';
            
            if (gameState.flags.radio_forced_count === undefined) gameState.flags.radio_forced_count = 0;
            if (gameState.flags.rulo_rejected_join === undefined) gameState.flags.rulo_rejected_join = false;
            if (gameState.flags.rulo_dead === undefined) gameState.flags.rulo_dead = false;
            if (gameState.flags.pasillo_este_route_chosen === undefined) gameState.flags.pasillo_este_route_chosen = false;
            if (gameState.flags.player_dead === undefined) gameState.flags.player_dead = false;
            if (gameState.flags.hab_secreta_unlocked === undefined) gameState.flags.hab_secreta_unlocked = false;
            if (gameState.flags.linterna_found === undefined) gameState.flags.linterna_found = false;
            if (gameState.flags.linterna_rulo === undefined) gameState.flags.linterna_rulo = false;
            if (gameState.flags.fragmentos_safe_count === undefined) gameState.flags.fragmentos_safe_count = 0;
            if (gameState.flags.safe_almacen_open === undefined) gameState.flags.safe_almacen_open = false;
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
            saveGameState(); 
            
            stopGameLoop();
            showScreen('game');
            renderAllUI();
            
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
    notificationLog.innerHTML = ''; // Limpiar notificaciones
    location.reload(); 
}

function flashSaveIcon() {
    saveIcon.style.opacity = '1';
    setTimeout(() => {
        saveIcon.style.opacity = '0';
    }, 1500);
}

function resetGame() {
    localStorage.removeItem(SAVE_KEY_CURRENT);
    localStorage.removeItem(SAVE_KEY_CHECKPOINT);
    
    gameState = {
        location: 'sala_vigilancia',
        previousLocation: 'sala_vigilancia',
        difficulty: 'medium', 
        inventory: {},
        roomNoise: {
            'sala_vigilancia': 0, 'pasillo_este_hub': 0, 'almacen': 0, 
            'oficina_seguridad': 0, 'sotano': 0, 'sala_vigilancia_secreta': 0
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
            bateria: 0, 
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
            player_dead: false,
            hab_secreta_unlocked: false,
            linterna_found: false,
            linterna_rulo: false,
            fragmentos_safe_count: 0, // Contará cuántos tienes (A, B, C)
            safe_almacen_open: false,
            safe_code: "4815" // Código estático por ahora (Parte 1)
        },
        unlockedLocations: ['sala_vigilancia'],
        monsterPresent: false,
        monsterApproaching: false,
        monsterTime: 0,
        ruloAlertCooldown: 0,
        ruloAlertActive: false,
        ruloAlertSkill: 0.7,
        roomCounters: {
            'sala_vigilancia': 0, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0, 'sala_vigilancia_secreta': 0
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
    
    // BUGFIX: Ocultar la transición de noche por si acaso
    nightTransitionOverlay.classList.add('hidden');
    
    const gameMenuBtn = $('#game-back-to-menu-btn');
    
    if (screenId === 'main') mainMenu.style.display = 'flex';
    if (screenId === 'settings') settingsScreen.style.display = 'flex';
    if (screenId === 'difficulty_select') difficultySelectScreen.style.display = 'flex';
    if (screenId === 'game') gameScreen.style.display = 'flex';
    if (screenId === 'device_select') deviceSelectOverlay.style.display = 'flex';
    
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
        // BUGFIX: No mostrar transición al continuar
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
    resetGame(); 
    gameState.difficulty = difficulty;
    // PARTE 2: Aquí se generarían los códigos aleatorios
    // gameState.flags.safe_code = generateRandomCode();
    saveGameState(); 
    
    // BUGFIX: Inicia el juego CON la transición
    showNightTransition('NOCHE 1', () => {
        showScreen('game');
        renderAllUI();
        showNode(gameState.location); 
        startGameLoop();
    });
}

// Transición de Noche
function showNightTransition(text, onCompleteCallback) {
    nightTransitionText.textContent = text;
    nightTransitionText.dataset.text = text;
    
    nightTransitionOverlay.classList.remove('hidden', 'fade-out');
    
    setTimeout(() => {
        nightTransitionOverlay.classList.add('fade-out');
    }, 3000); 
    
    setTimeout(() => {
        nightTransitionOverlay.classList.add('hidden');
        onCompleteCallback();
    }, 5000); 
}

function goToMenu() {
    stopGameLoop();
    if (gameScreen.style.display === 'flex') {
        saveGameState(); 
    }
    showScreen('main');
    if (localStorage.getItem(SAVE_KEY_CURRENT)) {
        $('#play-btn').textContent = 'Continuar';
    } else {
        $('#play-btn').textContent = 'Jugar';
    }
}

// --- BUCLE DE JUEGO (Actualizaciones por segundo) ---

function startGameLoop() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(updateGameLoop, 1000); 
}

function stopGameLoop() {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
}

function isGamePaused() {
    return !backpackModal.classList.contains('hidden') ||
           !playerStatsModal.classList.contains('hidden') ||
           !ruloStatsModal.classList.contains('hidden') ||
           !confirmModal.classList.contains('hidden') ||
           !noteReaderModal.classList.contains('hidden') || 
           !noiseMinigameSelectModal.classList.contains('hidden') || 
           !safeKeypadModal.classList.contains('hidden') || // NUEVO
           calmGameActive ||
           fuseGameActive ||
           resonanceGameActive || 
           gameState.monsterPresent || 
           gameState.flags.player_dead; 
}

function updateGameLoop() {
    if (isGamePaused()) {
        updateStatsModalRealtime();
        return;
    }

    updatePlayerStatsDecay();
    updatePlayerHealing();
    updateAnsiedad();
    
    if (gameState.flags.rulo_joins && !gameState.flags.rulo_dead) {
        updateRuloStatsDecay();
        updateRuloHealing();
    }

    if (gameState.ruloAlertCooldown > 0) {
        gameState.ruloAlertCooldown--;
    }
    checkRuloAlert();
    
    if (!gameState.monsterApproaching) {
        checkMonsterSpawn();
    }
    
    renderNoiseBar();
    renderPlayerState();
    renderMonsterProb();
    updateStatsModalRealtime(); 
}

function updatePlayerStatsDecay() {
    const stats = gameState.playerStats;
    let lifeFactor = (stats.vida < 50) ? 1.5 : 1.0;
    lifeFactor = (stats.vida < 25) ? 2.0 : lifeFactor;
    
    let hungerRate = (0.05 * lifeFactor);
    let waterRate = (0.08 * lifeFactor);
    
    updatePlayerStat('hambre', -hungerRate);
    updatePlayerStat('agua', -waterRate);
    
    let damage = 0;
    if (stats.hambre <= 0) damage += 0.1;
    if (stats.agua <= 0) damage += 0.2;
    
    if (damage > 0) {
        let anxietyFactor = 1 + (stats.ansiedad / 100);
        updatePlayerStat('vida', -(damage * anxietyFactor));
    }
}

function updateRuloStatsDecay() {
    const stats = gameState.ruloStats;
    let lifeFactor = (stats.vida < 50) ? 1.5 : 1.0;
    
    let hungerRate = (0.04 * lifeFactor);
    let waterRate = (0.06 * lifeFactor);
    
    updateRuloStat('hambre', -hungerRate);
    updateRuloStat('agua', -waterRate);
    
    if (gameState.flags.linterna_rulo && stats.bateria > 0) {
        updateRuloStat('bateria', -0.5); // 1% cada 2 segundos
    }
}

function updateAnsiedad() {
    const stats = gameState.playerStats;
    let anxietyChange = 0;
    
    if (stats.hambre < 30) anxietyChange += 0.1;
    if (stats.agua < 30) anxietyChange += 0.15;
    
    if (gameState.roomNoise[gameState.location] < 15) {
        anxietyChange -= 0.1;
    } else if (gameState.flags.rulo_joins && !gameState.flags.rulo_dead) {
        anxietyChange -= 0.05; 
    }
    
    updatePlayerStat('ansiedad', anxietyChange);

    if (stats.ansiedad >= 100) {
        updatePlayerStat('vida', -0.2); 
    }
    
    if (stats.ansiedad >= 100 && !calmGameActive) {
        logNotification("¡PÁNICO! ¡No puedes respirar!", 'scare');
        startCalmMinigame(); 
    }
}

function ruloLeaves(reason) {
    gameState.flags.rulo_joins = false;
    gameState.flags.rulo_rejected_join = true; 
    
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
    
    renderRuloState();
    renderMonsterProb();
}

function handlePlayerDeath() {
    if (gameState.flags.player_dead) return; 
    
    gameState.flags.player_dead = true;
    stopGameLoop();
    
    deathOverlay.classList.remove('hidden');
    deathOverlay.classList.add('player-dying'); 
    
    setTimeout(() => {
        loadCheckpoint(); 
        
        setTimeout(() => {
            logNotification("Moriste.", 'scare');
            typeText("...¿Qué pasó?...", true, () => {
                renderOptions(GAME_CONTENT[gameState.location].options, gameState.location);
            });
        }, 200); 

    }, 4000); 
}


// --- SISTEMA DE ESCRITURA (TIPEO) ---

function typeText(fullText, clearLog = false, onComplete = () => {}) {
    if (isTyping) {
        finishTyping(true); 
    }
    
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
    
    if (node.onEnter) {
        let result = true;
        if (node.onEnter.params) {
            result = window[node.onEnter.func](node.onEnter.params);
        } else {
            result = window[node.onEnter.func]();
        }
        if (result === false) {
            return;
        }
    }

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
    
    renderNoiseBar(); 
    
    typeText(node.text, true, () => {
        renderOptions(node.options, nodeId);
    });
    
    if (node.isLocationHub) {
        renderLocations(); 
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
                renderOptions(GAME_CONTENT[nodeId].options, nodeId);
            });
            return;
        }
        gameState.roomCounters[option.countsSearch]++;
        
        // BUGFIX: La regla 'pasillo_este_route_chosen' NO debe activarse
        // si la opción es *solo* de búsqueda (countsSearch) y no de ruta.
        // La acción 'explorarPasillo' ya NO activa el flag.
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
        { id: 'sala_vigilancia_secreta', name: 'Hab. Secreta' }, 
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
            // BUGFIX: No renderizar el botón si está bloqueado
            return; 
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
    if (gameState.flags.rulo_joins && !gameState.flags.rulo_dead) {
        talkRuloBtn.classList.remove('hidden');
    } else {
        talkRuloBtn.classList.add('hidden');
    }
    
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
    const stats = gameState.ruloStats;
    let stateText = "OK";
    let stateClass = "life-ok";
    
    if (stats.vida <= 40) { stateText = "HERIDO"; stateClass = "life-danger"; }
    else if (stats.vida <= 70) { stateText = "DAÑADO"; stateClass = "life-low"; }
    else if (stats.hambre <= 40 || stats.agua <= 40) {
        stateText = "FATIGADO"; stateClass = "life-low";
    }
    else if (gameState.flags.linterna_rulo && stats.bateria <= 20) {
        stateText = "BATERÍA BAJA"; stateClass = "life-low";
    }
    
    ruloStateUI.textContent = stateText;
    ruloStateUI.className = 'font-bold';
    ruloStateUI.classList.add(stateClass);
}

// --- Modales (Confirmación, Stats, Mochila) ---

function showConfirmationModal(message, onConfirmCallback) {
    $('#confirm-message').textContent = message;
    
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
    
    closeAllModals(); 
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
    noteReaderModal.classList.add('hidden'); 
    noiseMinigameSelectModal.classList.add('hidden'); 
    safeKeypadModal.classList.add('hidden');
    
    // Detener minijuegos si se cierran
    if (fuseGameActive) stopFuseMinigame(true); // true = cancelar
    if (resonanceGameActive) stopResonanceMinigame(true); 
    if (calmGameActive) stopCalmMinigame(true);
}

function handleNarrativeClick() {
    if (isGamePaused()) return; 
    closeAllModals();
    skipTyping();
}

function renderBackpack() {
    backpackList.innerHTML = '';
    backpackNotesList.innerHTML = ''; 
    
    const items = Object.values(gameState.inventory);
    let notesFound = 0;
    let fragmentsFound = 0;
    
    if (items.length === 0) {
        backpackList.innerHTML = '<div class="backpack-item">Vacía...</div>';
    }

    items.forEach(item => {
        if (item.isNote) {
            notesFound++;
            const noteEl = document.createElement('div');
            noteEl.className = 'backpack-note-item';
            noteEl.textContent = item.name;
            noteEl.onclick = () => showNote(item.id);
            backpackNotesList.appendChild(noteEl);
            
            if (item.id === 'fragmento_a' || item.id === 'fragmento_b' || item.id === 'fragmento_c') {
                fragmentsFound++;
            }
            return; 
        }
        
        if (item.id === 'mochila') return; 

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
        
        if (item.id === 'linterna' && !gameState.flags.linterna_rulo) {
            const giveBtn = document.createElement('button');
            giveBtn.textContent = 'Dar a Rulo';
            giveBtn.className = 'btn-action';
            giveBtn.onclick = () => useItem(item.id, 'rulo');
            actionsEl.appendChild(giveBtn);
        }
        else if (item.consumable) {
            const useBtn = document.createElement('button');
            useBtn.textContent = 'Usar';
            useBtn.className = 'btn-action';
            useBtn.onclick = () => useItem(item.id, 'player');
            actionsEl.appendChild(useBtn);
            
            if (gameState.flags.rulo_awake && !gameState.flags.rulo_dead) {
                if (item.id === 'barrita' || item.id === 'botella_agua' || item.id === 'vendaje' || item.id === 'bateria') {
                    const giveBtn = document.createElement('button');
                    giveBtn.textContent = 'Dar a Rulo';
                    giveBtn.className = 'btn-action';
                    giveBtn.onclick = () => useItem(item.id, 'rulo');
                    actionsEl.appendChild(giveBtn);
                }
            }
        }
        
        el.innerHTML = itemInfo;
        el.appendChild(actionsEl);
        backpackList.appendChild(el);
    });
    
    if (notesFound === 0) {
        backpackNotesList.innerHTML = '<div class="backpack-note-item" style="cursor: default; color: var(--theme-text-dim);">No has encontrado notas.</div>';
    }
    
    // Botón de Combinar
    if (fragmentsFound > 1) {
        const combineBtn = document.createElement('button');
        combineBtn.textContent = 'Combinar Fragmentos';
        combineBtn.className = 'btn-action w-full mt-2';
        combineBtn.onclick = combineFragments;
        backpackNotesList.appendChild(combineBtn);
    }
}

// Lector de Notas
function showNote(noteId) {
    const note = NOTES_CONTENT[noteId];
    if (!note) {
        noteReaderTitle.textContent = "ERROR";
        noteReaderContent.textContent = "No se pudo cargar el contenido de la nota.";
        return;
    }
    
    let title = note.title;
    let content = note.content;
    
    if (noteId === 'fragmentos_combinacion') {
        content = `Has unido los fragmentos. El texto revela:\n\n"${getSafeCodeHint()}"`;
    }
    
    noteReaderTitle.textContent = `[ ${title} ]`;
    noteReaderContent.innerHTML = content.replace(/\n/g, '<br>'); 
    
    closeAllModals(); 
    noteReaderModal.classList.remove('hidden'); 
}

// Combinar Fragmentos
function combineFragments() {
    // Comprobar si ya están combinados
    if (hasItem('fragmentos_combinacion')) {
        logNotification("Ya has combinado los fragmentos.", 'info');
        closeAllModals();
        showNote('fragmentos_combinacion');
        return;
    }
    
    // Comprobar si tiene los 3
    if (hasItem('fragmento_a') && hasItem('fragmento_b') && hasItem('fragmento_c')) {
        removeItem('fragmento_a', 1);
        removeItem('fragmento_b', 1);
        removeItem('fragmento_c', 1);
        
        addItem('fragmentos_combinacion', 'Combinación Parcial', 'L', 1, false, true);
        logNotification("Has juntado todos los fragmentos. Forman una pista legible.", 'item');
        
        closeAllModals();
        showNote('fragmentos_combinacion'); // Mostrar la nota combinada
    } else {
        logNotification("Aún te faltan fragmentos para combinar.", 'info');
        closeAllModals();
    }
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
    else if (colorClass === 'bateria') color = '#00e0e0'; 
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
    
    const calmBtnHtml = `<button id="start-calm-btn" class="btn-action">Calmar</button>`;
    html += createStatBar('Ansiedad', stats.ansiedad, (stats.ansiedad >= 70 ? 'herido' : (stats.ansiedad >= 40 ? 'ansioso' : 'calm')), (stats.ansiedad > 50 ? calmBtnHtml : ''));
    
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
    
    if (gameState.flags.linterna_found) {
        html += createStatBar('Batería (Linterna)', stats.bateria, (stats.bateria <= 20 ? 'herido' : 'bateria'));
    }
    
    ruloStatsList.innerHTML = html;
}

function useItem(itemId, target) {
    if (!hasItem(itemId)) return;
    
    const item = gameState.inventory[itemId];
    let feedbackText = "";
    let consumed = true;
    
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
                startHealing(target); 
                feedbackText = (target === 'player' ? "Aplicas" : "Rulo aplica") + " el vendaje.";
            } else {
                feedbackText = (target === 'player' ? "No necesitas" : "Rulo no necesita") + " curarse ahora.";
                consumed = false; 
            }
            break;
        case 'linterna':
            if (target === 'rulo' && !gameState.flags.linterna_rulo) {
                gameState.flags.linterna_rulo = true;
                gameState.ruloStats.bateria = 100; 
                feedbackText = "Le das la linterna a Rulo. La inspecciona y la enciende.";
            } else if (target === 'rulo' && gameState.flags.linterna_rulo) {
                feedbackText = "Rulo ya tiene la linterna.";
            } else {
                feedbackText = "No puedes usarla tú. Rulo parece saber qué hacer con ella.";
            }
            consumed = false; 
            break;
        case 'bateria':
            if (target === 'rulo' && gameState.flags.linterna_found) {
                gameState.flags.linterna_rulo = true; 
                updateRuloStat('bateria', 100); 
                feedbackText = "Rulo cambia la batería de la linterna. Vuelve a funcionar.";
            } else {
                feedbackText = "No parece tener uso por ahora.";
                consumed = false;
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
    
    if (!backpackModal.classList.contains('hidden')) {
        renderBackpack();
    }
}

// --- EFECTOS DE JUEGO Y NOTIFICACIONES ---

function logNotification(text, type = 'info') {
    const el = document.createElement('div');
    el.className = 'notification-item';
    
    if (type === 'static') el.classList.add('notification-static');
    else if (type === 'sfx') el.classList.add('notification-sfx');
    else if (type === 'scare') el.classList.add('notification-scare');
    else if (type === 'item') el.classList.add('notification-item-found');
    else el.classList.add('notification-info'); 
    
    el.textContent = text;
    
    // BUGFIX: Añadir al principio y limitar
    notificationLog.prepend(el);
    if (notificationLog.children.length > NOTIFICATION_LIMIT) {
        notificationLog.removeChild(notificationLog.lastChild);
    }
}

const gameEffects = {
    playScare: ({ text, shake }) => {
        logNotification(text, 'scare'); 
        if (shake) {
            appContainer.classList.add('shake');
            setTimeout(() => appContainer.classList.remove('shake'), 300);
        }
        updatePlayerStat('ansiedad', 25);
    },
    playSfx: (text) => {
        logNotification(text, 'sfx'); 
    },
    playStatic: (text) => {
        logNotification(text, 'static'); 
    }
};

// --- LÓGICA DEL MONSTRUO Y REACCIÓN ---

function calculateMonsterProb() {
    if (gameState.flags.rulo_dead) {
        return 99; 
    }

    const noise = gameState.roomNoise[gameState.location] || 0;
    const anxiety = gameState.playerStats.ansiedad || 0;
    
    let diffMultiplier = 1.0;
    if (gameState.difficulty === 'easy') diffMultiplier = 0.6;
    if (gameState.difficulty === 'hard') diffMultiplier = 1.5;
    if (gameState.difficulty === 'nightmare') diffMultiplier = 2.2;

    let prob = (noise * 0.7) + (anxiety * 0.3);
    prob *= diffMultiplier;
    
    if (gameState.flags.rulo_joins) {
        prob *= 0.7; 
    }
    
    return Math.min(99, Math.max(0, Math.round(prob)));
}

function renderMonsterProb() {
    const prob = calculateMonsterProb();
    
    monsterProbHud.classList.add('hidden');

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
        
        startCalmMinigame();
    }
}

function checkMonsterSpawn() {
    if (gameState.monsterPresent || gameState.monsterApproaching) return;

    const displayProb = calculateMonsterProb();
    const finalProbPerSecond = (displayProb / 100) * 0.05; 
    
    if (Math.random() < finalProbPerSecond) {
        initiateMonsterApproach();
    }
}

function initiateMonsterApproach() {
    gameState.monsterApproaching = true;
    logNotification("...una sombra se alarga bajo la puerta...", 'sfx');
    const delay = 1000 + (Math.random() * 1000);
    setTimeout(spawnMonster, delay);
}

function spawnMonster() {
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
    
    let diffFactor = 1.0; // medium
    if (gameState.difficulty === 'easy') diffFactor = 1.25; 
    if (gameState.difficulty === 'hard') diffFactor = 0.75; 
    if (gameState.difficulty === 'nightmare') diffFactor = 0.5; 

    const currentRoomNoise = gameState.roomNoise[gameState.location] || 0;

    const sizeFactor = Math.max(0.4, Math.min(1.8, 0.6 + (currentRoomNoise / 200) - statePenalty)) * ruloBonus * diffFactor;
    const baseSize = 80;
    const size = Math.round(baseSize * sizeFactor);
    
    const normalizedFactor = (sizeFactor - 0.4) / (1.8 - 0.4);
    reactionWindowMs = (1000 + (normalizedFactor * 2000)) * ruloBonus;
    
    const narrativeRect = narrativeContainer.getBoundingClientRect();
    const rectWidth = narrativeRect.width || narrativeContainer.clientWidth;
    const rectHeight = narrativeRect.height || narrativeContainer.clientHeight;
    
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
}

// --- MINIJUEGO DE CALMA (Ansiedad) ---

function startCalmMinigame() {
    if (calmGameActive) return;
    
    if (gameState.playerStats.ansiedad <= 50) {
        logNotification("No te sientes lo suficientemente ansioso como para necesitar esto.", 'info');
        return;
    }
    
    calmGameActive = true;
    closeAllModals();
    
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
    calmGameInterval = setInterval(updateCalmMarker, 16); 
    calmGameTimeout = setTimeout(failCalmMinigame, 8000); 
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
    
    if (e.key === ' ') {
        e.preventDefault();
        checkCalmHit();
    }
    if (e.key === 'Enter') {
        skipTyping();
    }
}

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
    updatePlayerStat('ansiedad', -30); 
    
    if (gameState.ruloAlertActive) {
        logNotification("...el peligro parece pasar.", 'sfx');
        gameState.ruloAlertActive = false; 
    }
    
    stopCalmMinigame();
}

function failCalmMinigame() {
    logNotification("No logras concentrarte. Tu ansiedad aumenta.", 'scare');
    updatePlayerStat('ansiedad', 30); 
    
    if (gameState.playerStats.ansiedad >= 100 && gameState.flags.rulo_joins) {
        ruloLeaves("ansiedad");
    }
    
    stopCalmMinigame();
}

function stopCalmMinigame(isCancel = false) {
    if (!calmGameActive) return;
    calmGameActive = false;
    
    clearInterval(calmGameInterval);
    clearTimeout(calmGameTimeout);
    window.removeEventListener('keydown', handleCalmKey);
    
    calmMinigame.classList.add('hidden');
    
    if (isCancel) {
         logNotification("Decides no calmarte.", 'info');
    }
}


// --- MINIJUEGO DE RUIDO (Selección) ---

function showNoiseMinigameSelect() {
    if (isTyping || isGamePaused() || gameScreen.style.display === 'none') return;
    
    const currentNoise = gameState.roomNoise[gameState.location] || 0;
    if (currentNoise <= 15) {
        logNotification("El ruido no es lo suficientemente alto como para necesitar recalibración.", 'info');
        return;
    }
    
    const noiseColor = currentNoise >= 75 ? 'var(--theme-scare)' : (currentNoise >= 50 ? 'var(--theme-agitated)' : 'var(--theme-calm)');
    noiseSelectCurrentNoise.innerHTML = `Ruido actual: <span class="font-bold" style="color: ${noiseColor};">${Math.round(currentNoise)}</span>`;
    
    closeAllModals();
    noiseMinigameSelectModal.classList.remove('hidden');
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
    
    fuseGameActive = true;
    fuseGameSequence = [];
    closeAllModals(); 
    
    const currentNoise = gameState.roomNoise[gameState.location] || 0;
    const anxiety = gameState.playerStats.ansiedad || 0;
    
    const allColors = [
        { id: 'Rojo', class: 'fuse-red' }, 
        { id: 'Azul', class: 'fuse-blue' }, 
        { id: 'Verde', class: 'fuse-green' }, 
        { id: 'Amarillo', class: 'fuse-yellow' }, 
        { id: 'Blanco', class: 'fuse-white' }
    ];
    
    let numFuses = 3; 
    if (currentNoise > 30 || anxiety > 40) numFuses = 4; 
    if (currentNoise > 60 || anxiety > 70) numFuses = 5; 
    
    let puzzleColors = shuffleArray([...allColors]).slice(0, numFuses);
    let solution = shuffleArray([...puzzleColors]);
    let options = shuffleArray([...puzzleColors]);
    
    let positions = shuffleArray(Array.from({length: numFuses}, (_, i) => i + 1));
    let hint = "PISTA: ";
    hint += solution.map((colorObj, index) => `${colorObj.id} = ${positions[index]}`).join(', ');
    
    let solutionWithPositions = solution.map((colorObj, index) => ({
        id: colorObj.id,
        pos: positions[index]
    }));
    solutionWithPositions.sort((a, b) => a.pos - b.pos);
    const finalSolution = solutionWithPositions.map(item => item.id);

    let timeLimit = 30; // Fácil
    if (gameState.difficulty === 'medium') timeLimit = 25;
    if (gameState.difficulty === 'hard') timeLimit = 20;
    if (gameState.difficulty === 'nightmare') timeLimit = 15;
    if (numFuses === 4) timeLimit -= 5;
    if (numFuses === 5) timeLimit -= 10;
    
    fuseGameData = {
        solution: finalSolution,
        options: options,
        hint: hint,
        timeLimit: Math.max(10, timeLimit), 
        baseNoise: currentNoise
    };

    fuseHintBox.textContent = fuseGameData.hint;
    fuseTimer.textContent = fuseGameData.timeLimit.toFixed(1);
    
    fuseOptionsContainer.innerHTML = '';
    fuseGameData.options.forEach(colorObj => {
        const btn = document.createElement('button');
        btn.className = `btn-fuse ${colorObj.class}`;
        btn.textContent = colorObj.id;
        btn.onclick = () => selectFuse(colorObj.id, btn);
        fuseOptionsContainer.appendChild(btn);
    });
    
    renderFuseSequence();
    
    fuseMinigameModal.dataset.baseNoise = currentNoise;
    logNotification(`[MINIJUEGO] Ruido de sala (Antes): ${Math.round(currentNoise)}`, 'info');
    
    fuseMinigameModal.classList.remove('hidden');
    
    fuseGameTimer = setInterval(updateFuseTimer, 100);
}

function selectFuse(colorId, buttonEl) {
    if (!fuseGameActive || fuseGameSequence.length >= fuseGameData.solution.length) return;
    
    fuseGameSequence.push(colorId);
    buttonEl.classList.add('fuse-selected'); 
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
    $$('#fuse-options-container .btn-fuse').forEach(btn => {
        btn.classList.remove('fuse-selected');
        btn.disabled = false;
    });
}

function updateFuseTimer() {
    if (!fuseGameActive) return;
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

function stopFuseMinigame(isCancel = false) {
    if (!fuseGameActive) return;
    fuseGameActive = false;
    clearInterval(fuseGameTimer);
    fuseTimer.style.color = 'var(--theme-scare)'; 
    fuseMinigameModal.classList.add('hidden');
    clearFuseSequence();
    
    if(isCancel) {
        logNotification("Cancelaste la recalibración.", 'info');
    }
}

function successFuseMinigame() {
    let noiseReduction = 10 + (fuseGameData.baseNoise * 0.3); 
    changeRoomNoise(gameState.location, -noiseReduction);
    logNotification(`Éxito. Ruido reducido en ${Math.round(noiseReduction)}. (Después: ${Math.round(gameState.roomNoise[gameState.location])})`, 'sfx');
    stopFuseMinigame();
}

function failFuseMinigame(reason) {
    changeRoomNoise(gameState.location, 10); 
    logNotification(`${reason} Sobrecarga. El ruido aumenta. (Después: ${Math.round(gameState.roomNoise[gameState.location])})`, 'scare');
    stopFuseMinigame();
}

// --- MINIJUEGO CADENA DE RESONANCIA ---

function startResonanceMinigame() {
    if (resonanceGameActive) return;
    
    resonanceGameActive = true;
    closeAllModals();
    
    let timeLimit = 90; // Fácil
    if (gameState.difficulty === 'medium') timeLimit = 70;
    if (gameState.difficulty === 'hard') timeLimit = 50;
    if (gameState.difficulty === 'nightmare') timeLimit = 40;
    
    resonanceGameData.timeLimit = timeLimit;
    
    resonanceTimer.textContent = timeLimit.toFixed(1);
    resonanceHintBox.textContent = "SECUENCIA: (Lógica del puzzle pendiente)";
    
    // Lógica de inicialización del Canvas (Parte 2)
    const ctx = resonanceCanvas.getContext('2d');
    ctx.clearRect(0, 0, resonanceCanvas.width, resonanceCanvas.height);
    ctx.fillStyle = 'var(--theme-text-dim)';
    ctx.font = '16px IBM Plex Mono';
    ctx.textAlign = 'center';
    ctx.fillText('...Lógica del minijuego de nudos pendiente...', resonanceCanvas.width / 2, resonanceCanvas.height / 2);
    
    resonanceMinigameModal.classList.remove('hidden');
    resonanceGameTimer = setInterval(updateResonanceTimer, 100);
}

function updateResonanceTimer() {
    if (!resonanceGameActive) return;
    resonanceGameData.timeLimit -= 0.1;
    resonanceTimer.textContent = resonanceGameData.timeLimit.toFixed(1);
    
    if (resonanceGameData.timeLimit <= 0) {
        resonanceTimer.textContent = '0.0';
        failResonanceMinigame("¡Tiempo agotado!");
    }
}

function stopResonanceMinigame(isCancel = false) {
    if (!resonanceGameActive) return;
    resonanceGameActive = false;
    clearInterval(resonanceGameTimer);
    resonanceMinigameModal.classList.add('hidden');
    
    if (isCancel) {
        logNotification("Abortaste la recalibración.", 'info');
    }
}

function successResonanceMinigame() {
    let baseNoise = gameState.roomNoise[gameState.location] || 0;
    changeRoomNoise(gameState.location, -baseNoise); // Reducción a 0 (o casi)
    logNotification(`¡Resonancia estabilizada! El ruido baja drásticamente. (Después: ${Math.round(gameState.roomNoise[gameState.location])})`, 'sfx');
    stopResonanceMinigame();
}

function failResonanceMinigame(reason) {
    changeRoomNoise(gameState.location, 15); // Penalización
    logNotification(`${reason} ¡La red colapsó! El ruido aumenta.`, 'scare');
    stopResonanceMinigame();
}

// --- LÓGICA DE CAJA FUERTE (KEYPAD) ---

function showSafeKeypad() {
    closeAllModals();
    // Resetear dígitos
    keypadDigits.forEach(digitEl => {
        digitEl.dataset.value = "0";
        digitEl.textContent = "0";
    });
    safeKeypadModal.classList.remove('hidden');
}

function updateKeypadDigit(digitEl) {
    let currentValue = parseInt(digitEl.dataset.value, 10);
    currentValue = (currentValue + 1) % 10; // Ciclo 0-9
    digitEl.dataset.value = currentValue;
    digitEl.textContent = currentValue;
}

function checkSafeCode() {
    let enteredCode = "";
    keypadDigits.forEach(digitEl => {
        enteredCode += digitEl.dataset.value;
    });
    
    const correctCode = gameState.flags.safe_code || "4815"; // Usar código de flag
    
    if (enteredCode === correctCode) {
        logNotification("Clic. La puerta de la caja fuerte se abre.", 'sfx');
        closeAllModals();
        showNode('almacen_safe_success'); // Ir al nodo de éxito
    } else {
        logNotification("Código incorrecto. El pestillo no se mueve.", 'scare');
        // Opcional: ¿aumentar ruido por fallo?
        // changeRoomNoise(null, 5);
    }
}

// --- ACCIONES Y CONDICIONES DEL JUEGO ---

function checkHasItem(id) { return hasItem(id); }
function checkFlagFalse(flag) { return !gameState.flags[flag]; }
function checkFlagTrue(flag) { return gameState.flags[flag]; }
function checkDifficulty(diff) { return gameState.difficulty === diff; }
function checkRadioForzable() { return hasItem('destornillador') && gameState.flags.radio_forced_count < 2; }
function checkCanAskRuloToJoin() {
    // BUGFIX Ansiedad: Añadir check
    if (gameState.playerStats.ansiedad > 65) return false;
    return gameState.flags.rulo_awake && 
           !gameState.flags.rulo_joins && 
           !gameState.flags.rulo_rejected_join && 
           !gameState.flags.rulo_dead;
}
function checkCanGiveBarrita() {
    // BUGFIX Ansiedad: Añadir check
    if (gameState.playerStats.ansiedad > 65) return false;
    return hasItem('barrita') && 
           gameState.flags.rulo_awake && 
           !gameState.flags.rulo_joins && 
           !gameState.flags.rulo_dead;
}
function checkPasilloRouteAvailable() {
    return !gameState.flags.pasillo_este_route_chosen;
}
function checkCanTalkRuloSala() {
    // BUGFIX Ansiedad: Añadir check
    if (gameState.playerStats.ansiedad > 65) return false;
    return gameState.flags.rulo_awake && !gameState.flags.rulo_dead && !gameState.flags.rulo_joins;
}


function rollD100() { return Math.floor(Math.random() * 100) + 1; }
function hasItem(id) { return gameState.inventory[id] && gameState.inventory[id].qty > 0; }

function addItem(id, name, rarity, qty = 1, consumable = false, isNote = false) {
    if (id === 'mochila') { 
        if (gameState.inventory[id]) return; 
        gameState.inventory[id] = { id, name, rarity, qty: 1, consumable: false, isNote: false };
    }
    else if (gameState.inventory[id]) {
        gameState.inventory[id].qty += qty;
    } else {
        gameState.inventory[id] = { id, name, rarity, qty, consumable, isNote };
    }
    logNotification(`¡Objeto hallado! ${name} x${qty}`, 'item');
    
    // Comprobar fragmentos
    if (id === 'fragmento_a' || id === 'fragmento_b' || id === 'fragmento_c') {
        gameState.flags.fragmentos_safe_count++;
    }
}

function removeItem(id, qty = 1) {
     if (hasItem(id)) {
        gameState.inventory[id].qty -= qty;
        if (gameState.inventory[id].qty <= 0) {
            delete gameState.inventory[id];
        }
     }
}

function checkSafeFragments() {
    // Esta función es llamada por el botón "Combinar"
    if (hasItem('fragmentos_combinacion')) {
        logNotification("Ya has combinado los fragmentos.", 'info');
        closeAllModals();
        showNote('fragmentos_combinacion');
        return;
    }
    
    if (hasItem('fragmento_a') && hasItem('fragmento_b') && hasItem('fragmento_c')) {
        removeItem('fragmento_a', 1);
        removeItem('fragmento_b', 1);
        removeItem('fragmento_c', 1);
        
        addItem('fragmentos_combinacion', 'Combinación Parcial', 'L', 1, false, true);
        logNotification("Has juntado todos los fragmentos. Forman una pista legible.", 'item');
        
        closeAllModals();
        showNote('fragmentos_combinacion');
    } else {
        logNotification("Aún te faltan fragmentos para combinar.", 'info');
        closeAllModals();
    }
}

function changeRoomNoise(roomId, amount, isDecay = false) {
    if (!roomId) roomId = gameState.location;
    if (!gameState.roomNoise.hasOwnProperty(roomId)) return;
    
    let currentNoise = gameState.roomNoise[roomId] || 0;
    let newNoise = Math.max(0, Math.min(100, currentNoise + amount));
    gameState.roomNoise[roomId] = newNoise;
    
    // Evitar spam de notificaciones
    if (amount > 0 && !isDecay && !fuseGameActive && !resonanceGameActive) {
        updatePlayerStat('ansiedad', amount / 5);
        logNotification(`Ruido aumentado: +${Math.round(amount)}`, 'info');
    }
    
    if (roomId === gameState.location) {
        renderNoiseBar();
    }
}

function returnToPreviousLocation() {
    showNode(gameState.location); 
}

// --- Acciones de Nodos ---

function onEnterPasilloIntro() {
    if (gameState.flags.backpack_enabled) {
        showNode('pasillo_este_hub');
        return false; 
    }
    return true; 
}

function enableBackpack() {
    addItem('mochila', 'Mochila', 'C', 1, false, false);
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
        updateRuloStat('vida', -5); 
    }
    typeText(text, true, () => renderOptions(GAME_CONTENT.sala_vigilancia.options, 'sala_vigilancia'));
}

function hablarRuloSala() {
    // BUGFIX Ansiedad:
    if (gameState.playerStats.ansiedad > 65) {
        typeText("Rulo te ve, con los ojos muy abiertos por el pánico. Niega con la cabeza, sin dejarte hablar.", true, () => renderOptions(GAME_CONTENT.sala_vigilancia.options, 'sala_vigilancia'));
        return;
    }

    let text = "";
    if (gameState.flags.rulo_awake_calm && !gameState.flags.hab_secreta_unlocked && Math.random() < 0.40) {
        text = "Rulo mira fijamente un panel de mantenimiento en la pared.\n'Hay... una corriente de aire frío. Creo que hay una rendija detrás de ese panel.'";
        unlockSecretRoom();
    } else {
        text = "Te acercas a Rulo.\n'Silencio... nos oirá.'\nNo parece querer hablar más.";
    }
    
    typeText(text, true, () => renderOptions(GAME_CONTENT.sala_vigilancia.options, 'sala_vigilancia'));
}

function handleTalkRulo() {
    if (isTyping || isGamePaused()) return;
    
    // BUGFIX Ansiedad:
    if (gameState.playerStats.ansiedad > 65) {
         typeText("RULO: '¡Aléjate! ¡Tu respiración... me pones nervioso!'", false, () => renderOptions(GAME_CONTENT[gameState.location].options, gameState.location));
        return;
    }
    
    const stats = gameState.ruloStats;
    let text = "";
    
    if (stats.vida <= 40) text = "RULO: 'Estoy... herido. Necesito un vendaje.'";
    else if (stats.hambre <= 20) text = "RULO: 'No puedo... seguir. Hambre.'";
    else if (stats.agua <= 20) text = "RULO: 'Agua... necesito agua.'";
    else if (gameState.flags.linterna_rulo && stats.bateria <= 10) text = "RULO: 'La luz... se apaga. Necesito otra batería.'";
    else {
        const roll = Math.random();
        // TODO: Pista de Hab. Secreta
        if (roll < 0.3) {
            text = "RULO: '¿Oíste eso?'\nTe sientes un poco más ansioso.";
            updatePlayerStat('ansiedad', 2);
        } else if (roll < 0.6) {
            text = "RULO: 'Todo saldrá bien. Solo... mantén la calma.'\nSus palabras te tranquilizan un poco.";
            updatePlayerStat('ansiedad', -3); 
        } else {
            text = "RULO: 'Sigamos moviéndonos.'";
        }
    }
    
    typeText(text, false, () => renderOptions(GAME_CONTENT[gameState.location].options, gameState.location));
}


function sintonizarRadio() {
    const roll = rollD100();
    let text = "Giras el dial. La estática es ensordecedora.\n";
    
    if (roll > 95) {
        text = "Voz clara: '...no confíes...'. Un compartimento se abre.";
        addItem('cinta_magnetica', 'Cinta Magnética', 'R', 1, false, true); 
        gameState.flags.radio_pista = true;
    } else if (roll > 60) {
        text += "Distingues un patrón: tres tonos... pausa... uno... pausa... dos. (3-1-2)";
        gameState.flags.radio_pista = true;
    } else {
        text += "¡CLACK! La radio suelta un chispazo y sube el volumen al máximo antes de morir.";
        changeRoomNoise(null, 30);
        gameEffects.playScare("ESTÁTICA ENSORDECEDORA", true);
    }
    
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
            addItem('nota_rasgada', 'Nota Rasgada', 'R', 1, false, true);
        } else {
            text += "Polvo, óxido y cables. Nada útil.";
        }
    }
    
    if (roomId === 'almacen') {
        if (roll > (85 - findChance) && !gameState.flags.linterna_found) {
            text = "En una caja metálica, encuentras una [Linterna] táctica.";
            addItem('linterna', 'Linterna', 'R', 1, false);
            gameState.flags.linterna_found = true;
        } else if (roll > (60 - findChance)) {
            text = "Encuentras [Cinta Adhesiva] (duct tape).";
            addItem('duct_tape', 'Cinta Adhesiva', 'C', 1, false);
        } else if (roll > (40 - findChance) && !hasItem('fragmento_b')) {
            text = "Detrás de un palé, ves un papel. Es el [Fragmento B].";
            addItem('fragmento_b', 'Fragmento B', 'L', 1, false, true);
        } else {
            text += "Cajas vacías y herramientas rotas.";
        }
    }
    
    if (roomId === 'oficina_seguridad') {
         if (roll > (50 - findChance) && !hasItem('fragmento_c')) {
            text = "En un archivador, encuentras el [Fragmento C].";
            addItem('fragmento_c', 'Fragmento C', 'L', 1, false, true);
        } else {
             text += "Papeles inútiles.";
         }
    }
    
    if (roomId === 'sala_vigilancia_secreta') {
        if (roll > (60 - findChance)) {
            text = "En la estantería hay [Vendajes Especiales].";
            addItem('vendaje', 'Vendaje', 'C', 2, true); 
        } else if (roll > (30 - findChance) && !hasItem('fragmento_a')) {
            text = "Encuentras una nota cifrada: [Fragmento A].";
            addItem('fragmento_a', 'Fragmento A', 'L', 1, false, true);
        } else {
            text += "Polvo y carpetas vacías.";
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

function unlockSecretRoom() {
    if (gameState.flags.hab_secreta_unlocked) return;
    
    gameState.flags.hab_secreta_unlocked = true;
    if (!gameState.unlockedLocations.includes('sala_vigilancia_secreta')) {
        gameState.unlockedLocations.push('sala_vigilancia_secreta');
    }
    logNotification("Has descubierto la [Habitación Secreta].", 'item');
    renderLocations();
}

function hablarConRulo() {
    // BUGFIX Ansiedad:
    if (gameState.playerStats.ansiedad > 65) {
        typeText("Intentas hablarle, pero tu respiración agitada lo asusta.\n'¡No te me acerques!'", true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
        return;
    }

    gameState.flags.rulo_talked = true;
    let text = "Te acercas a Rulo. Sigue temblando.\n'¿Vas a venir conmigo?'\n";
    
    if (gameState.flags.rulo_rejected_join) {
        text = "Rulo niega con la cabeza. 'Te dije que no. Déjame en paz.'";
        typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
        return;
    }
    
    let probAcompañar = 0.3;
    if (gameState.flags.rulo_awake_calm) probAcompañar = 0.6;
    if (gameState.ruloStats.vida < 80) probAcompañar = 0.1;
    
    if (Math.random() < probAcompañar) {
        text = "Rulo mira la puerta del pasillo y luego a ti. Asiente lentamente.\n'Ese pasillo... me da mala espina. Pero peor es quedarse aquí.'";
        gameState.flags.rulo_joins = true;
    } else {
        text += "Rulo niega con la cabeza. 'No. Es demasiado peligroso. La voz... nos encontrará. Me quedo aquí.'";
        gameState.flags.rulo_joins = false;
        gameState.flags.rulo_rejected_join = true; 
    }
    
    renderRuloState();
    renderMonsterProb();
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

function darBarritaRulo() {
    if (!hasItem('barrita')) return;
    
    // BUGFIX Ansiedad:
    if (gameState.playerStats.ansiedad > 65) {
        typeText("Sacas la barrita, pero Rulo retrocede.\n'¡No quiero nada de ti!'", true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
        return;
    }
    
    // BUGFIX: No dar si ya te rechazó
    if (gameState.flags.rulo_rejected_join) {
        typeText("Rulo rechaza la barrita.\n'No. No quiero tu comida. Déjame.'", true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
        return;
    }
    
    removeItem('barrita', 1);
    updateRuloStat('hambre', 40); 
    logNotification("Le das una barrita a Rulo. La acepta y la come en silencio.", 'info');
    
    let text = "Rulo termina la barrita. Te mira, más calmado.\n'Gracias... Quizá... quizá sí debería ir contigo.'\n";
    
    let probAcompañar = 0.35; 
    if (gameState.flags.rulo_awake_calm) probAcompañar += 0.2; 
    
    if (Math.random() < probAcompañar) {
        text += "'Está bien. Iré. Pero vámonos ya.'";
        gameState.flags.rulo_joins = true;
        gameState.flags.rulo_rejected_join = false; 
    } else {
        text += "'...Pero sigo sin estar seguro. Déjame pensarlo.'";
        gameState.flags.rulo_rejected_join = false; 
    }

    renderRuloState();
    renderMonsterProb();
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}


function explorarPasillo() {
    // BUGFIX: Esta acción NO activa 'pasillo_este_route_chosen'
    
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
    gameState.flags.pasillo_este_route_chosen = true; 
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
    gameState.flags.pasillo_este_route_chosen = true; 
    let text = "Corres por el pasillo. Tus pisadas retumban.\n";
    changeRoomNoise(null, 35);
    updatePlayerStat('ansiedad', 10);
    updatePlayerStat('agua', -5);
    
    const roll = rollD100();
    
    if (roll <= 70) { 
        text += "¡Tropiezas con un tubo de metal! El estruendo es terrible. Caes de mala manera.";
        let lifeLoss = gameState.playerStats.vida * 0.80; 
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

const NOTES_CONTENT = {
    'nota_rasgada': {
        title: "Nota Rasgada",
        content: "Fragmento de una página de diario:\n\n'...el Eco es una sombra. No puedes matarlo, solo evitarlo. Se alimenta del ruido, pero teme a...\n\nEl resto está quemado."
    },
    'cinta_magnetica': {
        title: "Cinta Magnética",
        content: "Una grabación de audio corrupta. Solo se oyen fragmentos:\n\n'...(estática)... no confíes en las voces. El Umbral imita. Repito, imita. La transmisión... (estática)... experimento en el almacén... linternas...'"
    },
    'fragmento_a': {
        title: "Fragmento A (Cifrado)",
        content: "Un documento técnico. La mayor parte es ilegible, pero unos números están rodeados en rojo:\n\n...la frecuencia es la clave...\n\n... ( 4 ) ...\n... ( 8 ) ..."
        // PARTE 2: El número '4' y '8' se reemplazarán por `gameState.flags.safe_code[0]`
    },
     'fragmento_b': {
        title: "Fragmento B",
        content: "Una nota de mantenimiento:\n\n'Dejaron la caja abierta otra vez. El código es demasiado simple. Es el número del proyector antiguo.'\n\n... ( 1 ) ..."
        // PARTE 2: El número '1' se reemplazará
    },
     'fragmento_c': {
        title: "Fragmento C",
        content: "Un post-it:\n\n'Recordatorio: El último dígito es cuántos fallaron.'\n\n... ( 5 ) ..."
         // PARTE 2: El número '5' se reemplazará
    },
    'fragmentos_combinacion': {
        title: "Combinación Parcial",
        content: "Has unido los fragmentos. Parecen ser los 4 dígitos de un código, pero están desordenados.\n\n[ 4, 8, 1, 5 ]"
        // PARTE 2: Esto mostrará los números aleatorios
    },
    'nota_eco_1': {
        title: "Hipótesis del Eco",
        content: "...la entidad (ECO) parece ser capaz de 'imitar' patrones de voz digitalizados. Los experimentos en el sótano con el EMISOR-A demuestran..."
    },
    'nota_eco_2': {
        title: "Experimentos Almacén",
        content: "Las linternas modificadas (ver proto. L-MOD) parecen reaccionar a las frecuencias del ECO. Posible uso como 'revelador' de puntos débiles en el Umbral..."
    },
    'nota_emisor': {
        title: "Pruebas Emisor",
        content: "El EMISOR-A está calibrado. Si logramos activar la máquina del sótano, podríamos crear una 'burbuja' de silencio. Pero necesitamos el Dial de la sala de vig..."
    }
};

function getSafeCodeHint() {
    // PARTE 2: Esta función devolverá los números aleatorios
    return `Los números están desordenados:\n\n[ 4, 8, 1, 5 ]\n\n(El código es ${gameState.flags.safe_code})`;
}

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
            { text: "Hablarle con calma a Rulo", action: { func: "hablarRuloSala" }, condition: { func: "checkCanTalkRuloSala" } },
            { text: "Examinar panel de mantenimiento", target: "panel_secreto_examine", condition: { func: "checkFlagFalse", params: "hab_secreta_unlocked" } },
            { text: "[IR] Entrar en la rendija secreta", target: "sala_vigilancia_secreta", condition: { func: "checkFlagTrue", params: "hab_secreta_unlocked" } }
        ]
    },
    'revisar_radio': {
        isInteraction: true,
        text: "La radio emite estática. La luz del canal 19 parpadea.",
        options: [
            { text: "Intentar sintonizar manualmente", action: { func: "sintonizarRadio" } },
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
    'panel_secreto_examine': {
        isInteraction: true,
        text: "Es un panel de mantenimiento estándar. Parece un poco suelto.",
        onEnter: () => {
            // PARTE 2: Añadir check de cámara reparada
            if (hasItem('bateria') && hasItem('destornillador') && gameState.flags.rulo_awake && !gameState.flags.hab_secreta_unlocked) {
                 if (Math.random() < 0.15) {
                    unlockSecretRoom();
                    typeText("Usas el destornillador y la batería para trastear con los cables. Rulo te detiene.\n'Espera. Hay una rendija ahí.'", true, () => {
                         renderOptions(GAME_CONTENT.sala_vigilancia.options, 'sala_vigilancia');
                    });
                    return false; 
                 }
            }
        },
        options: [
            { text: "Volver", action: { func: "returnToPreviousLocation" } }
        ]
    },
    'parte1_fin_exito': {
        isInteraction: true,
        text: "La puerta al pasillo chisporrotea y se abre.\nUn golpe seco viene del sótano.",
        onEnter: { func: "gameEffects.playScare", params: { text: "SOMBRA EN EL SÓTANO", shake: true } },
        options: [
            { text: "[Entrar al Pasillo Este]", target: "pasillo_este_intro" },
        ]
    },
    
    'sala_vigilancia_secreta': {
        isLocationHub: true,
        text: "Entras por la rendija a una pequeña sala de archivos oculta. Hay estanterías y un panel inservible.",
        options: [
             { 
                text: "Revisar estanterías", 
                action: { func: "buscarEnSala", params: "sala_vigilancia_secreta" }, 
                countsSearch: "sala_vigilancia_secreta"
            },
            { text: "Examinar documentos", target: "sala_secreta_documentos" },
            { text: "Examinar panel inservible", target: "sala_secreta_panel" },
            // PARTE 2: Añadir puzzle de placas y atajo
            { text: "Volver a la Sala de Vigilancia", target: "sala_vigilancia" }
        ]
    },
    'sala_secreta_documentos': {
        isInteraction: true,
        text: "Son notas sobre el 'Eco' y el 'Umbral'. Parece que estudiaban la capacidad del Eco para imitar voces. Encuentras varias notas legibles.",
        onEnter: () => {
             addItem('nota_eco_1', 'Nota: Hipótesis del Eco', 'R', 1, false, true);
             addItem('nota_eco_2', 'Nota: Experimentos Almacén', 'R', 1, false, true);
        },
        options: [
             { text: "Volver", target: "sala_vigilancia_secreta" }
        ]
    },
     'sala_secreta_panel': {
        isInteraction: true,
        text: "El panel está muerto, pero tiene marcas de un dial. Parece una pieza de algo más grande.",
        onEnter: () => {
             addItem('pieza_dial', 'Pieza de Dial Rota', 'L', 1, false);
        },
        options: [
             { text: "Volver", target: "sala_vigilancia_secreta" }
        ]
    },
    
    'pasillo_este_intro': {
        isInteraction: true,
        isCheckpoint: true,
        text: "Abres la puerta al pasillo Este. La luz de emergencia titila en rojo. A la derecha, apoyada contra una columna, hay una mochila vieja.",
        onEnter: { func: "onEnterPasilloIntro" }, 
        options: [
            { text: "Abrir la mochila", target: "abrir_mochila" }
        ]
    },
    'abrir_mochila': {
        isInteraction: true,
        text: "Abres la mochila. Está vacía, pero limpia. Transfieres tus cosas a ella.",
        onEnter: { func: "enableBackpack" }, 
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
            { text: "Avanzar con cuidado (Ruta Cautelosa)", action: { func: "moverSigilo" }, condition: { func: "checkPasilloRouteAvailable" } },
            { text: "Correr al fondo (Ruta Rápida)", action: { func: "moverRapido" }, condition: { func: "checkPasilloRouteAvailable" } },
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
            { 
                text: "Buscar suministros", 
                action: { func: "buscarEnSala", params: "almacen" }, 
                countsSearch: "almacen"
            },
            { text: "Examinar caja fuerte", target: "almacen_safe", condition: { func: "checkFlagFalse", params: "safe_almacen_open"} },
            { text: "Volver al Pasillo Este", target: "pasillo_este_hub" }
        ]
    },
    'almacen_safe': {
        isInteraction: true,
        text: "Una caja fuerte de 4 dígitos. Está cerrada.",
        options: [
            { text: "Introducir código", action: { func: "showSafeKeypad" }, condition: { func: "checkHasItem", params: "fragmentos_combinacion" } },
            { text: "Forzar cerradura", target: "almacen_safe_fail" },
            { text: "Volver", target: "almacen" }
        ]
    },
    'almacen_safe_success': {
        isInteraction: true,
        text: "El código funciona. La puerta de la caja se abre con un clic.\n\nDentro encuentras una pieza de hardware etiquetada [EMISOR-A] y varios documentos.",
        onEnter: () => {
            gameState.flags.safe_almacen_open = true;
            addItem('emisor_a', 'Emisor-A', 'L', 1, false);
            addItem('nota_emisor', 'Nota: Pruebas Emisor', 'R', 1, false, true);
        },
        options: [
             { text: "Volver", target: "almacen" }
        ]
    },
     'almacen_safe_fail': {
        isInteraction: true,
        text: "Intentas forzar la cerradura. El metal se dobla, pero no cede. ¡Te cortas la mano!\n\n(Diálogo Rulo 1): '¡Imbécil! ¿Quieres que nos maten?'\n(Diálogo Rulo 2): '...déjalo. No vale la pena.'",
        onEnter: () => {
            changeRoomNoise('almacen', 40);
            updatePlayerStat('vida', -15); // Daño por forzar
            gameEffects.playScare("RUIDO METÁLICO", true);
        },
        options: [
             { text: "Volver", target: "almacen" }
        ]
    },
    
    'oficina_seguridad': {
        isLocationHub: true,
        isCheckpoint: true,
        text: "Entras a la oficina de seguridad. Un escritorio volcado, notas en el suelo. Hay una llave colgando de un tablero.",
        options: [
            { 
                text: "Buscar en archivadores", 
                action: { func: "buscarEnSala", params: "oficina_seguridad" }, 
                countsSearch: "oficina_seguridad"
            },
            // PARTE 2: { text: "Usar linterna en rincón", action: {..}, condition: {..} }
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
    $('#close-note-reader-btn').addEventListener('click', closeAllModals); 
    $('#reaction-btn').addEventListener('click', clickReactionBtn);
    $('#talk-rulo-btn').addEventListener('click', handleTalkRulo); 
    
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
    $('#calm-cancel-btn').addEventListener('click', () => stopCalmMinigame(true)); 
    
    // Listeners Minijuego Ruido
    $('#noise-select-fuse-btn').addEventListener('click', startFuseMinigame);
    $('#noise-select-resonance-btn').addEventListener('click', startResonanceMinigame);
    $('#noise-select-cancel-btn').addEventListener('click', closeAllModals);

    // Listeners Minijuego Fusibles
    $('#fuse-confirm-btn').addEventListener('click', confirmFuseSequence);
    $('#fuse-clear-btn').addEventListener('click', clearFuseSequence);
    $('#fuse-cancel-btn').addEventListener('click', () => stopFuseMinigame(true)); // BOTÓN CANCELAR
    
    // Listeners Minijuego Resonancia
    $('#resonance-cancel-btn').addEventListener('click', () => stopResonanceMinigame(true)); 
    
    // Listeners Keypad Caja Fuerte
    keypadDigits.forEach(digitEl => {
        digitEl.addEventListener('click', () => updateKeypadDigit(digitEl));
    });
    $('#safe-keypad-confirm').addEventListener('click', checkSafeCode);
    $('#safe-keypad-cancel').addEventListener('click', closeAllModals);

    // Listener de Teclado Global
    window.addEventListener('keydown', (e) => {
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
            if (fuseGameActive) { stopFuseMinigame(true); return; }
            if (resonanceGameActive) { stopResonanceMinigame(true); return; } 
            
            if (!backpackModal.classList.contains('hidden') || 
                !playerStatsModal.classList.contains('hidden') || 
                !ruloStatsModal.classList.contains('hidden') ||
                !confirmModal.classList.contains('hidden') ||
                !noteReaderModal.classList.contains('hidden') || 
                !noiseMinigameSelectModal.classList.contains('hidden') ||
                !safeKeypadModal.classList.contains('hidden')
                ) {
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
    
    // Clic en la barra de ruido
    $('#noise-bar-container').addEventListener('click', () => {
        if (isTyping || isGamePaused() || gameScreen.style.display === 'none') return;
        showNoiseMinigameSelect(); 
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
