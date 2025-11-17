/* * Motor.js
 * El motor principal del juego.
 * Maneja la UI, el estado, el inventario, el guardado y los eventos.
 */

// IMPORTAMOS LA DIFICULTAD
import { getTheme, THEME_PALETTES, getDifficulty } from '../../settings-manager.js';

// --- CONSTANTES ---
const TYPING_SPEED_MS = 38;
const SAVE_KEY = 'la-transmision-savegame';
// Cooldown para diálogos de sistema
const SYSTEM_DIALOGUE_COOLDOWN_MS = 4500; 

// --- CONFIGURACIÓN DEL JUEGO (FÁCIL DE PERSONALIZAR) ---
const GAME_SETTINGS = {
    // Intervalo (en milisegundos) en el que se drenan las estadísticas
    // Más alto = más lento
    DRAIN_INTERVAL_MS: 20000, // Antes 10000 (Ahora 20s)
    
    DRAIN_RATES: {
        // La dificultad actual, se carga al inicio
        difficulty: 'normal', 
        
        // Tasas de drenaje POR INTERVALO
        'easy': {
            energy: 1,      // Drenaje de linterna
            fear_darkness: 0, // Aumento de miedo en oscuridad
            hunger: 0,      // Drenaje de hambre
            thirst: 1       // Drenaje de sed
        },
        'normal': {
            energy: 2,
            fear_darkness: 1,
            hunger: 1,
            thirst: 2
        },
        'hard': {
            energy: 3,
            fear_darkness: 2,
            hunger: 2,
            thirst: 3
        },
        'nightmare': {
            energy: 4,
            fear_darkness: 3,
            hunger: 3,
            thirst: 4
        }
    }
};

// --- ESTADO DEL JUEGO ---
let GAME_STATE = {
    playerName: "Tú",
    currentNight: 1,
    difficulty: "normal", // Se cargará al iniciar
    player: { health: 100, hunger: 100, thirst: 100, fear: 0 },
    rulo: { health: 100, hunger: 100, thirst: 100, fear: 0, energy: 0, hasFlashlight: false },
    inventory: { consumables: [], keyItems: [], notes: [], minigames: [] },
    flags: {}, // Para rastrear decisiones (ej. ventana)
    currentLocation: "Habitación 1204"
};

// --- REFERENCIAS AL DOM ---
let dom = {};
let activeModal = null;

// --- ESTADO DEL TYPING ---
let isTyping = false;
let forceSkipTyping = false;

// --- ESTADO DEL MINIJUEGO ---
let minigame = {
    isActive: false,
    phase: 'tutorial', // 'tutorial', 'inhale', 'hold', 'exhale', 'wait'
    timer: 0,
    breaths: 0,
    failures: 0,
    loop: null // Para guardar el setInterval/requestAnimationFrame
};

// --- CACHÉ DE AUDIO ---
let audioCache = {
    estatica: new Audio('../../Assets/Audios/Estatica.mp3')
};

// --- RESOLVERS DE PROMESAS ---
let itemUseResolvers = {}; // Para esperar a que se use un item

// --- FUNCIONES DE INICIALIZACIÓN ---

export function init() {
    loadGame();
    loadDifficulty(); // Carga la dificultad y la aplica a GAME_SETTINGS

    dom = {
        gameContainer: document.getElementById('game-container'),
        vignetteOverlay: document.getElementById('vignette-overlay'), // Para el miedo
        // Overlays
        loadingOverlay: document.getElementById('loading-overlay'),
        nameOverlay: document.getElementById('name-input-overlay'),
        nameInput: document.getElementById('player-name-input'),
        nameConfirmBtn: document.getElementById('confirm-name-btn'),
        introOverlay: document.getElementById('intro-overlay'),
        
        // Paneles
        dialogueWindow: document.getElementById('dialogue-window'),
        choiceWindow: document.getElementById('choice-window'),
        notificationPanel: document.getElementById('notification-panel'),
        fearBarFill: document.getElementById('fear-bar-fill'),
        fearValue: document.getElementById('fear-value'),
        locationBar: document.getElementById('current-location'),
        
        // Modales
        modals: document.querySelectorAll('.modal'),
        inventoryModal: document.getElementById('inventory-modal'),
        statusModal: document.getElementById('status-modal'),
        noteReaderModal: document.getElementById('note-reader-modal'),
        minigameModal: document.getElementById('minigame-modal'), // Minijuego
        
        // Botones de UI
        menuBtn: document.getElementById('menu-btn'),
        inventoryBtn: document.getElementById('inventory-btn'),
        playerStatusBtn: document.getElementById('player-status-btn'),
        ruloStatusBtn: document.getElementById('rulo-status-btn'),
        
        // Contenido de Modales
        tabs: {
            consumables: document.getElementById('tab-consumables'),
            keyItems: document.getElementById('tab-key-items'),
            notes: document.getElementById('tab-notes'),
            minigames: document.getElementById('tab-minigames')
        },
        tabLinks: document.querySelectorAll('.tab-link'),
        noteTitle: document.getElementById('note-title'),
        noteContent: document.getElementById('note-content'),
        
        // Contenido Minijuego
        minigameContent: document.getElementById('minigame-content'),
        minigameTutorial: document.getElementById('minigame-tutorial'),
        minigameStartBtn: document.getElementById('minigame-start-btn'),
        breathingCircle: document.getElementById('breathing-circle'),
        breathCount: document.getElementById('breath-count'),
        breathFails: document.getElementById('breath-fails'),
        minigameInstructions: document.getElementById('minigame-instructions'),
        minigameTimer: document.getElementById('minigame-timer'),

        // Stats
        playerStats: {
            display: document.getElementById('player-stats-display'),
            name: document.getElementById('player-stats-name'),
            health: document.getElementById('player-health'),
            healthBar: document.getElementById('player-health-bar'),
            hunger: document.getElementById('player-hunger'),
            hungerBar: document.getElementById('player-hunger-bar'),
            thirst: document.getElementById('player-thirst'),
            thirstBar: document.getElementById('player-thirst-bar'),
            condition: document.getElementById('player-condition'),
            conditionDescription: document.getElementById('player-condition-description')
        },
        ruloStats: {
            display: document.getElementById('rulo-stats-display'),
            health: document.getElementById('rulo-health'),
            healthBar: document.getElementById('rulo-health-bar'),
            hunger: document.getElementById('rulo-hunger'),
            hungerBar: document.getElementById('rulo-hunger-bar'),
            thirst: document.getElementById('rulo-thirst'),
            thirstBar: document.getElementById('rulo-thirst-bar'),
            fear: document.getElementById('rulo-fear'),
            fearBar: document.getElementById('rulo-fear-bar'),
            energy: document.getElementById('rulo-energy'),
            energyBar: document.getElementById('rulo-energy-bar'),
            condition: document.getElementById('rulo-condition'),
            conditionDescription: document.getElementById('rulo-condition-description')
        }
    };

    applyTheme(getTheme() || 'verde-crt');
    setupModalListeners();
    setupInventoryTabListeners();
    setupGlobalKeyListener();
    updateAllUI();
    
    startGameLoop(); // Inicia el loop principal del juego
}

/** Carga la dificultad y la establece en GAME_SETTINGS */
function loadDifficulty() {
    GAME_STATE.difficulty = getDifficulty() || 'normal';
    GAME_SETTINGS.DRAIN_RATES.difficulty = GAME_STATE.difficulty; // Actualiza el objeto de settings
    console.log('Dificultad cargada:', GAME_STATE.difficulty);
}

/** Configura los listeners para todos los modales y atajos */
function setupModalListeners() {
    // Botón de Inventario
    dom.inventoryBtn.addEventListener('click', () => showModal(dom.inventoryModal));
    
    // BOTONES DE ESTADO (ACTUALIZADO)
    dom.playerStatusBtn.addEventListener('click', () => {
        dom.playerStats.display.classList.remove('hidden');
        // Ocultar Rulo si su botón de estado aún no es visible
        if (dom.ruloStatusBtn.classList.contains('hidden')) {
            dom.ruloStats.display.classList.add('hidden');
        } else {
            dom.ruloStats.display.classList.remove('hidden');
        }
        showModal(dom.statusModal);
    });
    
    dom.ruloStatusBtn.addEventListener('click', () => {
        dom.playerStats.display.classList.remove('hidden');
        dom.ruloStats.display.classList.remove('hidden');
        showModal(dom.statusModal);
    });

    // Botones de Cierre de Modal
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalToHide = document.getElementById(btn.getAttribute('data-modal-id'));
            
            // Si el modal tiene una promesa pendiente (como el lector de notas), resuélvela
            if (modalToHide.resolvePromise) {
                modalToHide.resolvePromise();
                modalToHide.resolvePromise = null; // Limpiar
            }
            
            // Si cerramos el minijuego, forzar fracaso
            if (modalToHide === dom.minigameModal && minigame.isActive) {
                endBreathingMinigame(false, true); // Fracaso por cerrar
            }
            
            hideModal(modalToHide);
        });
    });

    // Botón de Menú (Pantalla de Carga)
    dom.menuBtn.addEventListener('click', () => {
        dom.loadingOverlay.classList.add('visible');
        setTimeout(() => {
            window.location.href = '../../Inicio.html';
        }, 500); // Espera a que termine el fade-out
    });
}

/** Configura listeners para las pestañas del inventario */
function setupInventoryTabListeners() {
    dom.tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            const parentModal = link.closest('.modal-body');

            parentModal.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            parentModal.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));

            document.getElementById(tabId).classList.add('active');
            link.classList.add('active');
        });
    });
}

/** Configura el listener global de teclado (ESC, I, E) */
function setupGlobalKeyListener() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            if (activeModal) {
                // Simula el clic en el botón de cierre del modal activo
                const closeBtn = activeModal.querySelector('.close-btn');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    hideModal(activeModal); // Fallback
                }
            } else {
                dom.menuBtn.click(); // Simula clic en el botón de menú
            }
        }
        
        // CORREGIDO: Comprobar si el overlay de nombre está activo
        if (!dom.nameOverlay.classList.contains('hidden')) return;
        if (minigame.isActive) return; // No abrir menús durante minijuego

        if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            activeModal === dom.inventoryModal ? hideModal(activeModal) : showModal(dom.inventoryModal);
        }
        
        if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            if (activeModal === dom.statusModal) {
                hideModal(activeModal);
            } else {
                dom.playerStatusBtn.click(); // Abre el estado (que ahora muestra ambos)
            }
        }
    });

    // Listener para OMITIR DIÁLOGO
    dom.gameContainer.addEventListener('click', skipTyping);
}


// --- LOOP PRINCIPAL DEL JUEGO ---

/** Inicia el loop principal para manejar drenajes de estado y eventos pasivos */
function startGameLoop() {
    setInterval(() => {
        const rates = GAME_SETTINGS.DRAIN_RATES[GAME_SETTINGS.DRAIN_RATES.difficulty];
        
        // 1. Lógica de la Linterna
        if (GAME_STATE.rulo.hasFlashlight && GAME_STATE.rulo.energy > 0) {
            updateRuloState('energy', -rates.energy);
            
            if (GAME_STATE.rulo.energy === 0) {
                addNotification("¡La batería de la linterna se agotó!", "danger");
            }
        }
        
        // 2. Lógica de Oscuridad (Miedo Progresivo)
        if (GAME_STATE.rulo.energy <= 0 && GAME_STATE.rulo.hasFlashlight) { // Solo si ya tuvo linterna
            addNotification("Está oscuro... demasiado oscuro...", "danger");
            updatePlayerState('fear', rates.fear_darkness);
            updateRuloState('fear', rates.fear_darkness);
        }
        
        // 3. Lógica de Hambre y Sed (ACTUALIZADO)
        updatePlayerState('hunger', -rates.hunger);
        updatePlayerState('thirst', -rates.thirst);
        
        if (GAME_STATE.rulo.hasFlashlight) { // Rulo solo gasta si está "activo" (tiene linterna)
             updateRuloState('hunger', -rates.hunger);
             updateRuloState('thirst', -rates.thirst);
        }

    }, GAME_SETTINGS.DRAIN_INTERVAL_MS);
}


// --- FUNCIONES PÚBLICAS DEL MOTOR (Exportadas) ---

/** Oculta la pantalla de carga al inicio del juego */
export function hideLoadingScreen() {
    dom.loadingOverlay.classList.add('hidden');
}

/** Muestra el overlay de "Insertar Nombre" */
export function promptForName(onConfirm) {
    dom.nameOverlay.classList.remove('hidden', 'fade-out');
    dom.nameInput.focus();

    const confirmAction = () => {
        const name = dom.nameInput.value.trim();
        if (name) {
            setPlayerName(name);
            dom.nameOverlay.classList.add('fade-out');
            setTimeout(() => dom.nameOverlay.classList.add('hidden'), 1500);
            onConfirm();
        }
    };
    
    dom.nameConfirmBtn.onclick = confirmAction;
    dom.nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') confirmAction();
    };
}

/** Muestra el contenedor principal del juego */
export function showGameContainer() {
    dom.gameContainer.classList.remove('hidden');
}

/** Muestra el overlay de intro */
export function showIntroOverlay(text) {
    dom.introOverlay.querySelector('h1').textContent = text;
    dom.introOverlay.classList.remove('hidden', 'burn-out', 'fade-out');
}

/** Oculta el overlay de intro con efecto "burn-out" */
export function hideIntroOverlay() {
    dom.introOverlay.classList.add('burn-out');
    setTimeout(() => {
        dom.introOverlay.classList.add('hidden');
    }, 1500); // Coincide con la duración de la animación
}

/** Función para forzar la omisión del "typing" */
function skipTyping() {
    if (isTyping) {
        forceSkipTyping = true;
    }
}

/** Muestra un texto con efecto "typing" (ACTUALIZADO) */
export async function addDialogue(text, speaker = '') {
    // Si ya se está escribiendo, no hacer nada (previene doble clic)
    if (isTyping && speaker !== 'Sistema' && speaker !== 'Sonido') return; 

    const p = document.createElement('p');
    
    if (speaker) {
        const span = document.createElement('span');
        span.className = 'dialogue-speaker';
        
        if (speaker === 'Tú') {
            span.textContent = `${GAME_STATE.playerName}`;
        } else if (speaker === 'Sistema' || speaker === 'Sonido') {
            span.className = 'dialogue-system';
            span.textContent = text;
            p.appendChild(span);
            dom.dialogueWindow.appendChild(p);
            dom.dialogueWindow.scrollTop = dom.dialogueWindow.scrollHeight;
            
            // --- ACTUALIZADO: Cooldown NO bloqueante ---
            wait(SYSTEM_DIALOGUE_COOLDOWN_MS); // Inicia el timer, pero no espera
            return; // Retorna inmediatamente
            // ---------------------------------------------------
        } else {
            span.textContent = `${speaker}`;
        }
        p.appendChild(span);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'typing-cursor';
    p.appendChild(textSpan);
    dom.dialogueWindow.appendChild(p);

    // Lógica de "Typing"
    isTyping = true;
    forceSkipTyping = false;
    
    // CORREGIDO: Añade los dos puntos y el espacio aquí
    const textToType = (speaker && speaker !== 'Sistema' && speaker !== 'Sonido') ? `: ${text}` : text;
    
    for (let i = 0; i < textToType.length; i++) {
        if (forceSkipTyping) {
            break; // Salir del bucle
        }
        textSpan.textContent += textToType[i];
        dom.dialogueWindow.scrollTop = dom.dialogueWindow.scrollHeight;
        await wait(TYPING_SPEED_MS);
    }
    
    textSpan.textContent = textToType; // Asegura que el texto esté completo
    textSpan.classList.remove('typing-cursor');
    isTyping = false;
    forceSkipTyping = false;
}

/** Muestra una notificación en el panel derecho */
export function addNotification(text, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = text;
    dom.notificationPanel.appendChild(notif);
    
    // Auto-scroll
    setTimeout(() => {
         dom.notificationPanel.scrollTop = dom.notificationPanel.scrollHeight;
    }, 100);
   
    // Limpiar notificaciones viejas (opcional)
    if (dom.notificationPanel.children.length > 20) {
        dom.notificationPanel.removeChild(dom.notificationPanel.firstChild);
    }
}

/** Limpia todas las opciones de la ventana de elecciones */
export function clearChoices() {
    dom.choiceWindow.innerHTML = '';
}

/** Añade una nueva elección */
export function addChoice(text, callback) {
    const a = document.createElement('a');
    a.className = 'choice-link';
    a.href = '#';
    a.textContent = `[ ${text} ]`;
    a.onclick = (e) => {
        e.preventDefault();
        if (isTyping) return; // No permitir elecciones mientras se escribe
        clearChoices();
        callback();
    };
    dom.choiceWindow.appendChild(a);
}

/** Muestra el lector de notas y DEVUELVE UNA PROMESA que se resuelve al cerrar */
export function showNoteReader(title, content) {
    dom.noteTitle.textContent = title;
    dom.noteContent.textContent = content;
    showModal(dom.noteReaderModal);
    
    // Devuelve una promesa que el listener del botón de cierre resolverá
    return new Promise(resolve => {
        dom.noteReaderModal.resolvePromise = resolve;
    });
}

/** Espera a que un item específico sea usado */
export function waitForItemUse(itemId) {
    return new Promise(resolve => {
        itemUseResolvers[itemId] = resolve;
    });
}

// --- Gestión de Estado y Datos ---

/** Establece el nombre del jugador y lo guarda */
export function setPlayerName(name) {
    GAME_STATE.playerName = name;
    GAME_STATE.flags.isNewPlayer = false; // Marcar que ya no es nuevo
    dom.playerStats.name.textContent = name;
    saveGame();
}
export function getPlayerName() { return GAME_STATE.playerName; }

/** Establece el número de la noche */
export function setNightNumber(num) {
    GAME_STATE.currentNight = num;
    saveGame();
}
export function getNightNumber() { return GAME_STATE.currentNight; }
export function isNewPlayer() { return !GAME_STATE.flags.isNewPlayer; }

/** Establece la ubicación actual */
export function setLocation(locationName) {
    GAME_STATE.currentLocation = locationName;
    dom.locationBar.textContent = locationName;
    saveGame();
}

/** Establece/obtiene una flag de la historia */
export function setFlag(flagName, value) {
    GAME_STATE.flags[flagName] = value;
    saveGame();
}
export function getFlag(flagName) {
    return GAME_STATE.flags[flagName];
}


/** Actualiza una estadística del jugador. */
export function updatePlayerState(stat, value, isAbsolute = false) {
    let base = isAbsolute ? 0 : GAME_STATE.player[stat];
    GAME_STATE.player[stat] = Math.max(0, Math.min(100, base + value));
    
    const val = GAME_STATE.player[stat];
    if (stat === 'fear') {
        dom.fearBarFill.style.width = `${val}%`;
        dom.fearValue.textContent = val;
        updateFearVignette(val); // Actualiza el efecto de miedo
    } else {
        dom.playerStats[stat].textContent = `${val}/100`;
        dom.playerStats[`${stat}Bar`].style.width = `${val}%`;
    }
    updateCondition('player');
    saveGame();
}

/** Actualiza una estadística de Rulo */
export function updateRuloState(stat, value, isAbsolute = false) {
    if (typeof value === 'boolean') {
        GAME_STATE.rulo[stat] = value;
    } else {
        let base = isAbsolute ? 0 : GAME_STATE.rulo[stat];
        GAME_STATE.rulo[stat] = Math.max(0, Math.min(100, base + value));
    }
    
    const val = GAME_STATE.rulo[stat];
    // Actualiza la UI correspondiente
    if (stat === 'energy' || stat === 'health' || stat === 'hunger' || stat === 'thirst' || stat === 'fear') {
        dom.ruloStats[stat].textContent = `${val}/100`;
        dom.ruloStats[`${stat}Bar`].style.width = `${val}%`;
    }
    updateCondition('rulo');
    saveGame();
}

/** Muestra el botón de estado del Jugador */
export function showPlayerStatsButton() {
    dom.playerStatusBtn.classList.remove('hidden');
}

/** Muestra las estadísticas de Rulo en la UI */
export function showRuloStats() {
    dom.ruloStatusBtn.classList.remove('hidden');
    dom.ruloStats.display.classList.remove('hidden');
}


/** Añade un item al inventario y guarda */
export function addItem(tab, item) {
    // Manejar stacks
    const existingItem = GAME_STATE.inventory[tab].find(i => i.id === item.id);
    if (existingItem && item.stack) {
        existingItem.stack += item.stack;
    } else {
        GAME_STATE.inventory[tab].push(item);
    }
    
    addNotification(`Objeto añadido: ${item.name}`, 'item');
    renderInventory();
    saveGame();
}

/** Elimina un item del inventario y guarda (ACTUALIZADO para stacks) */
export function removeItem(tab, itemId, quantity = 1) {
    const itemIndex = GAME_STATE.inventory[tab].findIndex(i => i.id === itemId);
    if (itemIndex === -1) return; // No se encontró el item

    const item = GAME_STATE.inventory[tab][itemIndex];

    if (item.stack && item.stack > quantity) {
        item.stack -= quantity; // Reduce el stack
    } else {
        GAME_STATE.inventory[tab].splice(itemIndex, 1); // Elimina el item
    }
    
    renderInventory();
    saveGame();
}

/** Función de utilidad para esperar */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- FUNCIONES PRIVADAS DEL MOTOR ---

function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(GAME_STATE));
}

function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Fusionar datos guardados para no perder nuevos estados
        GAME_STATE = { ...GAME_STATE, ...parsedData };
        // Asegurarse de que los sub-objetos también se fusionen
        GAME_STATE.player = { ...GAME_STATE.player, ...parsedData.player };
        GAME_STATE.rulo = { ...GAME_STATE.rulo, ...parsedData.rulo };
        GAME_STATE.inventory = { ...GAME_STATE.inventory, ...parsedData.inventory };
        GAME_STATE.flags = { ...GAME_STATE.flags, ...parsedData.flags };
        
        // CORRECCIÓN: Asegurarse de que isNewPlayer se cargue correctamente
        // Si flags no existe en el save, se reinicia.
        if (!parsedData.flags) {
            GAME_STATE.flags = { isNewPlayer: true };
        } else {
            GAME_STATE.flags.isNewPlayer = parsedData.flags.isNewPlayer || false;
        }

    } else {
        GAME_STATE.flags.isNewPlayer = true;
    }
}

/** Actualiza TODA la UI desde GAME_STATE */
function updateAllUI() {
    dom.playerStats.name.textContent = GAME_STATE.playerName;
    updatePlayerState('health', 0);
    updatePlayerState('hunger', 0);
    updatePlayerState('thirst', 0);
    updatePlayerState('fear', 0);
    
    // Si Rulo ya fue desbloqueado en una partida anterior, mostrar su botón
    if (GAME_STATE.rulo.hasFlashlight || getFlag('n1_gave_flashlight')) {
        showRuloStats();
        updateRuloState('health', 0);
        updateRuloState('hunger', 0);
        updateRuloState('thirst', 0);
        updateRuloState('fear', 0);
        updateRuloState('energy', 0);
    } else {
        // Asegurarse de que esté oculto si no
        dom.ruloStatusBtn.classList.add('hidden');
        dom.ruloStats.display.classList.add('hidden');
    }
    
    renderInventory();
    dom.locationBar.textContent = GAME_STATE.currentLocation;
}

function showModal(modalElement) {
    if (activeModal) hideModal(activeModal);
    modalElement.classList.remove('hidden');
    activeModal = modalElement;
}

function hideModal(modalElement) {
    modalElement.classList.add('hidden');
    activeModal = null;
}

function applyTheme(themeName) {
    document.body.dataset.theme = themeName;
    const palette = THEME_PALETTES[themeName];
    const root = document.documentElement;
    if (palette) {
        for (const key in palette) {
            root.style.setProperty(key, palette[key]);
        }
    }
}

/** Actualiza el texto de condición (NUEVOS ESTADOS) */
function updateCondition(character) {
    const state = GAME_STATE[character];
    const ui = (character === 'player') ? dom.playerStats : dom.ruloStats;
    let condition = "Estable";
    let cssClass = "condition-stable";
    let description = "Sin efectos negativos.";

    if (state.fear > 80 || state.health < 15) {
        condition = "Crítico"; cssClass = "condition-critical"; description = "Al borde del colapso. El miedo extremo drena la salud.";
    } else if (state.fear > 60) {
        condition = "Aterrado"; cssClass = "condition-terrified"; description = "Manos temblorosas. Cuesta concentrarse.";
    } else if (state.fear > 45) { // NUEVO ESTADO
        condition = "Asustado"; cssClass = "condition-terrified"; description = "Paranoia. Los ruidos parecen más fuertes.";
    } else if (state.health < 40) {
        condition = "Herido"; cssClass = "condition-wounded"; description = "El dolor nubla tus sentidos.";
    } else if (state.fear > 20) {
        condition = "Nervioso"; cssClass = "condition-nervous"; description = "Alerta máxima. El corazón late con fuerza.";
    } else if (state.hunger < 20) {
        condition = "Hambriento"; cssClass = "condition-wounded"; description = "El estómago ruge. Falta de energía.";
    } else if (state.thirst < 20) {
        condition = "Sediento"; cssClass = "condition-wounded"; description = "Boca seca. Mareos leves.";
    }

    ui.condition.textContent = condition;
    ui.condition.className = cssClass;
    ui.conditionDescription.textContent = description;
}

/** Actualiza el efecto de viñeta del miedo */
function updateFearVignette(fearValue) {
    const opacity = fearValue / 100; // Opacidad de 0 a 1
    const spread = 50 + (fearValue * 2); // Propagación de 50px a 250px
    
    dom.vignetteOverlay.style.boxShadow = `inset 0 0 ${spread}px ${spread/2}px rgba(0,0,0,${opacity})`;

    if (fearValue > 80) {
        dom.vignetteOverlay.classList.add('pulse-critical');
    } else if (fearValue > 50) {
        dom.vignetteOverlay.classList.add('pulse-fast');
    } else {
        dom.vignetteOverlay.classList.remove('pulse-fast', 'pulse-critical');
    }
}

/** Dibuja los items en el inventario y AÑADE LISTENERS */
function renderInventory() {
    dom.tabs.consumables.innerHTML = '';
    dom.tabs.keyItems.innerHTML = '';
    dom.tabs.notes.innerHTML = '';
    dom.tabs.minigames.innerHTML = '';

    // Consumibles
    GAME_STATE.inventory.consumables.forEach(item => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.innerHTML = `<span>${item.name} (x${item.stack || 1})</span>`;
        const useBtn = document.createElement('button');
        useBtn.className = 'ui-btn';
        useBtn.textContent = 'Usar';
        useBtn.onclick = () => useItem(item); // <-- Lógica de "Usar"
        div.appendChild(useBtn);
        dom.tabs.consumables.appendChild(div);
    });
    
    // Items Clave (Objetos)
    GAME_STATE.inventory.keyItems.forEach(item => {
        dom.tabs.keyItems.innerHTML += `<div class="inventory-item"><span>${item.name}</span></div>`;
    });
    
    // Notas
    GAME_STATE.inventory.notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'inventory-item note-item';
        div.innerHTML = `<span>${note.name}</span>`;
        div.onclick = () => showNoteReader(note.name, note.content);
        dom.tabs.notes.appendChild(div);
    });
    
    // Minijuegos
    GAME_STATE.inventory.minigames.forEach(item => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.innerHTML = `<span>${item.name}</span>`;
        const playBtn = document.createElement('button');
        playBtn.className = 'ui-btn';
        playBtn.textContent = 'Usar';
        playBtn.onclick = () => startMinigame(item); // <-- Lógica de "Minijuego"
        div.appendChild(playBtn);
        dom.tabs.minigames.appendChild(div);
    });
}

// --- LÓGICA DE ITEMS Y MINIJUEGOS (NUEVO) ---

/** Lógica central para USAR un item */
function useItem(item) {
    // Resuelve la promesa si el juego está esperando este item
    if (itemUseResolvers[item.id]) {
        itemUseResolvers[item.id]();
        delete itemUseResolvers[item.id];
    }
    
    hideModal(dom.inventoryModal); // Ocultar inventario

    switch(item.id) {
        case 'battery_spent':
            if (GAME_STATE.rulo.hasFlashlight) {
                updateRuloState('energy', item.restore || 20);
                addNotification(`Recargaste la linterna. (+${item.restore || 20} Energía)`, 'item');
                removeItem('consumables', item.id, 1);
            } else {
                addNotification("No tienes una linterna activa para recargar.");
            }
            break;
        
        case 'water':
            addNotification("Bebes un poco de agua.", 'item');
            applyConsumableEffect('thirst', item.restore || 30, 'player');
            removeItem('consumables', item.id, 1);
            break;
            
        case 'cereal':
            addNotification("Comes la barra de cereal rancia.", 'item');
            applyConsumableEffect('hunger', item.restore || 20, 'player');
            removeItem('consumables', item.id, 1);
            break;
            
        case 'pills':
            addNotification("Tomas las píldoras... te sientes más calmado, pero mareado.", 'item');
            updatePlayerState('fear', item.restore || -30); // Instantáneo
            removeItem('consumables', item.id, 1);
            break;
            
        case 'bandage':
            addNotification("Te aplicas la venda sucia.", 'item');
            updatePlayerState('health', item.restore || 10); // Instantáneo
            removeItem('consumables', item.id, 1);
            break;
            
        default:
            addNotification("No puedes usar esto ahora.");
    }
}

/** Aplica un efecto de consumible LENTAMENTE en el tiempo */
function applyConsumableEffect(stat, totalRestore, target = 'player') {
    let tickRate = 2000; // 2 segundos
    let restorePerTick = 2;
    
    // Ajustar según la dificultad
    switch(GAME_STATE.difficulty) {
        case 'easy':
            tickRate = 1500;
            restorePerTick = 3;
            break;
        case 'hard':
            tickRate = 3000;
            restorePerTick = 1;
            break;
        case 'nightmare':
            tickRate = 4000;
            restorePerTick = 1;
            totalRestore *= 0.75; // Menos efectivo
            break;
    }
    
    let restoredAmount = 0;
    
    const interval = setInterval(() => {
        if (restoredAmount >= totalRestore) {
            clearInterval(interval);
            return;
        }
        
        const amount = Math.min(restorePerTick, totalRestore - restoredAmount);
        if (target === 'player') {
            updatePlayerState(stat, amount);
        } else {
            updateRuloState(stat, amount);
        }
        restoredAmount += amount;
        
    }, tickRate);
}

/** Reproduce un sonido (y lo detiene opcionalmente) */
export function playAudio(audioId, durationInSeconds = 0) {
    const audio = audioCache[audioId];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Error al reproducir audio:", e));
        
        if (durationInSeconds > 0) {
            setTimeout(() => {
                audio.pause();
            }, durationInSeconds * 1000);
        }
    } else {
        console.error(`Audio no encontrado en cache: ${audioId}`);
    }
}

/** Inicia la lógica de un minijuego */
function startMinigame(item) {
    if (item.id === 'tranqui_oso') {
        if (GAME_STATE.player.fear < 40) { // Umbral bajado
            hideModal(dom.inventoryModal);
            addNotification("No sientes la necesidad de usarlo ahora. Tu miedo no es tan alto.");
            return;
        }
        // Iniciar minijuego
        startBreathingMinigame();
    }
}

// --- LÓGICA DEL MINIJUEGO DE RESPIRACIÓN (MEJORADA) ---

const BREATH_PHASES = {
    INHALE: { duration: 4000, instruction: "MANTÉN PRESIONADO PARA INHALAR..." },
    HOLD:   { duration: 2000, instruction: "SIGUE MANTENIENDO..." },
    EXHALE: { duration: 4000, instruction: "SUELTA PARA EXHALAR..." },
    WAIT:   { duration: 1000, instruction: "..." }
};
const BREATHS_TO_WIN = 3;
const FAILS_TO_LOSE = 2;
let lastFrameTime = 0;
let isHoldingClick = false;

function startBreathingMinigame() {
    hideModal(dom.inventoryModal);
    showModal(dom.minigameModal);
    
    minigame = {
        isActive: true,
        phase: 'tutorial',
        timer: 0,
        breaths: 0,
        failures: 0,
        loop: null
    };
    
    isHoldingClick = false;
    
    // Mostrar tutorial, ocultar juego
    dom.minigameTutorial.classList.remove('hidden');
    dom.minigameContent.classList.add('hidden');
    
    // Listeners de input
    dom.minigameModal.onmousedown = () => { isHoldingClick = true; };
    dom.minigameModal.onmouseup = () => { isHoldingClick = false; };
    dom.minigameModal.ontouchstart = (e) => { e.preventDefault(); isHoldingClick = true; };
    dom.minigameModal.ontouchend = (e) => { e.preventDefault(); isHoldingClick = false; };

    // Botón para empezar
    dom.minigameStartBtn.onclick = () => {
        dom.minigameTutorial.classList.add('hidden');
        dom.minigameContent.classList.remove('hidden');
        setBreathPhase('INHALE');
        lastFrameTime = performance.now();
        minigame.loop = requestAnimationFrame(breathingGameLoop);
    };

    // Resetear UI
    dom.breathCount.textContent = "0";
    dom.breathFails.textContent = "0";
}

function setBreathPhase(newPhase) {
    minigame.phase = newPhase;
    minigame.timer = BREATH_PHASES[newPhase].duration;
    dom.minigameInstructions.textContent = BREATH_PHASES[newPhase].instruction;
    
    dom.breathingCircle.className = 'breathing-circle'; // Reset
    
    if (newPhase === 'INHALE') {
        dom.breathingCircle.classList.add('inhale');
    } else if (newPhase === 'EXHALE') {
        dom.breathingCircle.classList.add('exhale');
    } else if (newPhase === 'HOLD') {
        dom.breathingCircle.classList.add('hold');
    }
}

function breathingGameLoop(now) {
    if (!minigame.isActive) return;

    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;
    minigame.timer -= deltaTime;
    
    const { phase, timer } = minigame;
    
    // Mostrar timer
    dom.minigameTimer.textContent = (timer / 1000).toFixed(1);

    // Lógica de fallo
    if (phase === 'INHALE' && !isHoldingClick) {
        failBreath("¡Soltaste demasiado pronto!");
    } else if (phase === 'HOLD' && !isHoldingClick) {
        failBreath("¡Debías seguir manteniendo!");
    } else if (phase === 'EXHALE' && isHoldingClick) {
        failBreath("¡Debías soltar!");
    }

    // Transición de fases
    if (timer <= 0) {
        switch (phase) {
            case 'INHALE':
                setBreathPhase('HOLD');
                break;
            case 'HOLD':
                setBreathPhase('EXHALE');
                break;
            case 'EXHALE':
                succeedBreath();
                break;
            case 'WAIT':
                setBreathPhase('INHALE');
                break;
        }
    }
    
    if (minigame.isActive) {
        minigame.loop = requestAnimationFrame(breathingGameLoop);
    }
}

function failBreath(reason) {
    if (!minigame.isActive) return;
    
    playAudio('estatica', 1);
    addNotification(reason, 'danger');
    minigame.failures++;
    dom.breathFails.textContent = minigame.failures;
    
    if (minigame.failures >= FAILS_TO_LOSE) {
        endBreathingMinigame(false); // Fracaso
    } else {
        // Reiniciar ciclo
        setBreathPhase('WAIT');
    }
}

function succeedBreath() {
    if (!minigame.isActive) return;

    minigame.breaths++;
    dom.breathCount.textContent = minigame.breaths;
    
    if (minigame.breaths >= BREATHS_TO_WIN) {
        endBreathingMinigame(true); // Éxito
    } else {
        // Iniciar siguiente respiración
        setBreathPhase('WAIT');
    }
}

function endBreathingMinigame(success, manualClose = false) {
    if (!minigame.isActive) return;
    
    minigame.isActive = false;
    cancelAnimationFrame(minigame.loop);
    
    // Limpiar listeners
    dom.minigameModal.onmousedown = null;
    dom.minigameModal.onmouseup = null;
    dom.minigameModal.ontouchstart = null;
    dom.minigameModal.ontouchend = null;
    dom.minigameStartBtn.onclick = null;
    
    if (!manualClose) {
        hideModal(dom.minigameModal);
    }
    
    if (success) {
        addNotification("Respiras profundamente... El pánico retrocede.", "item");
        updatePlayerState('fear', -25); // Recompensa aumentada
    } else {
        addNotification("¡No puedes! ¡No puedes calmarte! El oso emite una leve estática...", "danger");
        updatePlayerState('fear', 10);
        playAudio('estatica', 3); // Reproduce 3s de estática
    }
}