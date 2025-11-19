/* * Motor.js
 * El motor principal del juego.
 * Maneja la UI, el estado, el inventario, el guardado y los eventos.
 * Inicio\Jugar\Habitacion\Motor.js
 */

// IMPORTAMOS LA DIFICULTAD
import { getTheme, setTheme, THEME_PALETTES, getDifficulty } from '../../settings-manager.js';

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
            hunger: 1,      // Drenaje de hambre
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
    },

    // Cooldowns en milisegundos
    COOLDOWNS: {
        OSO_COOLDOWN: {
            'easy': 180000,      // 3 minutos
            'normal': 300000,    // 5 minutos
            'hard': 420000,      // 7 minutos
            'nightmare': 600000  // 10 minutos
        },
        LOOT_COOLDOWN: {
            'easy': 300000,      // 5 minutos
            'normal': 600000,    // 10 minutos
            'hard': 900000,      // 15 minutos
            'nightmare': 1200000 // 20 minutos
        }
    }
};

// --- ESTADO DEL JUEGO ---
let GAME_STATE = {
    playerName: "Tú",
    companionName: "Rulo", // Nuevo campo
    currentNight: 1,
    difficulty: "normal", // Se cargará al iniciar
    player: { health: 100, hunger: 100, thirst: 100, fear: 0 },
    rulo: { health: 100, hunger: 100, thirst: 100, fear: 0, energy: 0, hasFlashlight: false },
    inventory: { consumables: [], keyItems: [], notes: [], minigames: [] },
    flags: {
        tranquiOsoCooldown: 0, // Almacena el timestamp (Date.now() + ms)
        wardrobe_cooldown: 0,
        lastStarvationDamage: 0 // Tracker para daño por hambre
    }, // NUEVO: Cooldown para resetear fallos al cerrar
    tranquiOsoFailResetCooldown: 0,
    currentLocation: "Habitación 1204"
};

// --- REFERENCIAS AL DOM ---
let dom = {};
let activeModal = null;
 
// --- UTILIDAD DE SEGURIDAD (Evita bloqueos si faltan elementos) ---
const safeAddListener = (element, event, handler) => {
    if (element) {
        element.addEventListener(event, handler);
    }
};


// --- ESTADO DEL TYPING ---
let isTyping = false;
let forceSkipTyping = false;
// --- NUEVO: Estado para Omitir Diálogo de Sistema ---
let isWaitingOnSystem = false;
let systemWaitResolver = null;
// --- NUEVO: Variables de Pausa ---
let isGamePaused = false;
let pauseStartTime = 0;
let pausedAudioState = []; // Para guardar qué audios estaban sonando

// --- AUDIO MANAGER ---
let audioContext = {
    bgm: new Audio('../../Assets/Audios/Lluvia.mp3'),
    heartbeat: new Audio('../../Assets/Audios/Corazon.mp3'),
    typingP1: new Audio('../../Assets/Audios/Dialogo 1.mp3'),
    typingP2: new Audio('../../Assets/Audios/Dialogo 2.mp3'),
    sfx: {} // Cache dinámico
};
// Configuración inicial de loops
audioContext.bgm.loop = true;
audioContext.bgm.volume = 0.3; // Volumen ajustable
audioContext.heartbeat.loop = true;
audioContext.heartbeat.volume = 0; // Empieza mudo

// Cache de SFX (precarga básica)
const SFX_LIST = ['Golpe.mp3', 'Arrugar papel.mp3', 'Distorsion.mp3', 'Estatica.mp3'];
SFX_LIST.forEach(file => {
    audioContext.sfx[file] = new Audio(`../../Assets/Audios/${file}`);
});

// --- ESTADO DEL MINIJUEGO ---
let minigame = {
    isActive: false,
    phase: 'tutorial', // 'tutorial', 'inhale', 'hold', 'exhale', 'wait'
    timer: 0,
    breaths: 0,
    failures: 0,
    loop: null // Para guardar el setInterval/requestAnimationFrame
};

// --- RESOLVERS DE PROMESAS ---
let itemUseResolvers = {}; // Para esperar a que se use un item

// --- FUNCIONES DE INICIALIZACIÓN ---

export function init() {
    try {
        // --- MEDIDA DE SEGURIDAD: Verificación de Integridad ---
        // Verificamos que las funciones críticas existan antes de continuar.
        if (typeof saveGame !== 'function') console.error("ERROR CRÍTICO: 'saveGame' no está definida.");
        if (typeof renderInventory !== 'function') console.error("ERROR CRÍTICO: 'renderInventory' no está definida.");

        loadGame();
        loadDifficulty();
        
        // NUEVO: Iniciar el "latido" de la UI (para actualizar cooldowns en vivo)
        setInterval(updateCooldownUI, 1000);
        
        // Iniciar audio de fondo si ya estamos en juego
        if (!GAME_STATE.flags.isNewPlayer) {
             audioContext.bgm.play().catch(e => console.log("Interacción requerida para audio"));
        }
    } catch (error) {
        console.error("Error fatal durante la inicialización del juego:", error);
        addNotification("Error de Sistema: Reinicia el juego.", "danger");
        return;
    }

    dom = {
        gameContainer: document.getElementById('game-container'),
        vignetteOverlay: document.getElementById('vignette-overlay'), // Para el miedo
        // Overlays
        loadingOverlay: document.getElementById('loading-overlay'),
        nameOverlay: document.getElementById('name-input-overlay'),
        imageViewer: document.getElementById('image-viewer'),
        gameImage: document.getElementById('game-image'),
        damageOverlay: document.getElementById('damage-overlay'),
        
        nameInput: document.getElementById('player-name-input'),
        companionInput: document.getElementById('companion-name-input'), // NUEVO
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
        pauseModal: document.getElementById('pause-modal'),      // NUEVO
        settingsModal: document.getElementById('settings-modal'),    // NUEVO
        inventoryModal: document.getElementById('inventory-modal'),
        // CORRECCIÓN: Apuntar al ID unificado
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
        // Contenido Menú Pausa/Ajustes
        pauseResumeBtn: document.getElementById('pause-resume-btn'),
        pauseSettingsBtn: document.getElementById('pause-settings-btn'),
        pauseMenuBtn: document.getElementById('pause-menu-btn'),
        gameThemeSelect: document.getElementById('game-theme-select'),
        settingsBackBtn: document.getElementById('settings-back-btn'),


        // Contenido Lector de Notas
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

    // CORRECCIÓN: Aplicar tema al iniciar
    applyTheme(getTheme());
    // Sincronizar el nuevo desplegable de ajustes
    populateThemeSelect();

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

// CORRECCIÓN: Renombrada para evitar colisión con la de settings-manager
export function getGameDifficulty() {
    return GAME_STATE.difficulty; 
}

/** NUEVO: Popula el desplegable de temas */
function populateThemeSelect() {
    dom.gameThemeSelect.innerHTML = ''; // Limpiar
    for (const key in THEME_PALETTES) {
        const option = document.createElement('option');
        option.value = key;
        // Capitalizar y reemplazar guiones
        option.textContent = key.replace(/-/g, ' ').toUpperCase();
        dom.gameThemeSelect.appendChild(option);
    }
    dom.gameThemeSelect.value = getTheme();
}


/** Configura los listeners para todos los modales y atajos */
function setupModalListeners() {
    // Botón de Inventario
    safeAddListener(dom.inventoryBtn, 'click', () => showModal(dom.inventoryModal));
    
    // BOTONES DE ESTADO
    safeAddListener(dom.playerStatusBtn, 'click', () => {
        // Muestra jugador, oculta rulo
        if (dom.playerStats && dom.playerStats.display) dom.playerStats.display.classList.remove('hidden');
        if (dom.ruloStats && dom.ruloStats.display) dom.ruloStats.display.classList.add('hidden');
        showModal(dom.statusModal);
    });
    
    safeAddListener(dom.ruloStatusBtn, 'click', () => {
        // Muestra rulo, oculta jugador
        if (dom.playerStats && dom.playerStats.display) dom.playerStats.display.classList.add('hidden');
        if (dom.ruloStats && dom.ruloStats.display) dom.ruloStats.display.classList.remove('hidden');
        showModal(dom.statusModal);
    });

    // --- Listeners Menú Pausa ---
    safeAddListener(dom.pauseResumeBtn, 'click', () => togglePause(false));
    
    safeAddListener(dom.pauseMenuBtn, 'click', () => {
        // Forzar guardado antes de salir
        saveGame();
        window.location.href = '../../Inicio.html';
    });
    safeAddListener(dom.pauseSettingsBtn, 'click', () => {
        hideModal(dom.pauseModal);
        showModal(dom.settingsModal);
    });
    
    // --- Listeners Menú Ajustes ---
    safeAddListener(dom.settingsBackBtn, 'click', () => {
        hideModal(dom.settingsModal);
        showModal(dom.pauseModal);
    });
    safeAddListener(dom.gameThemeSelect, 'change', (e) => applyTheme(e.target.value));

    // Botones de Cierre de Modal
    document.querySelectorAll('.close-btn').forEach(btn => {
        safeAddListener(btn, 'click', () => {
            const modalId = btn.getAttribute('data-modal-id');
            const modalToHide = document.getElementById(modalId);
            
            if (!modalToHide) return;
            
            // Si el modal tiene una promesa pendiente (como el lector de notas), resuélvela
            if (modalToHide.resolvePromise) {
                modalToHide.resolvePromise();
                modalToHide.resolvePromise = null; // Limpiar
            }
            
            // Si cerramos el minijuego, forzar fracaso
            if (modalToHide === dom.minigameModal && minigame.isActive) {
                // CORRECCIÓN: Llamar con (false, true) para indicar cierre manual
                // sin penalización.
                endBreathingMinigame(false, true); // Cierre manual
            }
            
            hideModal(modalToHide);
        });
    });

    // Botón de Menú (☰)
    safeAddListener(dom.menuBtn, 'click', () => {
        // Abrir el modal de pausa, igual que ESC
        if (activeModal === dom.pauseModal) {
            hideModal(dom.pauseModal);
        } else if (!activeModal) { 
            togglePause(true); // Usar togglePause en lugar de showModal directo
        }
    });
}

/** Configura listeners para las pestañas del inventario */
function setupInventoryTabListeners() {
    if (dom.tabLinks) {
        dom.tabLinks.forEach(link => {
            safeAddListener(link, 'click', () => {
                const tabId = link.getAttribute('data-tab');
                const parentModal = link.closest('.modal-body');
                
                if (parentModal) {
                    parentModal.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                    parentModal.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
                }

                const targetTab = document.getElementById(tabId);
                if (targetTab) targetTab.classList.add('active');
                link.classList.add('active');
            });
        });
    }
}

/** Configura el listener global de teclado (ESC, I, E) */
function setupGlobalKeyListener() {
    // document siempre existe, safeAddListener no es estrictamente necesario pero mantiene consistencia
    document.addEventListener('keydown', (e) => {
        // --- Lógica de ESCAPE (Pausa) MEJORADA ---
        if (e.key === 'Escape') {
            e.preventDefault();

            if (minigame.isActive) {
                // Si está en minijuego, ESC sale del minijuego (como el botón Salir)
                if (dom.minigameModal.querySelector('.close-btn')) dom.minigameModal.querySelector('.close-btn').click();
            } else if (activeModal === dom.settingsModal) {
                dom.settingsBackBtn.click(); // Volver a Pausa
            } else if (activeModal === dom.pauseModal) {
                togglePause(false); // Reanudar
            } else if (activeModal) {
                // Si hay CUALQUIER otro modal abierto (inventario, notas), ciérralo.
                hideModal(activeModal);
            } else {
                // Si no hay ningún modal, abrir Pausa
                togglePause(true); // Pausar
            }
            return; // No procesar otras teclas si fue ESC
        }
        
        // No permitir atajos si el menú de pausa está activo
        if (activeModal === dom.pauseModal || activeModal === dom.settingsModal) return; 
        
        // CORREGIDO: Comprobar si el overlay de nombre está activo
        if (!dom.nameOverlay.classList.contains('hidden')) return;
        if (minigame.isActive) return; // No abrir menús durante minijuego

        if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            activeModal === dom.inventoryModal ? hideModal(activeModal) : showModal(dom.inventoryModal);
        }
        
        // NUEVO: Atajo 'T' para Tranqui-Oso
        if (e.key === 't' || e.key === 'T') {
            e.preventDefault();
            if (activeModal) return; // No si hay otro modal abierto
            
            const oso = GAME_STATE.inventory.minigames.find(i => i.id === 'tranqui_oso');
            if (oso) {
                startMinigame(oso);
            } else {
                addNotification("No tienes el Tranqui-Oso.", "danger");
            }
        }
        
        if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            if (activeModal === dom.statusModal) {
                hideModal(activeModal);
            } else {
                // Abre el estado del jugador por defecto
                dom.playerStatusBtn.click(); 
            }
        }
    });

    // Listener para OMITIR DIÁLOGO - CORREGIDO
    safeAddListener(dom.gameContainer, 'click', skipTyping);
}


/** NUEVO: Gestión de Imágenes */
export function showImage(imageName) {
    return new Promise(resolve => {
        // Verificación de seguridad
        if (!dom.imageViewer || !dom.gameImage) {
            console.error("Error: Visor de imágenes no inicializado en DOM.");
            resolve(); 
            return;
        }

        dom.gameImage.src = `../../Assets/Imagenes/${imageName}`;
        dom.imageViewer.classList.remove('hidden');
        
        // Handler para cerrar al hacer clic
        const closeHandler = () => {
            dom.imageViewer.classList.add('hidden');
            dom.imageViewer.removeEventListener('click', closeHandler);
            dom.gameImage.src = ""; // Limpiar
            resolve();
        };
        
        // Pequeño delay para evitar clics accidentales inmediatos
        setTimeout(() => {
            dom.imageViewer.addEventListener('click', closeHandler);
        }, 500);
    });
}

/** NUEVO: Función Maestra de Pausa */
function togglePause(shouldPause) {
    if (shouldPause) {
        isGamePaused = true;
        pauseStartTime = Date.now();
        showModal(dom.pauseModal);
        // Detener loop del minijuego si estuviera activo (aunque ESC lo cierra, por seguridad)
        if (minigame.isActive) cancelAnimationFrame(minigame.loop);
        pauseAllAudio(); // NUEVO
    } else {
        // REANUDAR
        hideModal(dom.pauseModal);
        const pauseDuration = Date.now() - pauseStartTime;
        
        // --- AJUSTAR COOLDOWNS ---
        // Empujamos los tiempos objetivo hacia el futuro para compensar la pausa
        if (GAME_STATE.flags.tranquiOsoCooldown > 0) GAME_STATE.flags.tranquiOsoCooldown += pauseDuration;
        if (GAME_STATE.flags.wardrobe_cooldown > 0) GAME_STATE.flags.wardrobe_cooldown += pauseDuration;
        if (GAME_STATE.flags.tranquiOsoFailResetCooldown > 0) GAME_STATE.flags.tranquiOsoFailResetCooldown += pauseDuration;
        
        saveGame(); // Guardar los nuevos tiempos ajustados
        
        isGamePaused = false;
        // Si el minijuego estaba activo, habría que reiniciarlo, pero por diseño ESC lo cierra.
        // Si implementas pausa SIN cerrar minijuegos, aquí reiniciarías el loop.
        resumeAllAudio(); // NUEVO
    }
}

/** Inicia el loop principal para manejar drenajes de estado y eventos pasivos */
function startGameLoop() {
    setInterval(() => {
        if (isGamePaused) return; // <--- SI ESTÁ PAUSADO, NO HACER NADA

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

        // 4. Lógica de Cooldown de Fallos (Tranqui-Oso)
        if (GAME_STATE.flags.tranquiOsoFailResetCooldown > 0 && Date.now() > GAME_STATE.flags.tranquiOsoFailResetCooldown) {
            GAME_STATE.flags.tranquiOsoFails = 0;
            GAME_STATE.flags.tranquiOsoFailResetCooldown = 0;
            saveGame();
            addNotification("Tranqui-Oso se ha reiniciado.", "info");
        }

    }, GAME_SETTINGS.DRAIN_INTERVAL_MS);
}

/** Oculta la pantalla de carga al inicio del juego */
export function hideLoadingScreen() {
    if (dom && dom.loadingOverlay) {
        dom.loadingOverlay.classList.add('hidden');
    } else {
        // This can happen if called before init() completes, so we'll wait.
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('loading-overlay').classList.add('hidden');
        });
    }
}
/** Muestra el overlay de "Insertar Nombre" */
export function promptForName(onConfirm) {
    dom.nameOverlay.classList.remove('hidden', 'fade-out');
    dom.nameInput.focus();

    const confirmAction = () => {
        const name = dom.nameInput.value.trim();
        const compName = dom.companionInput.value.trim();
        
        // Validación: Jugador requerido
        if (!name) {
            dom.nameInput.classList.add('input-error');
            setTimeout(() => dom.nameInput.classList.remove('input-error'), 500);
            return;
        }

        if (name) {
            setPlayerName(name);
            setCompanionName(compName || "Rulo"); // Default Rulo
            dom.nameOverlay.classList.add('fade-out');
            setTimeout(() => dom.nameOverlay.classList.add('hidden'), 1500);
            
            // Iniciar Audio Ambiente
            audioContext.bgm.play().catch(e => console.error(e));
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
    
    // NUEVO: Omitir espera de diálogo de sistema
    if (isWaitingOnSystem && systemWaitResolver) {
        systemWaitResolver(); // Resuelve la promesa inmediatamente
        isWaitingOnSystem = false;
        systemWaitResolver = null;
    }
}

/** Muestra un texto con efecto "typing" (ACTUALIZADO) */
export async function addDialogue(text, speaker = '') {
    // --- CORRECCIÓN: COLA DE DIÁLOGOS ---
    // En lugar de cancelar si ya se escribe, esperamos a que termine el anterior.
    while (isTyping) {
        await wait(50);
    }
    // -------------------------------------

    // Pausar diálogos si hay menús abiertos
    while(activeModal || isGamePaused) {
        await wait(100);
    }

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
            
            // --- CORRECCIÓN: Hacer que 'Sistema' sea bloqueante (awaitable) ---
            //    para que los await en Noche1.js funcionen.
            // --- NUEVO: Cooldown Omitible ---
            isWaitingOnSystem = true;
            const waitPromise = new Promise(resolve => {
                systemWaitResolver = resolve;
                setTimeout(resolve, SYSTEM_DIALOGUE_COOLDOWN_MS);
            });
            await waitPromise;
            isWaitingOnSystem = false;
            systemWaitResolver = null;
            // --- Fin Cooldown Omitible ---

            return; // Retorna la promesa resuelta
        } else {
            // Es el compañero u otro
            span.textContent = `${speaker}`;
        }
        p.appendChild(span);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'typing-cursor';
    
    // --- Efecto Tembloroso (Si Rulo tiene mucho miedo) ---
    if (speaker === GAME_STATE.companionName && GAME_STATE.rulo.fear > 60) {
        textSpan.classList.add('shaky-text');
        // Durar solo unos segundos
        setTimeout(() => {
            if (textSpan) textSpan.classList.remove('shaky-text');
        }, 3000);
    }
    
    p.appendChild(textSpan);
    dom.dialogueWindow.appendChild(p);

    // Lógica de "Typing"
    isTyping = true;
    forceSkipTyping = false;
    let charCount = 0;
    
    // CORREGIDO: Añade los dos puntos y el espacio aquí
    const textToType = (speaker && speaker !== 'Sistema' && speaker !== 'Sonido') ? `: ${text}` : text;
    
    for (let i = 0; i < textToType.length; i++) {
        
        // Pausar typing si se abre menú
        while(activeModal || isGamePaused) {
            await wait(100);
        }

        if (forceSkipTyping) {
            break; // Salir del bucle
        }
        textSpan.textContent += textToType[i];
        dom.dialogueWindow.scrollTop = dom.dialogueWindow.scrollHeight;
        
        // --- Lógica de Sonido de Typing ---
        charCount++;
        if (charCount % 2 === 0 && !isGamePaused) {
             if (speaker === 'Tú') {
                 playTypingSound(audioContext.typingP1);
             } else {
                 playTypingSound(audioContext.typingP2);
             }
        }
        // ---------------------------------
        
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

/** Gestión de Nombre de Compañero */
export function setCompanionName(name) {
    GAME_STATE.companionName = name;
    saveGame();
}
export function getCompanionName() {
    return GAME_STATE.companionName || "Rulo";
}

/** Establece el nombre del jugador y lo guarda */
export function setPlayerName(name) {
    GAME_STATE.playerName = name;
    GAME_STATE.flags.isNewPlayer = false; // Marcar que ya no es nuevo
    dom.playerStats.name.textContent = name;
    saveGame();
}
export function getPlayerName() { return GAME_STATE.playerName; }

/** NUEVO: Devuelve el objeto de estado completo (Solo Lectura) */
export function getState() {
    return GAME_STATE;
}

export function setNightNumber(num) {
    GAME_STATE.currentNight = num;
    saveGame();
}
/** Establece el número de la noche */
export function getNightNumber() { return GAME_STATE.currentNight; }

/** CORREGIDO: Devuelve true si la flag 'isNewPlayer' no es explícitamente 'false' */
export function isNewPlayer() { 
    return GAME_STATE.flags.isNewPlayer !== false; 
}

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

/** NUEVO: Devuelve los objetos de configuración de cooldown */
export function getOsoCooldownRates() {
    return GAME_SETTINGS.COOLDOWNS.OSO_COOLDOWN;
}
export function getLootCooldownRates() {
    return GAME_SETTINGS.COOLDOWNS.LOOT_COOLDOWN;
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
    // NO mostrar el display aquí, solo el botón. El listener se encarga
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

export function saveGame() { // <-- AÑADIDO 'export'
    // console.log("Juego Guardado", GAME_STATE); // Descomentar para debug
    localStorage.setItem(SAVE_KEY, JSON.stringify(GAME_STATE));
}

/** CORREGIDO: Lógica de carga para 'isNewPlayer' */
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
        
        // CORRECCIÓN LÓGICA 'isNewPlayer'
        // 1. Cargar las flags guardadas
        GAME_STATE.flags = { ...GAME_STATE.flags, ...parsedData.flags };
        
        // 2. Si 'isNewPlayer' es explícitamente 'false' en el guardado, es 'false'.
        //    En CUALQUIER OTRO CASO (true, undefined, o sin objeto flags), es 'true'.
        if (parsedData.flags && parsedData.flags.isNewPlayer === false) {
            GAME_STATE.flags.isNewPlayer = false;
        } else {
            GAME_STATE.flags.isNewPlayer = true;
        }

    } else {
        // No hay datos guardados en absoluto.
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
    
    // --- MEDIDA DE SEGURIDAD: Ejecución Defensiva ---
    if (typeof renderInventory === 'function') {
        renderInventory();
    } else {
        console.warn("Advertencia: 'renderInventory' no encontrada al actualizar UI.");
        // No hay fallback, ya que la función se renombra en este mismo cambio.
        // Esto previene un error si el script no se carga correctamente.
    }

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

/**
 * Aplica un tema cambiando el atributo data-theme y las variables CSS
 * (Copiado de Logica.js para uso interno del motor)
 * @param {string} themeName (ej. 'verde-crt', 'ambar')
 */
function applyTheme(themeName) {
    setTheme(themeName); // Guardar la preferencia
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

/** Efecto visual de daño */
export function triggerDamageFlash() {
    const overlay = dom.damageOverlay;
    overlay.classList.remove('hidden');
    overlay.classList.add('flash');
    setTimeout(() => {
        overlay.classList.remove('flash');
        overlay.classList.add('hidden');
    }, 500);
}

// --- NUEVO: Actualizador de UI en tiempo real ---
function updateCooldownUI() {
    if (isGamePaused) return; // No actualizar visualmente si está pausado

    // Si el inventario no está visible, no hacemos nada
    if (dom.inventoryModal.classList.contains('hidden')) return;

    // Buscar elementos que tengan cooldown activo
    const cooldownBtns = document.querySelectorAll('[data-cooldown-end]');

    cooldownBtns.forEach(btn => {
        const endTime = parseInt(btn.getAttribute('data-cooldown-end'));
        const remaining = Math.ceil((endTime - Date.now()) / 1000);

        if (remaining <= 0) {
            // El tiempo terminó, refrescar inventario para habilitar botón
            renderInventory(); 
        } else {
            // Actualizar texto en vivo
            const minutes = Math.floor(remaining / 60);
            const seconds = (remaining % 60).toString().padStart(2, '0');
            // Buscamos el span dentro del div padre o actualizamos el botón
            // En renderInventory, el botón está dentro de un div.
            // Actualizamos el texto del botón directamente.
            btn.textContent = `[${minutes}:${seconds}]`;
        }
    });
}

/** Dibuja los items en el inventario y AÑADE LISTENERS */
export function renderInventory() {
    if (!dom.tabs) return; // Seguridad por si el DOM no cargó
    
    Object.values(dom.tabs).forEach(tab => tab.innerHTML = '');

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
        div.onclick = async () => {
            playAudio('Arrugar papel');
            await wait(1000); // Espera a que termine el sonido
            showNoteReader(note.name, note.content);
        };
        dom.tabs.notes.appendChild(div);
    });
    
    // Minijuegos
    GAME_STATE.inventory.minigames.forEach(item => {
        const div = document.createElement('div');
        
        // --- LÓGICA DE COOLDOWN DE OSO ---
        let onCooldown = false;
        if (item.id === 'tranqui_oso' && GAME_STATE.flags.tranquiOsoCooldown > Date.now()) {
            onCooldown = true;
        }
        
        // --- FIN LÓGICA COOLDOWN ---
        
        div.className = 'inventory-item';
        div.innerHTML = `<span>${item.name}</span>`;
        const playBtn = document.createElement('button');
        playBtn.className = 'ui-btn';
        playBtn.textContent = 'Usar';
        playBtn.onclick = () => startMinigame(item); // <-- Lógica de "Minijuego"
        
        if (onCooldown) {
            // NUEVO: Texto inicial y atributo de datos para el updateCooldownUI
            const remaining = Math.ceil((GAME_STATE.flags.tranquiOsoCooldown - Date.now()) / 1000);
            const minutes = Math.floor(remaining / 60);
            const seconds = (remaining % 60).toString().padStart(2, '0');
            
            playBtn.textContent = `Recargando (${minutes}:${seconds})...`;
            playBtn.setAttribute('data-cooldown-end', GAME_STATE.flags.tranquiOsoCooldown);
            playBtn.disabled = true;
        }
        
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
            updatePlayerState('fear', item.restore || -50); // Instantáneo
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

/** AUDIO MANAGER EXTENDIDO */

function playTypingSound(audioObj) {
    // Resetear para solapamiento rápido
    audioObj.currentTime = 0;
    audioObj.play().catch(() => {});
}

/** Reproduce un sonido SFX puntual */
export function playAudio(audioId, durationInSeconds = 0) {
    // Mapeo simple a archivos si viene solo el nombre
    let filename = audioId;
    if (!audioId.endsWith('.mp3')) filename = audioId + '.mp3';
    
    let audio = audioContext.sfx[filename];
    if (!audio) {
        // Intentar cargarlo al vuelo
        audio = new Audio(`../../../Assets/Audios/${filename}`);
        audioContext.sfx[filename] = audio;
    }
    
    audio.currentTime = 0;
    audio.play().catch(e => console.warn("Error audio:", e));
    
    if (durationInSeconds > 0) {
        setTimeout(() => audio.pause(), durationInSeconds * 1000);
    }
}

/** Lógica del latido de corazón */
function checkHeartbeatAudio() {
    if (GAME_STATE.player.fear > 90) {
        if (audioContext.heartbeat.paused) audioContext.heartbeat.play().catch(() => {});
        audioContext.heartbeat.volume = 1.0;
    } else {
        audioContext.heartbeat.pause();
        audioContext.heartbeat.currentTime = 0;
    }
}

/** Pausar todos los audios (Menú Pausa) */
function pauseAllAudio() {
    pausedAudioState = [];
    
    // BGM
    if (!audioContext.bgm.paused) {
        audioContext.bgm.pause();
        pausedAudioState.push(audioContext.bgm);
    }
    // Heartbeat
    if (!audioContext.heartbeat.paused) {
        audioContext.heartbeat.pause();
        pausedAudioState.push(audioContext.heartbeat);
    }
    
    // SFX Loop? (Si hubiera loops de SFX, añadirlos aquí)
}

/** Reanudar audios */
function resumeAllAudio() {
    pausedAudioState.forEach(audio => {
        audio.play().catch(() => {});
    });
    pausedAudioState = [];
}

/** Inicia la lógica de un minijuego */
function startMinigame(item) {
    if (item.id === 'tranqui_oso') {
        // A. Check main cooldown (2/2 fails)
        if (GAME_STATE.flags.tranquiOsoCooldown > Date.now()) {
            const remaining = Math.ceil((GAME_STATE.flags.tranquiOsoCooldown - Date.now()) / 1000);
            const minutes = Math.floor(remaining / 60);
            const seconds = (remaining % 60).toString().padStart(2, '0');
            hideModal(dom.inventoryModal);
            addNotification(`Tranqui-Oso está agotado. (${minutes}:${seconds} restantes)`, 'danger');
            return;
        }

        // B. Check 1-minute reset cooldown (1/2 fails)
        if (GAME_STATE.flags.tranquiOsoFailResetCooldown > Date.now()) {
            // Cooldown está activo, lo cancelamos y cargamos los fallos
            GAME_STATE.flags.tranquiOsoFailResetCooldown = 0; 
            saveGame();
            addNotification("Reanudando intento... Cuidado.", "danger");
            // Los fallos se cargarán en startBreathingMinigame()
        } else {
            // C. Sin cooldowns activos.
            // Si el cooldown de 1 min YA PASÓ, los fallos debieron resetearse
            // por el startGameLoop(). Si no había cooldown, los reseteamos aquí.
            GAME_STATE.flags.tranquiOsoFails = 0;
            saveGame();
        }

        // Revisar si alguien lo necesita
        // CORRECCIÓN: Usar getState()
        const currentState = getState();
        if (currentState.player.fear < 40 && currentState.rulo.fear < 40) {
            hideModal(dom.inventoryModal);
            addNotification("Ni tú ni Rulo parecen necesitarlo. El miedo no es tan alto.");
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
        // 'failures' se cargará al resetear la UI
        breaths: 0,
        failures: 0,
        isFailing: false,
        loop: null,
        // NUEVO: Handlers de Teclado
        spacebarDown: (e) => {
            if (e.key === ' ' && !e.repeat) {  
                isHoldingClick = true; e.preventDefault(); 
            }
        },
        spacebarUp: (e) => {
            if (e.key === ' ') { 
                isHoldingClick = false; e.preventDefault(); 
            }
        }
    };
    
    isHoldingClick = false;
    
    // Mostrar tutorial, ocultar juego
    dom.minigameTutorial.classList.remove('hidden');
    dom.minigameContent.classList.add('hidden');
    
    // CORRECCIÓN TRANQUI-OSO:
    // Los listeners deben estar en 'minigameContent' (el área del juego),
    // no en 'minigameModal' (todo el modal).
    // De lo contrario, el clic en "Comenzar" se registra como "soltar" y causa un fallo inmediato.
    dom.minigameContent.onmousedown = () => { isHoldingClick = true; };
    dom.minigameContent.onmouseup = () => { isHoldingClick = false; };
    dom.minigameContent.ontouchstart = (e) => { e.preventDefault(); isHoldingClick = true; };
    dom.minigameContent.ontouchend = (e) => { e.preventDefault(); isHoldingClick = false; };
    
    // NUEVO: Listeners de barra espaciadora
    document.addEventListener('keydown', minigame.spacebarDown);
    document.addEventListener('keyup', minigame.spacebarUp);

    // --- LÓGICA DE OMITIR TUTORIAL ---
    let views = GAME_STATE.flags.tutorial_Oso_Views || 0;

    // Botón para empezar
    dom.minigameStartBtn.onclick = () => {
        dom.minigameTutorial.classList.add('hidden');
        dom.minigameContent.classList.remove('hidden');
        setBreathPhase('WAIT');
        lastFrameTime = performance.now();
        minigame.loop = requestAnimationFrame(breathingGameLoop);
    };
    
    if (views < 2) {
        // Mostrar tutorial
        dom.minigameTutorial.classList.remove('hidden');
        dom.minigameContent.classList.add('hidden');
        GAME_STATE.flags.tutorial_Oso_Views = views + 1;
        saveGame();
    } else {
        // Omitir tutorial, simular clic en el botón
        dom.minigameStartBtn.onclick();
    }
    // --- FIN LÓGICA TUTORIAL ---

    // Resetear UI (Ahora 'Fallos' se muestra correctamente en 0)
    // CORRECCIÓN: Cargar fallos guardados
    minigame.failures = GAME_STATE.flags.tranquiOsoFails || 0;
    dom.breathCount.textContent = "0";
    dom.breathFails.textContent = minigame.failures;
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
    // NUEVO: Pausar el loop si estamos en medio de un fallo/éxito
    if (!minigame.isActive || minigame.isFailing) {
        if (minigame.isActive) {
            minigame.loop = requestAnimationFrame(breathingGameLoop);
        }
        return;
    }

    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;
    minigame.timer -= deltaTime;
    
    const { phase, timer } = minigame;
    
    // Mostrar timer
    dom.minigameTimer.textContent = (timer / 1000).toFixed(1);

    // Lógica de fallo
    // Lógica de fallo (NO ejecutar durante la espera)
    if (phase !== 'WAIT') {
        if (phase === 'INHALE' && !isHoldingClick && timer < (BREATH_PHASES.INHALE.duration - 500)) { // Pequeño margen
        // if (phase === 'INHALE' && !isHoldingClick && timer < (BREATH_PHASES.INHALE.duration - 500)) { // (Línea duplicada)
             // (Comentario eliminado para limpieza)
             failBreath("¡Soltaste demasiado pronto!");
            return; // CORRECCIÓN: Detener el loop de este frame
        } else if (phase === 'HOLD' && !isHoldingClick) {
            failBreath("¡Debías seguir manteniendo!");
            return; // CORRECCIÓN: Detener el loop de este frame
        // CORRECCIÓN: Aumentada tolerancia de exhalación a 800ms
        } else if (phase === 'EXHALE' && isHoldingClick && timer < (BREATH_PHASES.EXHALE.duration - 500)) { 
            failBreath("¡Debías soltar!");
            return; // CORRECCIÓN: Detener el loop de este frame
        }
    }

    // Transición de fases
    if (timer <= 0) {
        switch (phase) {
            case 'INHALE':
                // --- CORRECCIÓN BUG INHALAR ---
                if (!isHoldingClick) {
                    failBreath("¡No inhalaste a tiempo!");
                } else {
                    setBreathPhase('HOLD');
                }
                break;
            case 'HOLD':
                setBreathPhase('EXHALE');
                break;
            case 'WAIT':
                setBreathPhase('INHALE');
                break;
            // --- CORRECCIÓN LÓGICA ---
            // La transición de EXHALE solo ocurre si el timer llega a 0
            case 'EXHALE':
                // Si el timer llega a 0 Y AÚN ESTÁS PRESIONANDO, fallas.
                if (isHoldingClick) {
                    failBreath("¡Mantuviste presionado demasiado tiempo!");
                } else {
                    succeedBreath(); // Si no, éxito.
                }
                break;
        }
    }

    if (minigame.isActive) {
        minigame.loop = requestAnimationFrame(breathingGameLoop);
    }
}

function failBreath(reason) {
    // CORRECCIÓN: Evitar fallos múltiples
    if (!minigame.isActive || minigame.isFailing) return;
    
    minigame.isFailing = true; // Pausar el loop
    
    // CORRECCIÓN VISUAL: Detener animación inmediatamente
    dom.breathingCircle.className = 'breathing-circle';
    // CORRECCIÓN: No reproducir estática aquí
    // playAudio('estatica', 1); 
    addNotification(reason, 'danger');
    minigame.failures++;
    // GUARDAR FALLOS
    GAME_STATE.flags.tranquiOsoFails = minigame.failures;
    saveGame();
    dom.breathFails.textContent = minigame.failures;

    if (minigame.failures >= FAILS_TO_LOSE) {
        endBreathingMinigame(false); // Fracaso
    } else {
        handleMinigameFail(); // Mostrar botones Reiniciar/Salir
    }
}

function succeedBreath() {
    // CORRECCIÓN: Evitar múltiples éxitos
    if (!minigame.isActive || minigame.isFailing) return;

    minigame.isFailing = true; // Pausar el loop
    minigame.breaths++;
    // GUARDAR FALLOS (Resetear al ganar)
    GAME_STATE.flags.tranquiOsoFails = 0;
    // Cancelar cooldown de 1 min si ganas
    GAME_STATE.flags.tranquiOsoFailResetCooldown = 0;
    saveGame();
    dom.breathCount.textContent = minigame.breaths;
    
    if (minigame.breaths >= BREATHS_TO_WIN) {
        // CORRECCIÓN: No llamar a endBreathingMinigame, llamar a la lógica de "Volver a Intentar"
        // endBreathingMinigame(true); // Éxito
        handleMinigameSuccess();
    } else {
        // Iniciar siguiente respiración DESPUÉS de una pausa
        setTimeout(() => {
            if (minigame.isActive) { // Comprobar si el modal sigue abierto
                setBreathPhase('WAIT');
                minigame.isFailing = false; // Reanudar el loop
            }
        }, 1000); // 1 segundo de pausa
    }
}

/** NUEVA FUNCIÓN: Maneja el éxito (3/3) y muestra el botón de reintentar */
function handleMinigameSuccess() {
    // 1. Aplicar recompensas (se puede llamar varias veces)
    addNotification("Respiras profundamente... El pánico retrocede.", "item");
    if (getState().player.fear >= 40) {
        updatePlayerState('fear', -25);
    }
    if (getState().rulo.fear >= 40) {
        updateRuloState('fear', -25);
    }
    
    // 2. Comprobar si se necesita de nuevo
    if (getState().player.fear >= 40 || getState().rulo.fear >= 40) {
        // Sí, mostrar botón de reintentar
        dom.minigameInstructions.innerHTML = '<button id="minigame-restart-btn" class="ui-btn" style="font-size: 1rem; padding: 5px 8px;">Volver a Intentar</button>';
        
        document.getElementById('minigame-restart-btn').onclick = () => {
            // Reiniciar contadores para la siguiente ronda
            minigame.breaths = 0;
            dom.breathCount.textContent = 0;
            // (Los fallos ya están en 0)
            
            // Quitar botón y volver a la pausa
            dom.minigameInstructions.textContent = '...';
            minigame.isFailing = true; // Pausar
            setTimeout(() => {
                if (minigame.isActive) {
                    // CORRECCIÓN CRÍTICA: Resetear el tiempo del frame para evitar saltos
                    lastFrameTime = performance.now();
                    setBreathPhase('WAIT');
                    minigame.isFailing = false; // Reanudar
                }
            }, 1000);
        };
        
    } else {
        // No, ya no se necesita. Cerrar.
        addNotification("Ya estás calmado. El oso descansa.");
        // Forzar el cierre con éxito
        endBreathingMinigame(true);
    }

    // 3. Resetear contadores de cualquier modo (para el botón o para cerrar)
    minigame.breaths = 0;
    dom.breathCount.textContent = 0;
}

/** NUEVA FUNCIÓN: Maneja el fallo (1/2) y muestra botones */
function handleMinigameFail() {
    minigame.isFailing = true; // Pausar loop
    dom.minigameInstructions.innerHTML = `
        <button id="minigame-restart-btn" class="ui-btn" style="font-size: 1rem; padding: 5px 8px;">Reiniciar</button>
        <button id="minigame-exit-btn" class="ui-btn" style="font-size: 1rem; padding: 5px 8px;">Salir</button>
    `;
    
    document.getElementById('minigame-restart-btn').onclick = () => {
        // 1. Limpieza inmediata
        dom.minigameInstructions.innerHTML = 'Reiniciando...'; // Texto temporal
        dom.breathingCircle.className = 'breathing-circle'; 
        isHoldingClick = false;
        minigame.isFailing = true; // Mantener pausado el loop antiguo
        cancelAnimationFrame(minigame.loop); // Matar el loop antiguo por seguridad

        // 2. Espera de 2.5 segundos
        setTimeout(() => {
            if (!minigame.isActive) return; // Si cerró el modal, cancelar

            // 3. Aviso de "Preparado"
            dom.minigameInstructions.textContent = "Prepárate...";
            
            // 4. Pequeña pausa final antes de arrancar (0.5s)
            setTimeout(() => {
                if (!minigame.isActive) return;
                
                // 5. REINICIO TOTAL DE VARIABLES
                dom.minigameInstructions.textContent = "...";
                lastFrameTime = performance.now();
                minigame.isFailing = false; // Permitir lógica de fallo de nuevo
                // Resetear fase
                setBreathPhase('WAIT');
                // Arrancar nuevo loop
                minigame.loop = requestAnimationFrame(breathingGameLoop);
                
            }, 500);

        }, 2500);
    };
    
    document.getElementById('minigame-exit-btn').onclick = () => {
        if (dom.minigameModal) dom.minigameModal.querySelector('.close-btn').click();
    };
}

function endBreathingMinigame(success, manualClose = false) {
    if (!minigame.isActive) return;
    
    minigame.isActive = false;
    cancelAnimationFrame(minigame.loop);
    
    // Limpiar listeners
    dom.minigameContent.onmousedown = null;
    dom.minigameContent.onmouseup = null;
    dom.minigameContent.ontouchstart = null;
    dom.minigameContent.ontouchend = null;
    dom.minigameStartBtn.onclick = null;
    
    // NUEVO: Limpiar listeners de teclado
    document.removeEventListener('keydown', minigame.spacebarDown);
    document.removeEventListener('keyup', minigame.spacebarUp);
    minigame.spacebarDown = null;
    minigame.spacebarUp = null;
    
    if (!manualClose) {
        hideModal(dom.minigameModal);
    }
    
    if (success) {
        addNotification("Respiras profundamente... El pánico retrocede.", "item");
        
        // CORRECCIÓN: Resetear fallos al tener éxito
        GAME_STATE.flags.tranquiOsoFails = 0;
        GAME_STATE.flags.tranquiOsoFailResetCooldown = 0;

        // NUEVO: Reducir miedo solo si es necesario
        if (getState().player.fear >= 40) {
            updatePlayerState('fear', -25);
        }
        if (getState().rulo.fear >= 40) {
            updateRuloState('fear', -25);
        }
        
        saveGame();
        
    } else {
        // CORRECCIÓN: Solo aplicar lógica de fallo si NO es un cierre manual
        if (!manualClose) { 
            addNotification("¡No puedes! ¡No puedes calmarte! El oso emite una leve estática...", "danger");
            
            // Penalización de miedo solo si fallaste
            if (minigame.failures >= FAILS_TO_LOSE) {
                 updatePlayerState('fear', 10);
                 GAME_STATE.flags.tranquiOsoFails = 0; // Reiniciar para la próxima
                
                // NUEVO: Iniciar Cooldown
                const rates = getOsoCooldownRates();
                const difficulty = getGameDifficulty();
                const cooldownMs = rates[difficulty] || rates['normal'];
                GAME_STATE.flags.tranquiOsoCooldown = Date.now() + cooldownMs;
                
                addNotification(`Tranqui-Oso está agotado. Necesita recargarse por ${Math.ceil(cooldownMs / 60000)} minutos.`, 'danger');
                playAudio('estatica', 3); // CORRECCIÓN: Reproducir estática solo en 2/2
            }
            saveGame(); // Guardar el estado (cooldown o fallos)
        } else {
            // Es un cierre manual (botón 'X' o 'Salir')
            if (minigame.failures > 0 && minigame.failures < FAILS_TO_LOSE) {
                // Tenía 1/2 fallos y cerró
                addNotification(`Tranqui-Oso recordará tu fallo... (Reiniciando en 1 min)`, 'danger');
                GAME_STATE.flags.tranquiOsoFailResetCooldown = Date.now() + 60000; // 1 minuto
            } else if (minigame.failures === 0) {
                GAME_STATE.flags.tranquiOsoFails = 0; // Se cerró con 0 fallos
            }
            saveGame();
        }
    }
}