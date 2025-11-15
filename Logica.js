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
const difficultySelectScreen = $('#difficulty-select-screen'); // NUEVO
const gameScreen = $('#game-screen');
const deviceSelectOverlay = $('#device-select-overlay');

// Elementos del juego
const narrativeLog = $('#narrative-log');
const notificationLog = $('#notification-log'); // NUEVO
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

// Modales
const playerStatsModal = $('#player-stats-modal');
const playerStatsList = $('#player-stats-list');
const ruloStatsModal = $('#rulo-stats-modal');
const ruloStatsList = $('#rulo-stats-list');
const confirmModal = $('#confirm-modal'); // NUEVO
const calmMinigame = $('#calm-minigame'); // NUEVO

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

// Parámetros del Juego
const NOISE_DECAY_PER_SECOND = 1;
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

// Definición de temas de color
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

// --- GESTIÓN DE ESTADOS (Porcentajes) ---

function updatePlayerStat(stat, amount) {
    if (!gameState.playerStats || gameState.playerStats[stat] === undefined) return;
    
    let currentValue = gameState.playerStats[stat];
    let newValue = currentValue + amount;
    
    if (stat === 'hambre' || stat === 'agua') {
        newValue = Math.max(0, Math.min(100, newValue));
    }
    else if (stat === 'ansiedad') {
        newValue = Math.max(0, Math.min(100, newValue));
    }
    else if (stat === 'vida') {
        newValue = Math.max(0, Math.min(100, newValue));
    }
    
    gameState.playerStats[stat] = newValue;
    renderAllUI();
}

function updateRuloHP(amount) {
    let newValue = gameState.ruloHP + amount;
    gameState.ruloHP = Math.max(0, Math.min(100, newValue));
    renderAllUI();
}

function getPlayerStateSummary() {
    const stats = gameState.playerStats;
    if (!stats) return "CALMADO";
    
    if (stats.vida <= 40) return "HERIDO";
    if (stats.vida <= 70) return "DAÑADO";
    if (stats.ansiedad >= 70) return "AGITADO";
    if (stats.ansiedad >= 40) return "ANSIOSO";
    if (stats.hambre >= 60 || stats.agua >= 60) return "FATIGADO";
    
    return "CALMADO";
}

function getPlayerStateClass() {
    const stats = gameState.playerStats;
    if (!stats) return "life-ok";
    
    if (stats.vida <= 40) return "life-danger"; // Rojo
    if (stats.vida <= 70) return "life-low"; // Naranja
    if (stats.ansiedad >= 70) return "life-danger"; // Rojo
    if (stats.ansiedad >= 40) return "life-anxious"; // Magenta
    if (stats.hambre >= 60 || stats.agua >= 60) return "life-low"; // Naranja
    
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
            if (!gameState.playerStats) gameState.playerStats = { vida: 100, ansiedad: 0, hambre: 0, agua: 0 };
            if (gameState.ruloHP === undefined) gameState.ruloHP = 100;
            if (!gameState.roomNoise) {
                const oldNoise = gameState.noise || 0;
                gameState.roomNoise = { 'sala_vigilancia': oldNoise, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0, 'sotano': 0 };
                delete gameState.noise;
            }
            if (!gameState.roomCounters) gameState.roomCounters = { 'sala_vigilancia': 0, 'pasillo_este_hub': 0, 'almacen': 0, 'oficina_seguridad': 0 };
            if (!gameState.location || gameState.location === 'start') gameState.location = 'sala_vigilancia';
            if (!gameState.previousLocation) gameState.previousLocation = 'sala_vigilancia';
            if (!gameState.difficulty) gameState.difficulty = 'medium'; // NUEVO: Añade dificultad por defecto
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

// MODIFICADO: Corregido bug que reiniciaba el juego
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

// NUEVO: Reseteo completo de datos
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
        playerStats: { vida: 100, ansiedad: 0, hambre: 0, agua: 0 },
        ruloHP: 100,
        flags: {
            rulo_awake: false, rulo_awake_calm: false, radio_pista: false,
            panel_abierto: false, rulo_talked: false, rulo_joins: false,
            backpack_enabled: false
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
    difficultySelectScreen.style.display = 'none'; // NUEVO
    gameScreen.style.display = 'none';
    deviceSelectOverlay.style.display = 'none';
    
    const gameMenuBtn = $('#game-back-to-menu-btn');
    
    if (screenId === 'main') mainMenu.style.display = 'flex';
    if (screenId === 'settings') settingsScreen.style.display = 'flex';
    if (screenId === 'difficulty_select') difficultySelectScreen.style.display = 'flex'; // NUEVO
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

// MODIFICADO: Maneja el flujo de "Continuar" vs "Nuevo Juego" (con dificultad)
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
        // Borra el estado antiguo (si lo hay) y muestra la selección de dificultad
        resetGame();
        showScreen('difficulty_select');
    }
}

// NUEVO: Inicia el juego después de elegir dificultad
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

function resumeGame() {
    // Esta función ya no es necesaria con el nuevo flujo del monstruo
    // showNode(gameState.location);
    startGameLoop();
}

// --- BUCLE DE JUEGO (RUIDO, APARICIÓN) ---

function startGameLoop() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(() => {
        // MODIFICADO: No pausar si el monstruo se acerca, solo si ataca
        if (gameState.monsterPresent || !gameState.playerStats) {
            return;
        }
        
        // Decaimiento de Ruido
        const currentRoomNoise = gameState.roomNoise[gameState.location] || 0;
        if (currentRoomNoise > 0) {
            changeRoomNoise(gameState.location, -NOISE_DECAY_PER_SECOND, true);
        }
        
        // Aumento de Hambre/Agua
        updatePlayerStat('hambre', 0.05);
        updatePlayerStat('agua', 0.08);
        
        // Cooldown de Rulo
        if (gameState.ruloAlertCooldown > 0) {
            gameState.ruloAlertCooldown--;
        }
        
        checkRuloAlert();
        
        // Solo chequear aparición si el monstruo no se está acercando
        if (!gameState.monsterApproaching) {
            checkMonsterSpawn();
        }
        
        renderNoiseBar();
        renderPlayerState();
        
    }, 1000);
}

function stopGameLoop() {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
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

// MODIFICADO: para manejar nodos de interacción sin cambiar la ubicación (ruido)
function showNode(nodeId) {
    const node = GAME_CONTENT[nodeId];
    if (!node) {
        console.error(`Nodo no encontrado: ${nodeId}`);
        return;
    }

    // Si es un Hub (sala principal), actualiza la ubicación y el checkpoint
    if (node.isLocationHub) {
        gameState.previousLocation = gameState.location;
        gameState.location = nodeId;
        if (node.isCheckpoint) {
            saveCheckpoint();
        }
    }
    // Si es un nodo de interacción (p.ej. 'revisar_radio'),
    // no cambiamos gameState.location, así que el ruido sigue siendo el de la sala.

    optionsContainer.innerHTML = '';
    
    if (node.onEnter) {
        if (node.onEnter.params) {
            window[node.onEnter.func](node.onEnter.params);
        } else {
            window[node.onEnter.func]();
        }
    }
    
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

// MODIFICADO: Acepta nodeId
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
        
        // MODIFICADO: Pasa el nodeId al handler
        optEl.onclick = () => handleOptionClick(option, nodeId);
        optionsContainer.appendChild(optEl);
    });
    // Scroll forzoso para asegurar que se vean las opciones
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
    optionsContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// MODIFICADO: Acepta nodeId
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
    if (!gameState.flags.rulo_joins) {
        ruloHud.classList.add('hidden');
        return;
    }
    
    ruloHud.classList.remove('hidden');
    const hp = gameState.ruloHP;
    let stateText = "OK";
    let stateClass = "life-ok";
    
    if (hp <= 40) { stateText = "HERIDO"; stateClass = "life-danger"; }
    else if (hp <= 70) { stateText = "DAÑADO"; stateClass = "life-low"; }
    
    ruloStateUI.textContent = stateText;
    ruloStateUI.className = 'font-bold';
    ruloStateUI.classList.add(stateClass);
}

// --- Modales (Confirmación, Stats, Mochila) ---

// NUEVO: Modal de confirmación genérico
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
    if (!gameState.flags.rulo_joins) return;
    
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
    confirmModal.classList.add('hidden'); // NUEVO
    
    // No cerrar el minijuego de calma desde aquí
    // calmMinigame.classList.add('hidden'); 
}

function handleNarrativeClick() {
    if (calmGameActive) return; // No hacer nada si el minijuego de calma está activo
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
            
            if (gameState.flags.rulo_joins) {
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

// MODIFICADO: para añadir botón de calma
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

// MODIFICADO: para añadir botón de calma
function renderPlayerStatsModal() {
    const stats = gameState.playerStats;
    let html = '';
    html += createStatBar('Vida', stats.vida, (stats.vida <= 40 ? 'herido' : (stats.vida <= 70 ? 'hambre' : 'calm')));
    // Añade el botón de calmar a la barra de ansiedad
    const calmBtnHtml = `<button id="start-calm-btn" class="btn-action">Calmar</button>`;
    html += createStatBar('Ansiedad', stats.ansiedad, (stats.ansiedad >= 70 ? 'herido' : (stats.ansiedad >= 40 ? 'ansioso' : 'calm')), calmBtnHtml);
    html += createStatBar('Hambre', stats.hambre, (stats.hambre >= 60 ? 'hambre' : 'calm'));
    html += createStatBar('Agua', stats.agua, (stats.agua >= 60 ? 'hambre' : 'calm'));
    
    playerStatsList.innerHTML = html;
}

function renderRuloStatsModal() {
    const hp = gameState.ruloHP;
    let html = '';
    html += createStatBar('Vida', hp, (hp <= 40 ? 'herido' : (hp <= 70 ? 'hambre' : 'calm')));
    ruloStatsList.innerHTML = html;
}

function useItem(itemId, target) {
    if (!hasItem(itemId)) return;
    
    const item = gameState.inventory[itemId];
    let feedbackText = "";
    
    switch (itemId) {
        case 'barrita':
            if (target === 'player') updatePlayerStat('hambre', -40);
            else updateRuloHP(5);
            feedbackText = (target === 'player' ? "Comes" : "Rulo come") + " la barrita.";
            break;
        case 'botella_agua':
            if (target === 'player') updatePlayerStat('agua', -50);
            else updateRuloHP(5);
            feedbackText = (target === 'player' ? "Bebes" : "Rulo bebe") + " agua.";
            break;
        case 'vendaje':
            let targetHP = (target === 'player') ? gameState.playerStats.vida : gameState.ruloHP;
            if (targetHP < 100) {
                if (target === 'player') updatePlayerStat('vida', 30);
                else updateRuloHP(30);
                feedbackText = (target === 'player' ? "Aplicas" : "Rulo aplica") + " el vendaje.";
            } else {
                feedbackText = (target === 'player' ? "No estás" : "Rulo no está") + " herido.";
                return;
            }
            break;
        default:
            return; 
    }
    
    removeItem(itemId, 1);
    closeAllModals();
    
    // MODIFICADO: Usa el sistema de notificaciones
    logNotification(feedbackText, 'info');
    
    // Opcional: también añadir al log principal si se desea
    // typeText(feedbackText, false, () => {
    //     renderOptions(GAME_CONTENT[gameState.location].options, gameState.location);
    // });
}

// --- EFECTOS DE JUEGO Y NOTIFICACIONES ---

// NUEVO: Sistema de log de notificaciones
function logNotification(text, type = 'info') {
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

// MODIFICADO: Re-propuesto para añadir efectos al log principal (si se desea)
// Por ahora, solo efectos visuales y de sonido (en el futuro)
function displayTextEffect(text, type) {
    if (type === 'scare') {
        appContainer.classList.add('shake');
        setTimeout(() => appContainer.classList.remove('shake'), 300);
    }
    
    // Ya no añade texto al narrativeLog, eso lo hace logNotification
}

const gameEffects = {
    playScare: ({ text, shake }) => {
        logNotification(text, 'scare'); // MODIFICADO
        if (shake) {
            appContainer.classList.add('shake');
            setTimeout(() => appContainer.classList.remove('shake'), 300);
        }
        updatePlayerStat('ansiedad', 25);
    },
    playSfx: (text) => {
        logNotification(text, 'sfx'); // MODIFICADO
    },
    playStatic: (text) => {
        logNotification(text, 'static'); // MODIFICADO
    }
};

// --- LÓGICA DEL MONSTRUO Y REACCIÓN ---

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
        
        // NUEVO: Inicia el minijuego de calma
        startCalmMinigame();
    }
}

function checkMonsterSpawn() {
    if (gameState.monsterPresent || gameState.monsterApproaching) return;

    const currentRoomNoise = gameState.roomNoise[gameState.location] || 0;
    
    // Multiplicador de dificultad
    let diffMultiplier = 1.0;
    if (gameState.difficulty === 'easy') diffMultiplier = 0.5;
    if (gameState.difficulty === 'hard') diffMultiplier = 1.8;
    if (gameState.difficulty === 'nightmare') diffMultiplier = 2.5;

    let baseProb = 0.005 * diffMultiplier;
    let noiseProb = (currentRoomNoise / 100) * 0.05 * diffMultiplier;
    
    let stateMultiplier = 1.0;
    if (currentRoomNoise > 40) { 
        if (gameState.playerStats.ansiedad >= 70) stateMultiplier = 3.0;
        else if (gameState.playerStats.vida <= 40) stateMultiplier = 2.5;
        else if (gameState.playerStats.hambre >= 80) stateMultiplier *= 1.2;
    }

    // ruloAlertActive se resetea si se falla el minijuego de calma
    if (gameState.ruloAlertActive) {
        stateMultiplier *= 0.5; // Rulo te avisó pero no te calmaste
        gameState.ruloAlertActive = false;
    }
    
    const finalProb = baseProb + (noiseProb * stateMultiplier);
    
    if (Math.random() < finalProb) {
        initiateMonsterApproach();
    }
}

// MODIFICADO: No interrumpe diálogos
function initiateMonsterApproach() {
    gameState.monsterApproaching = true;
    stopGameLoop(); // Pausa el decaimiento de ruido y otros spawns
    
    // NO interrumpe el tipeo
    // NO limpia opciones
    
    logNotification("...una sombra se alarga bajo la puerta...", 'sfx');
    
    const delay = 1000 + (Math.random() * 1000);
    setTimeout(spawnMonster, delay);
}

function spawnMonster() {
    gameState.monsterPresent = true;
    gameState.monsterApproaching = false;
    
    let statePenalty = 0;
    if (gameState.playerStats.ansiedad >= 70) statePenalty += 0.2;
    if (gameState.playerStats.vida <= 40) statePenalty += 0.15;
    
    let ruloBonus = 1.0;
    if (gameState.flags.rulo_joins && gameState.ruloHP > 50) ruloBonus = 1.15;
    
    // NUEVO: Modificador de dificultad
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
    
    const btnX = Math.random() * (rectWidth - size - 40) + 20;
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
    
    // ... lógica de reducción de tamaño (sin cambios) ...
    const timePenalty = (elapsed / 10000);
    let statePenalty = 0;
    if (gameState.playerStats.ansiedad >= 70) statePenalty += 0.2;
    if (gameState.playerStats.vida <= 40) statePenalty += 0.15;
    let ruloBonus = 1.0;
    if (gameState.flags.rulo_joins && gameState.ruloHP > 50) ruloBonus = 1.15;
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

// MODIFICADO: No interrumpe diálogos
function clickReactionBtn() {
    clearTimeout(reactionTimeout);
    clearInterval(reactionTimerInterval);
    reactionBtn.style.display = 'none';
    
    gameState.monsterPresent = false;
    gameState.monsterTime = 0;
    changeRoomNoise(gameState.location, -15);
    updatePlayerStat('ansiedad', -30);
    
    logNotification("...un movimiento rápido. El Eco retrocede. Estás a salvo.", 'sfx');
    
    resumeGame(); // Reinicia el bucle principal
}

// MODIFICADO: No interrumpe diálogos
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
        const itemsToLose = items.filter(id => id !== 'mochila');
        if (itemsToLose.length > 0) {
            const itemToLoseId = itemsToLose[Math.floor(Math.random() * itemsToLose.length)];
            lostItem = gameState.inventory[itemToLoseId].name;
            removeItem(itemToLoseId);
        }
    }
    
    logNotification(`¡DEMASIADO TARDE! El Eco te roza. Pierdes tu [${lostItem || 'cordura'}].`, 'scare');
    
    resumeGame(); // Reinicia el bucle principal
}

// --- NUEVO: MINIJUEGO DE CALMA ---

function startCalmMinigame() {
    if (calmGameActive) return;
    calmGameActive = true;
    
    // Pausa el juego pero no los diálogos
    stopGameLoop();
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

function checkCalmHit() {
    const markerLeft = calmMarkerPos; // El marcador es una línea, su "posición" es su borde
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
    logNotification("No logras concentrarte.", 'sfx');
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
    
    // Reanuda el juego si no hay un monstruo atacando
    if (!gameState.monsterPresent && !gameState.monsterApproaching) {
        startGameLoop();
    }
}


// --- ACCIONES Y CONDICIONES DEL JUEGO ---

function checkHasItem(id) { return hasItem(id); }
function checkFlagFalse(flag) { return !gameState.flags[flag]; }
function checkFlagTrue(flag) { return gameState.flags[flag]; }

function rollD100() { return Math.floor(Math.random() * 100) + 1; }
function hasItem(id) { return gameState.inventory[id] && gameState.inventory[id].qty > 0; }

function addItem(id, name, rarity, qty = 1, consumable = false) {
    if (gameState.inventory[id]) {
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
    if (!gameState.roomNoise.hasOwnProperty(roomId)) return; // No afectar ruido de nodos de interacción
    
    let currentNoise = gameState.roomNoise[roomId] || 0;
    let newNoise = Math.max(0, Math.min(100, currentNoise + amount));
    gameState.roomNoise[roomId] = newNoise;
    
    if (amount > 0 && !isDecay) {
        updatePlayerStat('ansiedad', amount / 5);
        logNotification(`Ruido aumentado: +${amount}`, 'info');
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
        updateRuloHP(-5);
    }
    // MODIFICADO: Pasa el nodeId actual ('sala_vigilancia')
    typeText(text, true, () => renderOptions(GAME_CONTENT.sala_vigilancia.options, 'sala_vigilancia'));
}

function sintonizarRadio() {
    const roll = rollD100();
    let text = "Giras el dial. La estática es ensordecedora.\n";
    
    if (roll > 95) {
        text += "Voz clara: '...no confíes...'. Un compartimento se abre. [Fragmento de Cinta Magnética].";
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
    
    typeText(text, true, () => renderOptions(GAME_CONTENT.revisar_radio.options, 'revisar_radio'));
}

function forzarRadio() {
    const roll = rollD100();
    let text = "Usas el destornillador para forzar la carcasa...\n";
    
    if (roll <= 5) {
        text += "¡ERROR! El destornillador toca un capacitor. La radio explota. La puerta del Sótano retumba.";
        changeRoomNoise(null, 100);
        gameEffects.playScare("EXPLOSIÓN DE RADIO", true);
        setTimeout(() => showNode('eco_cerca'), 1000);
        return;
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
    updatePlayerStat('hambre', 2);
    updatePlayerStat('agua', 3);
    
    // NUEVO: Modificadores de dificultad
    let findChance = 0; // 0-100
    if (gameState.difficulty === 'easy') findChance = 25;
    if (gameState.difficulty === 'hard') findChance = -15;
    if (gameState.difficulty === 'nightmare') findChance = -30;
    
    if (roomId === 'sala_vigilancia') {
        if (roll > (80 - findChance) && !hasItem('llave_oxidada')) {
            text += "Debajo de unos papeles quemados, brilla una [Llave Oxidada].";
            addItem('llave_oxidada', 'Llave Oxidada', 'R');
        } else if (roll > (60 - findChance) && !hasItem('vendaje')) {
            text += "En un botiquín de pared, encuentras un [Vendaje].";
            addItem('vendaje', 'Vendaje', 'C', 1, true);
        } else if (roll > (40 - findChance) && !hasItem('destornillador')) {
            text += "Encuentras un [Destornillador] en buen estado.";
            addItem('destornillador', 'Destornillador', 'C');
        } else if (roll > (20 - findChance) && !hasItem('nota_rasgada')) {
            text += "Encuentras una [Nota Rasgada]: '...se alimenta del ruido.'";
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
         setTimeout(() => showNode('eco_cerca'), 1000);
     } else {
         text += "Tiras y tiras, pero está atascada. No se mueve.";
         changeRoomNoise(null, 10);
         typeText(text, true, () => renderOptions(GAME_CONTENT.panel_pasillo.options, 'panel_pasillo'));
     }
}

function hablarConRulo() {
    gameState.flags.rulo_talked = true;
    let text = "Te acercas a Rulo. Sigue temblando.\n'¿Qué quieres?', susurra.\n'¿Vas a venir conmigo?'\n";
    
    let probAcompañar = 0.3;
    if (gameState.flags.rulo_awake_calm) probAcompañar = 0.6;
    if (gameState.ruloHP < 80) probAcompañar = 0.1;
    
    if (Math.random() < probAcompañar) {
        text += "Rulo asiente lentamente. 'No... no puedo quedarme aquí solo. Iré contigo. Pero debemos tener cuidado.'\nRulo ahora te acompaña.";
        gameState.flags.rulo_joins = true;
    } else {
        text += "Rulo niega con la cabeza. 'No. Es demasiado peligroso. La voz... nos encontrará. Me quedo aquí.'";
        gameState.flags.rulo_joins = false;
    }
    
    renderRuloState();
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

function explorarPasillo() {
    const roll = rollD100();
    let text = "Revisas las cajas de cartón mojadas, haciendo algo de ruido...\n";
    changeRoomNoise(null, 12);
    updatePlayerStat('hambre', 3);
    updatePlayerStat('agua', 4);
    
    // NUEVO: Modificadores de dificultad
    let findChance = 0; // 0-100
    if (gameState.difficulty === 'easy') findChance = 20;
    if (gameState.difficulty === 'hard') findChance = -10;
    if (gameState.difficulty === 'nightmare') findChance = -25;
    
    // En pesadilla, menos comida
    let qtyMultiplier = 1;
    if (gameState.difficulty === 'nightmare') qtyMultiplier = 0.5;

    if (roll > (75 - findChance)) {
        text += "¡Genial! Encuentras [Baterías] nuevas.";
        addItem('bateria', 'Batería Vieja', 'C', 2, true);
    } else if (roll > (40 - findChance)) {
        let qty = Math.max(1, Math.round(1 * qtyMultiplier));
        text += `Dentro hay una [Barrita Energética]${qty > 0 ? '' : ' (rancia y rota)'}.`;
        if (qty > 0) addItem('barrita', 'Barrita Energética', 'C', qty, true);
    } else if (roll > (20 - findChance)) {
        let qty = Math.max(1, Math.round(1 * qtyMultiplier));
        text += `Encuentras una [Botella de Agua]${qty > 0 ? ' medio llena' : ' (vacía y sucia)'}.`;
        if (qty > 0) addItem('botella_agua', 'Botella de Agua', 'C', qty, true);
    } else {
        text += "Vacía. Solo poliestireno húmedo.";
    }
    
    const count = gameState.roomCounters['pasillo_este_hub'] || 0;
    const max = SEARCH_LIMITS['pasillo_este_hub'] || 0;
    text += `\n(Has revisado ${count}/${max} zonas)`;
    
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

function moverSigilo() {
    let text = "Avanzas despacio, pegado a la pared. Casi imperceptible.\n";
    changeRoomNoise(null, 2);
    
    if (Math.random() < 0.1) {
        text += "Algo brilla en una esquina. Es una [Llave Pequeña].";
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
    let text = "Corres por el pasillo. Tus pisadas retumban.\n";
    changeRoomNoise(null, 35);
    updatePlayerStat('ansiedad', 10);
    updatePlayerStat('agua', 5);
    
    const roll = rollD100();
    
    if (roll < 30) {
        text += "¡Tropiezas con un tubo de metal! El estruendo es terrible.";
        changeRoomNoise(null, 25);
        gameEffects.playScare("ESTRUENDO METÁLICO", true);
    } else {
        text += "Llegas al final. Ves las puertas del 'Almacén' y la 'Oficina de Seguridad'.";
        if (!gameState.unlockedLocations.includes('almacen')) {
            gameState.unlockedLocations.push('almacen');
        }
        if (!gameState.unlockedLocations.includes('oficina_seguridad')) {
            gameState.unlockedLocations.push('oficina_seguridad');
        }
        renderLocations();
    }
    
    typeText(text, true, () => renderOptions(GAME_CONTENT.pasillo_este_hub.options, 'pasillo_este_hub'));
}

// --- Acciones del Puzzle de Ruido ---

function solveNoisePuzzle(success) {
    // El ruido se aplica a gameState.location, que es el hub correcto
    
    if (success) {
        gameState.roomNoise[gameState.location] = 0; // Resetea el ruido del hub
        logNotification("¡Éxito! Ruido de sala reducido a 0.", 'sfx');
        typeText("¡Éxito! Un clic satisfactorio. El zumbido de fondo en la sala disminuye.\nEl ruido en esa zona ha sido purgado.", true, () => {
            setTimeout(() => showNode(gameState.location), 1000); // Vuelve al hub
        });
    } else {
        changeRoomNoise(gameState.location, 20); // Penalización de ruido en el hub
        gameEffects.playScare("FALLO DE SECUENCIA", true);
        typeText("¡Fallo! Un chispazo ensordecedor salta del panel. El ruido ha aumentado.", true, () => {
            setTimeout(() => showNode(gameState.location), 1000); // Vuelve al hub
        });
    }
}


// --- CONTENIDO DEL JUEGO (NODOS DE HISTORIA) ---

const GAME_CONTENT = {
    'start': {
        isLocationHub: false, // No es un hub
        text: "Cargando...",
        options: []
    },
    'ajustes_dispositivo': {
        isInteraction: true, // NUEVO
        text: "Iniciando sistema...\nPor favor, selecciona tu modo de visualización preferido.",
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
        isInteraction: true, // NUEVO
        text: "La radio emite estática. La luz del canal 19 parpadea.",
        options: [
            { text: "Intentar sintonizar manualmente", action: { func: "sintonizarRadio" }, condition: { func: "checkFlagFalse", params: "radio_pista" } },
            { text: "Forzar radio con destornillador", action: { func: "forzarRadio" }, condition: { func: "checkHasItem", params: "destornillador" } },
            { text: "Volver", target: "sala_vigilancia" }
        ]
    },
    'buscar_salida': {
        isInteraction: true, // NUEVO
        text: "La única salida parece ser una puerta metálica pesada: 'PASILLO ESTE'. Está cerrada. Al lado hay un panel de control.",
        options: [
            { text: "Inspeccionar panel de control", target: "panel_pasillo" },
            { text: "Volver", target: "sala_vigilancia" }
        ]
    },
    'panel_pasillo': {
        isInteraction: true, // NUEVO
        text: "Un panel de acceso. La luz está en rojo. Necesita energía o una llave para anular el cierre.",
        options: [
            { text: "Usar Destornillador en el panel", action: { func: "usarDestornilladorPanel" }, condition: { func: "checkHasItem", params: "destornillador" } },
            { text: "Usar Llave Oxidada", action: { func: "usarLlavePanel" }, condition: { func: "checkHasItem", params: "llave_oxidada" } },
            { text: "Forzar palanca de emergencia", action: { func: "forzarPalancaPanel" } },
            { text: "Volver", target: "sala_vigilancia" }
        ]
    },
    'parte1_fin_exito': {
        isInteraction: true, // NUEVO
        text: "La puerta al pasillo chisporrotea y se abre.\nUn golpe seco viene del sótano. Una sombra pasa por la rendija de la puerta del sótano, fugazmente.",
        effect: { name: "playScare", params: { text: "SOMBRA EN EL SÓTANO", shake: true } },
        options: [
            { text: "[Entrar al Pasillo Este]", target: "pasillo_este_intro" },
        ]
    },
    'eco_cerca': {
        isInteraction: true, // NUEVO
        text: "El estruendo resuena. La radio grita: N—O — C O N F Í E— .\nDe pronto, la voz susurra TU NOMBRE.\nEl Eco está cerca.",
        effect: { name: "playStatic", params: "EL ECO ESTÁ CERCA" },
        options: [
            { text: "[FIN DE LA DEMO - REINICIAR]", action: { func: "goToMenu" } } // Vuelve al menú
        ]
    },
    
    // --- PARTE 2 ---
    'pasillo_este_intro': {
        isInteraction: true, // Es una intro, no el hub
        isCheckpoint: true,
        text: "Abres la puerta al pasillo Este. La luz de emergencia titila en rojo. A la derecha, apoyada contra una columna, hay una mochila vieja.",
        options: [
            { text: "Abrir la mochila", target: "abrir_mochila" }
        ]
    },
    'abrir_mochila': {
        isInteraction: true, // NUEVO
        text: "Abres la mochila. Está vacía, pero limpia. Transfieres tus cosas a ella.\n(Has conseguido la [Mochila]).",
        onEnter: { func: "enableBackpack" },
        options: [
            { text: "Continuar por el pasillo", target: "pasillo_este_hub" }
        ]
    },
    'pasillo_este_hub': {
        isLocationHub: true,
        isCheckpoint: true, // NUEVO
        text: "Estás en el Pasillo Este. Hay cajas de suministros podridas. Al fondo, el pasillo se bifurca. El zumbido es más fuerte aquí.",
        options: [
            { 
                text: "Revisar cajas (Ruta Exploratoria)", 
                action: { func: "explorarPasillo" },
                countsSearch: "pasillo_este_hub"
            },
            { text: "Avanzar con cuidado (Ruta Cautelosa)", action: { func: "moverSigilo" } },
            { text: "Correr al fondo (Ruta Rápida)", action: { func: "moverRapido" } },
            { 
                text: "Hablar con Rulo", 
                action: { func: "hablarConRulo" }, 
                condition: { func: "checkFlagTrue", params: "rulo_awake" },
            },
            { text: "Volver a la Sala de Vigilancia", target: "sala_vigilancia" }
        ]
    },
    
    'almacen': {
        isLocationHub: true,
        isCheckpoint: true, // NUEVO
        text: "Llegas al almacén. Cajas apiladas, olor a aceite. Se oyen rascaduras detrás de una estantería.",
        options: [
            { text: "Buscar suministros (Próximamente)", target: "almacen" },
            { text: "Volver al Pasillo Este", target: "pasillo_este_hub" }
        ]
    },
    'oficina_seguridad': {
        isLocationHub: true,
        isCheckpoint: true, // NUEVO
        text: "Entras a la oficina de seguridad. Un escritorio volcado, notas en el suelo. Hay una llave colgando de un tablero.",
        options: [
            { text: "Leer notas (Próximamente)", target: "oficina_seguridad" },
            { text: "Volver al Pasillo Este", target: "pasillo_este_hub" }
        ]
    },
    'sotano': {
        isLocationHub: true,
        isCheckpoint: true, // NUEVO
        text: "La puerta al sótano está cerrada con cadenas.",
        options: [
             { text: "Volver a la Sala de Vigilancia", target: "sala_vigilancia" }
        ]
    },
    
    // --- Nodos de Puzzle de Ruido ---
    'puzzle_ruido_intro': {
        isInteraction: true, // NUEVO
        text: "Te concentras en el panel de la barra de ruido. Puedes intentar recalibrarlo.\nSelecciona la complejidad del bypass que quieres intentar.",
        options: [
            // MODIFICADO: Ahora depende de la dificultad
            { text: "Ordenar fusibles (Fácil)", target: "puzzle_fusibles_1", condition: { func: "checkDifficulty", params: "easy" } },
            { text: "Ordenar fusibles (Medio)", target: "puzzle_fusibles_2", condition: { func: "checkDifficulty", params: "medium" } },
            { text: "Ordenar fusibles (Difícil)", target: "puzzle_fusibles_3", condition: { func: "checkDifficulty", params: "hard" } },
            { text: "Ordenar fusibles (Pesadilla)", target: "puzzle_fusibles_4", condition: { func: "checkDifficulty", params: "nightmare" } },
            { text: "Cancelar", action: { func: "returnToPreviousLocation" } }
        ]
    },
    'puzzle_fusibles_1': { // Fácil
        isInteraction: true, 
        text: "Hay 3 ranuras: [1] [2] [3]. Y 3 fusibles: [Rojo] [Verde] [Azul].\nNota: 'El verde estabiliza. El rojo potencia. El azul enfría.'\nDebes poner el estabilizador *antes* que el de potencia.",
        options: [
            { text: "Insertar: Azul, Verde, Rojo", action: { func: "solveNoisePuzzle", params: false } },
            { text: "Insertar: Verde, Azul, Rojo", action: { func: "solveNoisePuzzle", params: true } }, // Correcto
            { text: "Insertar: Rojo, Verde, Azul", action: { func: "solveNoisePuzzle", params: false } }
        ]
    },
    'puzzle_fusibles_2': { // Medio (Igual que fácil por ahora)
        isInteraction: true, 
        text: "Hay 3 ranuras: [1] [2] [3]. Y 3 fusibles: [Rojo] [Verde] [Azul].\nNota: 'El verde estabiliza. El rojo potencia. El azul enfría.'\nDebes poner el estabilizador *antes* que el de potencia.",
        options: [
            { text: "Insertar: Azul, Verde, Rojo", action: { func: "solveNoisePuzzle", params: false } },
            { text: "Insertar: Verde, Azul, Rojo", action: { func: "solveNoisePuzzle", params: true } }, // Correcto
            { text: "Insertar: Rojo, Verde, Azul", action: { func: "solveNoisePuzzle", params: false } }
        ]
    },
    'puzzle_fusibles_3': { // Difícil (Más opciones)
        isInteraction: true, 
        text: "Hay 4 ranuras y 4 fusibles: [Rojo] [Verde] [Azul] [Amarillo].\nNota: 'El estabilizador (Verde) primero. El de potencia (Rojo) nunca junto al de enfriamiento (Azul).'",
        options: [
            { text: "Verde, Rojo, Amarillo, Azul", action: { func: "solveNoisePuzzle", params: false } },
            { text: "Verde, Amarillo, Rojo, Azul", action: { func: "solveNoisePuzzle", params: false } },
            { text: "Verde, Azul, Amarillo, Rojo", action: { func: "solveNoisePuzzle", params: true } }, // Correcto
            { text: "Rojo, Verde, Azul, Amarillo", action: { func: "solveNoisePuzzle", params: false } }
        ]
    },
    'puzzle_fusibles_4': { // Pesadilla (Igual que difícil por ahora)
        isInteraction: true, 
        text: "Hay 4 ranuras y 4 fusibles: [Rojo] [Verde] [Azul] [Amarillo].\nNota: 'El estabilizador (Verde) primero. El de potencia (Rojo) nunca junto al de enfriamiento (Azul).'",
        options: [
            { text: "Verde, Rojo, Amarillo, Azul", action: { func: "solveNoisePuzzle", params: false } },
            { text: "Verde, Amarillo, Rojo, Azul", action: { func: "solveNoisePuzzle", params: false } },
            { text: "Verde, Azul, Amarillo, Rojo", action: { func: "solveNoisePuzzle", params: true } }, // Correcto
            { text: "Rojo, Verde, Azul, Amarillo", action: { func: "solveNoisePuzzle", params: false } }
        ]
    }
};

// NUEVO: Condición para puzzles de dificultad
function checkDifficulty(diff) {
    return gameState.difficulty === diff;
}

// --- INICIALIZACIÓN Y EVENT LISTENERS ---

function init() {
    // Navegación Menú
    $('#play-btn').addEventListener('click', () => startGameFromMenu());
    $('#load-checkpoint-btn').addEventListener('click', loadCheckpoint);
    $('#settings-btn').addEventListener('click', () => showScreen('settings'));
    $('#back-to-menu-btn').addEventListener('click', goToMenu);
    $('#game-back-to-menu-btn').addEventListener('click', goToMenu);
    $('#change-device-btn').addEventListener('click', () => showScreen('device_select'));
    
    // NUEVO: Botón de Reset
    $('#reset-data-btn').addEventListener('click', () => {
        showConfirmationModal(
            "¿Estás seguro de que quieres borrar TODOS los datos guardados? Esto incluye progreso, tema y selección de dispositivo. La acción no se puede deshacer.",
            resetAllData // Función a ejecutar si se presiona SÍ
        );
    });
    
    // NUEVO: Botones de Dificultad
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

    // NUEVO: Listener para botón de calma (delegación de eventos)
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'start-calm-btn') {
            startCalmMinigame();
        }
    });
    $('#calm-cancel-btn').addEventListener('click', failCalmMinigame); // Cancelar cuenta como fallo
    
    // Listener de Teclado Global
    window.addEventListener('keydown', (e) => {
        // No hacer nada si el minijuego de calma está activo (él tiene su propio listener)
        if (calmGameActive) return;

        if (gameScreen.style.display === 'flex') {
            if (e.key.toLowerCase() === 'm' && gameState.flags.backpack_enabled) {
                toggleBackpack();
            }
            if (e.key.toLowerCase() === 'e') {
                togglePlayerStats();
            }
        }

        if (e.key === 'Escape') {
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
    
    // Click en la barra de ruido
    $('#noise-bar-container').addEventListener('click', () => {
        // MODIFICADO: Añadido chequeo de minijuego de calma
        if (isTyping || calmGameActive || gameScreen.style.display === 'none' || gameState.monsterPresent || gameState.monsterApproaching) return;
        showNode('puzzle_ruido_intro');
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
