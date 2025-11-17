/* * Motor.js
 * El motor principal del juego.
 * Maneja la UI, el estado, el inventario, el guardado y los eventos.
 */

import { getTheme, THEME_PALETTES } from '../../settings-manager.js';

// --- CONSTANTES ---
const TYPING_SPEED_MS = 25;
const SAVE_KEY = 'la-transmision-savegame';

// --- ESTADO DEL JUEGO ---
let GAME_STATE = {
    playerName: "Tú", // Valor por defecto
    currentNight: 1,
    player: { health: 100, hunger: 100, thirst: 100, fear: 0 },
    rulo: { health: 100, hunger: 100, thirst: 100, fear: 0, energy: 0, hasFlashlight: false },
    inventory: { consumables: [], keyItems: [], notes: [], minigames: [] },
    flags: {},
    currentLocation: "Habitación 1204"
};

// --- REFERENCIAS AL DOM ---
let dom = {};
let activeModal = null;

// --- FUNCIONES DE INICIALIZACIÓN ---

export function init() {
    loadGame(); 

    dom = {
        gameContainer: document.getElementById('game-container'),
        // Overlays
        nameOverlay: document.getElementById('name-input-overlay'),
        nameInput: document.getElementById('player-name-input'),
        nameConfirmBtn: document.getElementById('confirm-name-btn'),
        introOverlay: document.getElementById('intro-overlay'),
        
        // Paneles
        dialogueWindow: document.getElementById('dialogue-window'),
        choiceWindow: document.getElementById('choice-window'),
        notificationPanel: document.getElementById('notification-panel'),
        fearBarFill: document.getElementById('fear-bar-fill'),
        fearValue: document.getElementById('fear-value'), // NUEVA REFERENCIA
        locationBar: document.getElementById('current-location'),
        
        // Modales
        modals: document.querySelectorAll('.modal'),
        inventoryModal: document.getElementById('inventory-modal'),
        statusModal: document.getElementById('status-modal'),
        noteReaderModal: document.getElementById('note-reader-modal'),
        
        // Botones de UI
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
        
        // Stats
        playerStats: {
            name: document.getElementById('player-stats-name'),
            health: document.getElementById('player-health'),
            healthBar: document.getElementById('player-health-bar'),
            hunger: document.getElementById('player-hunger'),
            hungerBar: document.getElementById('player-hunger-bar'),
            thirst: document.getElementById('player-thirst'),
            thirstBar: document.getElementById('player-thirst-bar'),
            condition: document.getElementById('player-condition')
        },
        ruloStats: {
            display: document.getElementById('rulo-stats-display'),
            health: document.getElementById('rulo-health'),
            healthBar: document.getElementById('rulo-health-bar'),
            hunger: document.getElementById('rulo-hunger'),
            hungerBar: document.getElementById('rulo-hunger-bar'),
            thirst: document.getElementById('rulo-thirst'),
            thirstBar: document.getElementById('rulo-thirst-bar'),
            energy: document.getElementById('rulo-energy'),
            energyBar: document.getElementById('rulo-energy-bar'),
            condition: document.getElementById('rulo-condition')
        }
    };

    applyTheme(getTheme() || 'verde-crt');
    setupModalListeners();
    setupInventoryTabListeners();
    setupGlobalKeyListener();
    updateAllUI();
}

/** Configura los listeners para todos los modales y atajos */
function setupModalListeners() {
    dom.inventoryBtn.addEventListener('click', () => showModal(dom.inventoryModal));
    dom.playerStatusBtn.addEventListener('click', () => showModal(dom.statusModal));
    dom.ruloStatusBtn.addEventListener('click', () => showModal(dom.statusModal));

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal(document.getElementById(btn.getAttribute('data-modal-id')));
        });
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
                hideModal(activeModal);
            } else {
                window.location.href = '../../Inicio.html';
            }
        }
        
        if (dom.nameOverlay.style.display !== 'none') return;

        if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            activeModal ? hideModal(activeModal) : showModal(dom.inventoryModal);
        }
        
        if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            activeModal ? hideModal(activeModal) : showModal(dom.statusModal);
        }
    });
}


// --- FUNCIONES PÚBLICAS DEL MOTOR (Exportadas) ---

/** Muestra el overlay de "Insertar Nombre" */
export function promptForName(onConfirm) {
    dom.nameOverlay.style.display = 'flex';
    dom.nameOverlay.classList.remove('fade-out');
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
    dom.introOverlay.classList.remove('hidden', 'glitch-out', 'fade-out');
}

/** Oculta el overlay de intro con efecto glitch */
export function hideIntroOverlay() {
    dom.introOverlay.classList.add('glitch-out');
    // Ocultar completamente después de la animación
    setTimeout(() => {
        dom.introOverlay.classList.add('hidden');
    }, 1000); // Coincide con la duración de la animación
}

/** Muestra un texto con efecto "typing" */
export async function addDialogue(text, speaker = '') {
    const p = document.createElement('p');
    
    if (speaker) {
        const span = document.createElement('span');
        span.className = 'dialogue-speaker';
        
        if (speaker === 'Tú') {
            span.textContent = `${GAME_STATE.playerName}:`;
        } else if (speaker === 'Sistema' || speaker === 'Sonido') {
            span.className = 'dialogue-system';
            span.textContent = text;
            p.appendChild(span);
            dom.dialogueWindow.appendChild(p);
            dom.dialogueWindow.scrollTop = dom.dialogueWindow.scrollHeight;
            return;
        } else {
            span.textContent = `${speaker}:`;
        }
        p.appendChild(span);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'typing-cursor';
    p.appendChild(textSpan);
    dom.dialogueWindow.appendChild(p);

    for (let i = 0; i < text.length; i++) {
        textSpan.textContent += text[i];
        dom.dialogueWindow.scrollTop = dom.dialogueWindow.scrollHeight;
        await wait(TYPING_SPEED_MS);
    }
    
    textSpan.classList.remove('typing-cursor');
}

/** Muestra una notificación en el panel derecho */
export function addNotification(text, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = text;
    dom.notificationPanel.appendChild(notif);
    dom.notificationPanel.scrollTop = dom.notificationPanel.scrollHeight; // Auto-scroll
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
        clearChoices();
        callback();
    };
    dom.choiceWindow.appendChild(a);
}

/** Muestra el lector de notas */
export function showNoteReader(title, content) {
    dom.noteTitle.textContent = title;
    dom.noteContent.textContent = content;
    showModal(dom.noteReaderModal);
}

// --- Gestión de Estado y Datos ---

export function setPlayerName(name) {
    GAME_STATE.playerName = name;
    GAME_STATE.flags.isNewPlayer = false; // Marcar que ya no es nuevo
    dom.playerStats.name.textContent = name;
    saveGame();
}

export function getPlayerName() {
    return GAME_STATE.playerName;
}

export function getNightNumber() {
    return GAME_STATE.currentNight;
}

/** Comprueba si es un jugador nuevo */
export function isNewPlayer() {
    // Si la bandera no existe o el nombre es el default, es nuevo
    return !GAME_STATE.flags.isNewPlayer || GAME_STATE.playerName === "Tú";
}

/**
 * Actualiza una estadística del jugador.
 * @param {'health' | 'hunger' | 'thirst' | 'fear'} stat - La estadística a cambiar.
 * @param {number} value - El valor.
 * @param {boolean} [isAbsolute=false] - Si es true, ESTABLECE el valor. Si es false, AÑADE el valor.
 */
export function updatePlayerState(stat, value, isAbsolute = false) {
    let base = isAbsolute ? 0 : GAME_STATE.player[stat];
    GAME_STATE.player[stat] = Math.max(0, Math.min(100, base + value));
    
    const val = GAME_STATE.player[stat];
    if (stat === 'fear') {
        dom.fearBarFill.style.width = `${val}%`;
        dom.fearValue.textContent = val; // ACTUALIZAR CONTADOR
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
    if (stat === 'energy' || stat === 'health' || stat === 'hunger' || stat === 'thirst') {
        dom.ruloStats[stat].textContent = `${val}/100`;
        dom.ruloStats[`${stat}Bar`].style.width = `${val}%`;
    }
    updateCondition('rulo');
    saveGame();
}

/** Muestra las estadísticas de Rulo en la UI */
export function showRuloStats() {
    dom.ruloStatusBtn.classList.remove('hidden');
    dom.ruloStats.display.classList.remove('hidden');
}

/** Añade un item al inventario y guarda */
export function addItem(tab, item) {
    GAME_STATE.inventory[tab].push(item);
    addNotification(`Objeto añadido: ${item.name}`, 'item');
    renderInventory();
    saveGame();
}

/** Elimina un item del inventario y guarda */
export function removeItem(tab, itemId) {
    GAME_STATE.inventory[tab] = GAME_STATE.inventory[tab].filter(i => i.id !== itemId);
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
        GAME_STATE = JSON.parse(savedData);
    }
}

/** Actualiza TODA la UI desde GAME_STATE */
function updateAllUI() {
    dom.playerStats.name.textContent = GAME_STATE.playerName;
    updatePlayerState('health', 0);
    updatePlayerState('hunger', 0);
    updatePlayerState('thirst', 0);
    updatePlayerState('fear', 0);

    if (GAME_STATE.rulo.health < 100 || GAME_STATE.rulo.hasFlashlight) {
        showRuloStats();
        updateRuloState('health', 0);
        updateRuloState('hunger', 0);
        updateRuloState('thirst', 0);
        updateRuloState('energy', 0);
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

function updateCondition(character) {
    const state = GAME_STATE[character];
    const ui = (character === 'player') ? dom.playerStats : dom.ruloStats;
    let condition = "Estable";
    let cssClass = "condition-stable";

    if (state.fear > 80 || state.health < 15) {
        condition = "Crítico"; cssClass = "condition-critical";
    } else if (state.fear > 60) {
        condition = "Aterrado"; cssClass = "condition-terrified";
    } else if (state.health < 40) {
        condition = "Herido"; cssClass = "condition-wounded";
    } else if (state.fear > 30) {
        condition = "Nervioso"; cssClass = "condition-nervous";
    }

    ui.condition.textContent = condition;
    ui.condition.className = cssClass;
}

function renderInventory() {
    dom.tabs.consumables.innerHTML = '';
    dom.tabs.keyItems.innerHTML = '';
    dom.tabs.notes.innerHTML = '';
    dom.tabs.minigames.innerHTML = '';

    GAME_STATE.inventory.consumables.forEach(item => {
        dom.tabs.consumables.innerHTML += `<div class="inventory-item"><span>${item.name} (x${item.stack || 1})</span><button class="ui-btn">Usar</button></div>`;
    });
    GAME_STATE.inventory.keyItems.forEach(item => {
        dom.tabs.keyItems.innerHTML += `<div class="inventory-item"><span>${item.name}</span></div>`;
    });
    GAME_STATE.inventory.notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'inventory-item note-item';
        div.innerHTML = `<span>${note.name}</span>`;
        div.onclick = () => showNoteReader(note.name, note.content);
        dom.tabs.notes.appendChild(div);
    });
    GAME_STATE.inventory.minigames.forEach(item => {
        dom.tabs.minigames.innerHTML += `<div class="inventory-item"><span>${item.name}</span></div>`;
    });
}