/* * Motor.js
 * El motor principal del juego.
 * Maneja la UI, el estado, el inventario, el guardado y los eventos.
 */

// IMPORTAMOS LA DIFICULTAD
import { getTheme, THEME_PALETTES, getDifficulty } from '../../settings-manager.js';

// --- CONSTANTES ---
const TYPING_SPEED_MS = 30;
const SAVE_KEY = 'la-transmision-savegame';
const GAME_LOOP_INTERVAL_MS = 5000; // Loop principal cada 5 segundos

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
    breaths: 0,
    isHolding: false
};

// --- CACHÉ DE AUDIO ---
let audioCache = {
    // ¡CORRECCIÓN DE RUTA! (Debe subir 2 niveles desde Habitacion/ para llegar a Transmicion/)
    estatica: new Audio('../../Assets/Audios/Estatica.mp3')
};


// --- FUNCIONES DE INICIALIZACIÓN ---

export function init() {
    loadGame();
    loadDifficulty(); // Carga la dificultad

    dom = {
        gameContainer: document.getElementById('game-container'),
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
        breathingCircle: document.getElementById('breathing-circle'),
        breathCount: document.getElementById('breath-count'),
        minigameInstructions: document.getElementById('minigame-instructions'),

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
            fear: document.getElementById('rulo-fear'), // NUEVO
            fearBar: document.getElementById('rulo-fear-bar'), // NUEVO
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
    
    startGameLoop(); // Inicia el loop principal del juego
}

/** Carga la dificultad desde el settings-manager */
function loadDifficulty() {
    GAME_STATE.difficulty = getDifficulty() || 'normal';
    console.log('Dificultad cargada:', GAME_STATE.difficulty);
}

/** Configura los listeners para todos los modales y atajos */
function setupModalListeners() {
    // ... (idéntico)
    // Botón de Inventario
    dom.inventoryBtn.addEventListener('click', () => showModal(dom.inventoryModal));
    
    // BOTONES DE ESTADO (ACTUALIZADO)
    dom.playerStatusBtn.addEventListener('click', () => {
        dom.playerStats.display.classList.remove('hidden');
        dom.ruloStats.display.classList.add('hidden');
        showModal(dom.statusModal);
    });
    dom.ruloStatusBtn.addEventListener('click', () => {
        dom.playerStats.display.classList.add('hidden');
        dom.ruloStats.display.classList.remove('hidden');
        showModal(dom.statusModal);
    });

    // Botones de Cierre de Modal
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal(document.getElementById(btn.getAttribute('data-modal-id')));
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
    // ... (idéntico, excepto por el skip)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            if (activeModal) {
                hideModal(activeModal);
            } else {
                dom.menuBtn.click(); // Simula clic en el botón de menú
            }
        }
        
        if (dom.nameOverlay.style.display !== 'none') return;
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
                dom.playerStatusBtn.click(); // Abre el estado del JUGADOR por defecto
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
        // 1. Lógica de la Linterna
        if (GAME_STATE.rulo.hasFlashlight && GAME_STATE.rulo.energy > 0) {
            // Rulo tiene la linterna, drenaje normal
            // (La dificultad podría afectar 'drainRate')
            let drainRate = 1; 
            updateRuloState('energy', -drainRate);
            
            if (GAME_STATE.rulo.energy === 0) {
                addNotification("¡La batería de la linterna se agotó!", "danger");
            }
        } 
        // Si el jugador tuviera la linterna:
        // else if (GAME_STATE.player.hasFlashlight && GAME_STATE.player.energy > 0) {
        //     let drainRate = 3; // Drenaje rápido
        //     updatePlayerState('energy', -drainRate);
        // }
        
        // 2. Lógica de Oscuridad (Miedo Progresivo)
        if (GAME_STATE.rulo.energy <= 0 && GAME_STATE.rulo.hasFlashlight) { // Solo si ya tuvo linterna
            // Está oscuro
            addNotification("Está oscuro... demasiado oscuro...", "danger");
            updatePlayerState('fear', 1);
            updateRuloState('fear', 1);
        }

    }, GAME_LOOP_INTERVAL_MS);
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

/** Muestra un texto con efecto "typing" (AHORA SE PUEDE OMITIR) */
export async function addDialogue(text, speaker = '') {
    // Si ya se está escribiendo, no hacer nada (previene doble clic)
    if (isTyping) return; 

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

    // Lógica de "Typing"
    isTyping = true;
    forceSkipTyping = false;
    
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

/** Muestra el lector de notas */
export function showNoteReader(title, content) {
    dom.noteTitle.textContent = title;
    dom.noteContent.textContent = content;
    showModal(dom.noteReaderModal);
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
export function isNewPlayer() { return !GAME_STATE.flags.isNewPlayer || GAME_STATE.playerName === "Tú"; }

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

/** Muestra las estadísticas de Rulo en la UI */
export function showRuloStats() {
    dom.ruloStatusBtn.classList.remove('hidden');
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
    }
}

/** Actualiza TODA la UI desde GAME_STATE */
function updateAllUI() {
    dom.playerStats.name.textContent = GAME_STATE.playerName;
    updatePlayerState('health', 0);
    updatePlayerState('hunger', 0);
    updatePlayerState('thirst', 0);
    updatePlayerState('fear', 0);

    // Ocultar Rulo por defecto
    dom.ruloStatusBtn.classList.add('hidden');
    // dom.ruloStats.display.classList.add('hidden'); // No ocultar el display, solo el botón
    
    // Mostrar Rulo si es relevante
    if (GAME_STATE.rulo.health < 100 || GAME_STATE.rulo.hasFlashlight || GAME_STATE.currentNight > 0) {
        showRuloStats();
        updateRuloState('health', 0);
        updateRuloState('hunger', 0);
        updateRuloState('thirst', 0);
        updateRuloState('fear', 0);
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
    
    // Items Clave
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

/** Comprueba si el jugador tiene un item (por id) */
function playerHasItem(itemId) {
    return GAME_STATE.inventory.consumables.some(i => i.id === itemId);
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
        if (GAME_STATE.player.fear < 60) {
            hideModal(dom.inventoryModal);
            addNotification("No sientes la necesidad de usarlo ahora. Tu miedo no es tan alto.");
            return;
        }
        // Iniciar minijuego
        startBreathingMinigame();
    }
}

/** Lógica del Minijuego de Respiración */
function startBreathingMinigame() {
    hideModal(dom.inventoryModal);
    showModal(dom.minigameModal);
    
    minigame = {
        isActive: true,
        breaths: 0,
        isHolding: false
    };
    
    dom.breathCount.textContent = "0";
    dom.breathingCircle.style.animation = 'none'; // Reset anim
    void dom.breathingCircle.offsetWidth; // Trigger reflow
    dom.breathingCircle.style.animation = 'breath 8s ease-in-out infinite';

    dom.minigameInstructions.textContent = "Mantén presionado para INHALAR... Suelta para EXHALAR.";

    // Listeners
    dom.breathingCircle.onmousedown = () => { minigame.isHolding = true; };
    document.onmouseup = () => { minigame.isHolding = false; };
    
    // El "éxito" se basa en si mantienes presionado durante la inhalación
    // (mitad de la animación) y sueltas durante la exhalación (otra mitad)
    // Esta es una simulación simplificada
    
    // Simulación simple: Clic en el momento correcto
    dom.breathingCircle.onclick = () => {
        if (!minigame.isActive) return;
        
        // Comprobar el estado de la animación (simplificado)
        // Pedimos 3 "clics" exitosos
        minigame.breaths++;
        dom.breathCount.textContent = minigame.breaths;
        
        if (minigame.breaths >= 3) {
            endBreathingMinigame(true); // Éxito
        }
    };
    
    // Timeout por si el jugador no hace nada
    setTimeout(() => {
        if (minigame.isActive && minigame.breaths < 3) {
            endBreathingMinigame(false); // Fracaso
        }
    }, 15000); // 15 segundos para completarlo
}

function endBreathingMinigame(success) {
    if (!minigame.isActive) return;
    
    minigame.isActive = false;
    hideModal(dom.minigameModal);
    
    // Limpiar listeners
    dom.breathingCircle.onmousedown = null;
    document.onmouseup = null;
    dom.breathingCircle.onclick = null;
    
    if (success) {
        addNotification("Respiras profundamente... El pánico retrocede.", "item");
        updatePlayerState('fear', -20);
    } else {
        addNotification("¡No puedes! ¡No puedes calmarte! El oso emite una leve estática...", "danger");
        updatePlayerState('fear', 10);
        playAudio('estatica', 3); // Reproduce 3s de estática
    }
}

// Actualizado... Más o menos