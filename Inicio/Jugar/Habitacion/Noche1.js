/* * Noche1.js
 * El guion para la Noche 1 (Versión Actualizada).
 */

import * as Game from './Motor.js';

// --- Constantes de la Historia (Notas) ---
const NOTAS = {
    nota1: {
        id: 'note1',
        name: 'Nota #1: "Hoja de Paciente"',
        content: "Pacientes 1204-A y 1204-B. Involucrados en 'Incidente de la Carretera 9'. Traumatismo severo. Resistencia inusual a los sedantes. Actualización: Medianoche. El protocolo 'La Cosecha' ha comenzado. El personal debe evacuar los pisos superiores. Ellos ya no son... pacientes. Son alimento. Que Dios nos perdone."
    },
    nota2: {
        id: 'note2',
        name: 'Nota #2: "Diario Arrugado"',
        content: "Día 3. O 4. No lo sé. La luz de la luna ya no es real. La cosa en el pasillo... la llamo 'El Conserje'. Se lleva a los que hacen ruido. Mi compañero intentó gritar pidiendo ayuda. El Conserje abrió la puerta. No gritó mucho tiempo. Rulo, si alguien llamado Rulo lee esto... NO BAJES POR EL ASCENSOR. Solo las escaleras. Cuidado con la enfermera del Piso 10. Ella... ella tararea."
    }
};

// --- ESTADO DE BÚSQUEDA ---
let searchState = {
    nightstand: true,
    wardrobe: true,
    underBeds: true,
    window: true
};

// --- INICIO DEL JUEGO ---
document.addEventListener('DOMContentLoaded', () => {
    // --- MEDIDA DE SEGURIDAD: Verificar carga del Motor ---
    if (!Game || typeof Game.init !== 'function') {
        console.error("ERROR FATAL: El motor del juego (Motor.js) no se ha cargado correctamente.");
        alert("Error al cargar el juego. Revisa la consola (F12).");
        return;
    }
    // -----------------------------------------------------

    Game.init();
    
    // Protección extra por si la función específica falla
    if (typeof Game.hideLoadingScreen === 'function') {
        Game.hideLoadingScreen();
    } else {
        console.error("ADVERTENCIA: Game.hideLoadingScreen no encontrada.");
        // Intento manual de ocultar si falla el motor
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.add('hidden');
    }
    // Iniciar el juego
    startGame();
});

/**
 * MODIFICADO: Ahora comprueba si es un jugador nuevo,
 * si debe reanudar una partida, o si debe empezar de cero.
 */
function startGame() {
    const resumeNode = Game.getFlag('currentStoryNode');

    if (Game.isNewPlayer()) {
        // 1. Jugador 100% nuevo -> Pedir nombre
        Game.promptForName(startNight1_Intro); 
    } else if (resumeNode) {
        // 2. Jugador existente CON un punto de guardado -> Reanudar
        Game.showGameContainer();
        Game.addDialogue(`[Sistema: Reanudando... Noche ${Game.getNightNumber()}]`, "Sistema");
        resumeGame(resumeNode);
    } else {
        // 3. Jugador existente SIN punto de guardado (p.ej. justo después de poner nombre)
        startNight1_Intro();
    }
}

/**
 * NUEVA FUNCIÓN: Reanuda el juego desde el último
 * punto de guardado (nodo de historia).
 */
async function resumeGame(node) {
    // Restaura el estado visual (botones de stats) si es necesario
    if (Game.getFlag('n1_gave_flashlight')) {
        Game.showPlayerStatsButton();
        Game.showRuloStats();
    } else if (Game.getFlag('player_stats_unlocked')) {
         Game.showPlayerStatsButton();
    }
    
    // Carga las opciones correctas
    switch(node) {
        case 'startNight1_Intro_Choices':
            await Game.addDialogue("...", "Sistema"); // Re-orientar
            Game.addChoice("Observar entorno.", () => handleChoiceObserve());
            Game.addChoice("Llamar a la figura.", () => handleChoiceCall());
            Game.addChoice("Levantarse.", () => handleChoiceStand());
            break;
            
        case 'displaySearchOptions':
            await Game.addDialogue("Estabas decidiendo qué registrar...", "Sistema");
            // Recargar el estado de búsqueda desde las flags (por si acaso)
            searchState.nightstand = Game.getFlag('search_nightstand') !== false;
            searchState.wardrobe = Game.getFlag('search_wardrobe') !== false;
            searchState.underBeds = Game.getFlag('search_underBeds') !== false;
            searchState.window = Game.getFlag('search_window') !== false;
            
            displaySearchOptions(); // Esta función regenera las opciones
            break;
            
        case 'handleCheckWindowAgain_Choices':
            await Game.addDialogue("Estabas decidiendo qué observar en la ventana...", "Sistema");
            Game.addChoice("Observar su cuerpo", handleObserveBody);
            Game.addChoice("Observar su movimiento", handleObserveMovement);
            break;
            
        case 'startExitSequence_Choices':
            await Game.addDialogue("Estabas decidiendo cómo salir...", "Sistema");
            Game.addChoice("ESCUCHAR EN LA PUERTA", handleExitListen);
            Game.addChoice("ABRIR LA PUERTA DE GOLPE", handleExitBash);
            Game.addChoice("ABRIR LA PUERTA LENTAMENTE", handleExitSneak);
            break;
            
        default:
            // Si el nodo es desconocido, reiniciar
            await Game.addDialogue("[Sistema: Error de guardado. Reiniciando Noche.]", "Sistema");
            startNight1_Intro();
    }
}


async function startNight1_Intro() {
    Game.showGameContainer();
    
    // El nombre del compañero es dinámico ahora
    const compName = Game.getCompanionName();
    
    Game.showIntroOverlay(`Noche ${Game.getNightNumber()}`);
    await Game.wait(2500);
    Game.hideIntroOverlay();
    await Game.wait(1500);

    // Intro
    await Game.addDialogue("Tus párpados pesan. Un olor a antiséptico y... algo dulce y podrido, llena tu nariz. Te duele la cabeza. Abres los ojos.", "Sistema");
    await Game.addDialogue("La habitación está casi en completa oscuridad. La luz pálida de la luna se filtra por una ventana alta y enrejada. Estás en una camilla. En la otra, un bulto inmóvil.", "Sistema");

    await Game.addDialogue("[Sistema: Nuevas Interacciones Disponibles]", "Sistema");
    Game.addChoice("Observar entorno.", () => handleChoiceObserve());
    Game.addChoice("Llamar a la figura.", () => handleChoiceCall());
    Game.addChoice("Levantarse.", () => handleChoiceStand());
    
    // GUARDADO: Establece el primer punto de reanudación
    Game.setFlag('currentStoryNode', 'startNight1_Intro_Choices');
}

// --- MANEJADORES DE ELECCIONES INICIALES ---

async function handleChoiceObserve() {
    await Game.addDialogue("Miras a tu alrededor. Es un cuarto de hospital viejo. El papel tapiz se está pelando. Ves una mesita de noche junto a tu cama y un armario metálico en la esquina. La figura en la otra cama no se mueve.", "Sistema");
    await startRuloDialogue();
}

async function handleChoiceCall() {
    const compName = Game.getCompanionName();
    await Game.addDialogue("Gritas débilmente, '¿Hola?'. El bulto se mueve. Un gemido.", "Tú");
    await Game.addDialogue(`... ¿${Game.getPlayerName()}?...`, compName);
    await Game.addDialogue(`¡${compName}! Soy yo. ¿Estás bien?`, "Tú");
    await startRuloDialogue(true);
}

async function handleChoiceStand() {
    const compName = Game.getCompanionName();
    await Game.addDialogue("Te pones en pie, pero tus piernas fallan. Caes al suelo. El ruido resuena.", "Tú");
    Game.updatePlayerState('fear', 5);
    Game.addNotification("Miedo +5", "danger");
    await Game.wait(500);
    await Game.addDialogue("¿Quién anda ahí?", compName);
    await startRuloDialogue();
}

// --- SECUENCIAS DE HISTORIA ---

async function startRuloDialogue(skipWakeup = false) {
    const compName = Game.getCompanionName();
    if (!skipWakeup) {
        await Game.addDialogue(`${compName}... ${compName}, despierta.`, "Tú");
        await Game.addDialogue(`Ugh... mi cabeza... ¿${Game.getPlayerName()}?`, compName);
    }
    
    await Game.addDialogue("¿Dónde... dónde estamos? Esto no es mi cuarto.", compName);
    await Game.addDialogue("Creo que es un hospital. Lo último que recuerdo... íbamos en tu auto. La tormenta, y esa luz cegadora... ¿chocamos?", "Tú");
    await Game.addDialogue("Sí... la luz. No recuerdo el impacto. Ugh, me siento débil... y todo es... raro.", compName);
    await Game.addDialogue("Mira ese teléfono. ¿Es... de una película? Es de esos que giran. Qué anticuado. ¿Por qué no hay una TV de pantalla plana? Todo este lugar parece... viejo.", compName);
    await Game.addDialogue(`No sé, ${compName}. Es... extraño. Todo parece... apagado.`, "Tú");
    
    await triggerStateTutorial();
}

async function triggerStateTutorial() {
    const compName = Game.getCompanionName();
    await Game.addDialogue("[Sistema: Tutorial de Estado Activado]", "Sistema");
    Game.addNotification("¡Estados de personaje activados!");

    // --- NUEVO: Mostrar botón de estado (Solo jugador) ---
    Game.showPlayerStatsButton();
    Game.setFlag('player_stats_unlocked', true); // Flag para reanudar
    
    // Establecer valores iniciales
    Game.updatePlayerState('health', 90, true);
    Game.updatePlayerState('hunger', 60, true);
    Game.updatePlayerState('thirst', 50, true);
    Game.updatePlayerState('fear', 10, true);
    
    Game.updateRuloState('health', 85, true);
    Game.updateRuloState('hunger', 55, true);
    Game.updateRuloState('thirst', 45, true);
    Game.updateRuloState('fear', 15, true);
    
    await Game.wait(500);
    await Game.addDialogue("Tengo sed. Y miedo. ¿Por qué nos dejarían aquí sin luz?", compName);
    await Game.addDialogue("CRREEEEEEE... SHHH... BUMP.", "Sonido");
    await Game.addDialogue("Un sonido metálico y húmedo, como algo pesado siendo arrastrado, resuena desde el pasillo.", "Sistema");
    await Game.addDialogue("El sonido se detiene justo frente a su puerta. Ambos contienen la respiración.", "Sistema");
    await Game.addDialogue("¡No te muevas! ¡¿Oíste eso?!", compName);
    
    await Game.addDialogue("[Sistema: Miedo Aumentado]", "Sistema");
    Game.updatePlayerState('fear', 15); // Total 25
    Game.updateRuloState('fear', 15); // Total 30
    Game.addNotification("Miedo +15", "danger");
    Game.addNotification("Miedo de Rulo +15", "danger");
    
    await Game.wait(500);
    await Game.addDialogue("Necesitamos luz. No podemos quedarnos aquí. Revisa tu lado, yo revisaré el mío. Pero... en silencio.", compName);
    
    startRoomSearch();
}

// --- LÓGICA DE BÚSQUEDA ---

async function startRoomSearch() {
    await Game.addDialogue("[Sistema: Búsqueda Limitada]", "Sistema");
    displaySearchOptions();
}

function displaySearchOptions() {
    const compName = Game.getCompanionName();
    // GUARDADO: Este es el nodo principal de reanudación
    Game.setFlag('currentStoryNode', 'displaySearchOptions');
    
    Game.clearChoices();
    let searchesLeft = 0;
    
    if (searchState.nightstand) {
        Game.addChoice("Revisar Mesita de Noche", searchNightstand);
        searchesLeft++;
    }
    
    // --- LÓGICA DE COOLDOWN DE LOOT (ARMARIO) ---
    const lootCooldown = Game.getFlag('wardrobe_cooldown') || 0;
    if (Date.now() > lootCooldown) {
        Game.addChoice("Revisar Armario Metálico", searchWardrobe);
        searchState.wardrobe = true; // Habilitar búsqueda
    } else {
        searchState.wardrobe = false; // Deshabilitar
    }
    if (searchState.wardrobe) searchesLeft++; // Contar solo si está disponible
    // --- FIN LÓGICA DE COOLDOWN ---

    if (searchState.underBeds) {
        Game.addChoice("Revisar bajo Camillas", searchUnderBeds);
        searchesLeft++;
    }
    // Habilitar la ventana solo después del evento
    if (!searchState.window && Game.getFlag('window_event_done')) {
        Game.addChoice("Revisar la ventana otra vez", handleCheckWindowAgain);
        searchesLeft++;
    }

    // Contar las búsquedas restantes (excepto la ventana)
    const mainSearches = (searchState.nightstand ? 1:0) + (searchState.wardrobe ? 1:0) + (searchState.underBeds ? 1:0);

    // NUEVO: Opción de hablar
    Game.addChoice(`Hablar con ${compName}`, handleTalkToRulo);

    if (mainSearches === 0) {
        // Si ya no quedan búsquedas principales, mostrar la salida
        Game.addChoice("Intentar salir de la habitación", startExitSequence);
    }
}

async function searchNightstand() {
    const compName = Game.getCompanionName();
    // CORRECCIÓN DUPE: Establecer flag PRIMERO para evitar exploits de recarga
    searchState.nightstand = false;
    Game.setFlag('search_nightstand', false); // Guardar estado de búsqueda

    await Game.addDialogue("Hurgas en el cajón superior de la mesita. Tus dedos tocan metal frío y papel.", "Sistema");

    Game.addItem('keyItems', { id: 'flashlight', name: 'Linterna', energy: 15 });
    Game.addItem('notes', NOTAS.nota1);
    Game.setFlag('note1_found', true); // CORRECCIÓN: Marcar que se encontró la nota 1
    Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 1, restore: 20 });

    await Game.addDialogue("¡Una linterna! No tiene mucha carga, la luz es débil.", "Tú");
    await Game.addDialogue("¡Dámela, dámela! Yo alumbro. Odio la oscuridad. No puedo pensar a oscuras.", compName);
    
    Game.addChoice("[DAR LINTERNA]", handleGiveFlashlight);
    Game.addChoice("[NEGARSE]", handleRefuseFlashlight);
}

async function handleGiveFlashlight() {
    const compName = Game.getCompanionName();
    await Game.addDialogue(`Confías en él. ${compName} la toma con manos temblorosas y la enciende. El débil haz de luz corta la oscuridad.`, "Sistema");
    
    // Lógica del motor: Rulo tiene la linterna
    Game.removeItem('keyItems', 'flashlight');
    Game.updateRuloState('hasFlashlight', true);
    Game.updateRuloState('energy', 15, true); // Le da 15 de energía
    Game.setFlag('n1_gave_flashlight', true); // Guardar decisión
    
    // ¡DESBLOQUEAR ESTADO DE RULO!
    Game.showRuloStats();
    Game.addNotification(`El estado de ${compName} ahora es visible.`, "info");
    
    await readNote1();
}

async function handleRefuseFlashlight() {
    const compName = Game.getCompanionName();
    await Game.addDialogue(`Le dices que tú la llevarás. ${compName} te mira dolido. 'No es momento de ser egoísta, ${Game.getPlayerName()}...'.`, "Tú");
    Game.updateRuloState('fear', 10);
    Game.setFlag('n1_refused_flashlight_first', true); // Guardar intento
    Game.addNotification(`Miedo de ${compName} +10`, "danger");
    
    await Game.wait(1000);
    await Game.addDialogue(`... (${compName} te la arrebata) ... ¡Dámela! Yo la llevaré.`, compName);
    await handleGiveFlashlight(); // Forzar entrega
}

async function readNote1() {
    const compName = Game.getCompanionName();
    await Game.addDialogue("También hay una... nota. Y una batería, pero parece medio muerta.", "Tú");
    await Game.addDialogue("Cualquier cosa sirve. ¿Qué dice la nota? Alumbra.", compName);
    await Game.addDialogue("Leen la Nota #1: 'Hoja de Paciente'.", "Sistema");
    
    // AUDIO: Arrugar Papel
    Game.playAudio('Arrugar papel');

    // ESPERA a que el jugador cierre la nota
    await Game.showNoteReader(NOTAS.nota1.name, NOTAS.nota1.content);
    
    await Game.addDialogue(`...'Alimento'. ${compName}, ¿qué significa 'alimento'?`, "Tú");
    await Game.addDialogue(`¡Esto es una broma! ¡Tiene que ser una broma de mal gusto! ¡'La Cosecha'! ¡¿Qué hospital escribe esto?! ¡Sácame de aquí, ${Game.getPlayerName()}! ¡YA!`, compName);
    Game.updateRuloState('fear', 10);
    Game.addNotification(`Miedo de ${compName} +10`, "danger");

    await triggerWindowEvent(); // Evento fijo
}

async function triggerWindowEvent() {
    const compName = Game.getCompanionName();
    Game.setFlag('window_event_done', true); // Marcar que el evento ocurrió
    searchState.window = false; // Permitir que se revise de nuevo
    Game.setFlag('search_window', false); // Guardar estado
    
    await Game.addDialogue(`${compName}, ahora sosteniendo la linterna, barre la habitación: las paredes desconchadas, una silla de ruedas volcada, la puerta metálica... y luego, la ventana enrejada.`, "Sistema");
    await Game.addDialogue("Voy a... voy a ver qué hay afuera.", compName);
    await Game.addDialogue("Apunta el haz hacia la ventana. Al principio, solo ven la lluvia golpeando el cristal.", "Sistema");
    await Game.wait(500);
    await Game.addDialogue("No veo na...", compName);
    
    // --- EVENTO DE VENTANA (Audio/Imagen) ---
    await Game.addDialogue("De repente, algo ENORME y pálido se estrella contra el cristal desde el exterior. Una masa de... ¿brazos? Una cara, pálida y sin ojos, se presiona contra el vidrio.", "Sistema");
    
    // 1. Audio Golpe
    Game.playAudio('Golpe');
    // 2. Imagen El Mirón (La criatura visible)
    await Game.showImage('El miron.jpg');
    
    await Game.addDialogue("¡¡¡SKREEEEE!!!", "Sonido");
    
    await Game.addDialogue("[Sistema: PÁNICO]", "Sistema");
    Game.updatePlayerState('fear', 25); // Total 50
    Game.updateRuloState('fear', 30); // Total 65
    Game.addNotification("Miedo +25", "danger");
    Game.addNotification(`Miedo de ${compName} +30`, "danger");

    await Game.addDialogue("¡¡APÁGALA!! ¡¡APÁGALA!!", compName);
    await Game.addDialogue(`${compName} grita y deja caer la linterna. La habitación vuelve a sumirse en la oscuridad, excepto por la linterna en el suelo, que parpadea erráticamente.`, "Sistema");
    await Game.addDialogue(`¡${compName}, cálmate! ¡Levanta la linterna! ¡Rápido!`, "Tú");
    await Game.addDialogue(`${compName} la recoge, temblando. '¡¿Qué era eso?! ¡Estamos en el piso 12! ¡Nada puede estar ahí fuera!'`, compName);
    
    await Game.addDialogue(`${compName}... ${compName}, cálmate. Tenemos que ser listos. Respira.`, "Tú");
    Game.addNotification("Nueva opción de búsqueda disponible: Ventana.");
    
    displaySearchOptions(); // Volver a las opciones
}

async function handleCheckWindowAgain() {
    const compName = Game.getCompanionName();
    searchState.window = true; // Marcar como "revisada" para que no vuelva a salir
    Game.setFlag('search_window', true);
    
    await Game.addDialogue(`${compName}, alumbra la ventana. Con cuidado. Quiero ver algo.`, "Tú");
    await Game.addDialogue("¡Estás loco! ¡No voy a...", compName);
    await Game.addDialogue("¡Hazlo! Necesitamos saber a qué nos enfrentamos.", "Tú");
    await Game.addDialogue(`${compName}, a regañadientes, enfoca el tembloroso haz de luz. La criatura está aferrada al edificio, inmóvil. Su piel pálida y húmeda brilla bajo la lluvia.`, "Sistema");
    
    await Game.addDialogue("[Decisión Crítica: ¿En qué te concentras?]", "Sistema");
    Game.addChoice("Observar su cuerpo", handleObserveBody);
    Game.addChoice("Observar su movimiento", handleObserveMovement);

    // GUARDADO: Punto de reanudación
    Game.setFlag('currentStoryNode', 'handleCheckWindowAgain_Choices');
}

async function handleObserveBody() {
    await Game.addDialogue("Miras de cerca. Su piel parece... blanda y gomosa. Pero ves algo brillando en la pared, cerca de ella. ¿Cables eléctricos? Están rotos, chispeando bajo la lluvia cerca de donde la criatura trepó.", "Sistema");
    Game.addNotification("Flag Oculta Obtenida: Debilidad Eléctrica", "item");
    Game.setFlag('weakness_electric', true);
    await creatureLeaves();
}

async function handleObserveMovement() {
    await Game.addDialogue("Esperas. La criatura gira su 'cabeza' sin ojos hacia un relámpago lejano, y luego hacia el zumbido de un aire acondicionado roto dos pisos más abajo. Parece reaccionar con extrema sensibilidad al sonido y a las luces brillantes.", "Sistema");
    Game.addNotification("Flag Oculta Obtenida: Sensible al Sonido/Luz", "item");
    Game.setFlag('weakness_sound_light', true);
    await creatureLeaves();
}

async function creatureLeaves() {
    await Game.addDialogue("La criatura se aleja, bajando ágilmente por el edificio.", "Sistema");
    const compName = Game.getCompanionName();
    await Game.addDialogue("¿Viste eso? Se fue... está bajando. Qué asco.", compName);
    await Game.addDialogue("Sí. Creo que noté algo... Sigamos buscando.", "Tú");
    displaySearchOptions();
}

async function searchUnderBeds() {
    const compName = Game.getCompanionName();
    // CORRECCIÓN DUPE: Establecer flag PRIMERO
    searchState.underBeds = false;
    Game.setFlag('search_underBeds', false); // Guardar estado

    await Game.addDialogue(`Deciden revisar bajo las camas. ${compName} alumbra el suelo polvoriento.`, "Sistema");
    await Game.addDialogue("¡Espera! ¡Ahí!", compName);

    // --- MODIFICACIÓN: Nombre Dinámico en Nota ---
    // Reemplazamos "Rulo" por el nombre del compañero en el texto de la nota
    let notaDinamica = { ...NOTAS.nota2 }; // Copia para no alterar el original permanentemente
    notaDinamica.content = notaDinamica.content.replace(/Rulo/g, compName);
    // ---------------------------------------------

    Game.addItem('notes', notaDinamica);
    Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 1, restore: 20 });
    Game.addItem('minigames', { id: 'tranqui_oso', name: 'Tranqui-Oso', description: "Un viejo oso de peluche. Te calma." });

    await Game.addDialogue("Hay una nota... está arrugada.", "Tú");
    
    // AUDIO: Arrugar Papel
    Game.playAudio('Arrugar papel');
    
    // ESPERA a que el jugador cierre la nota
    await Game.showNoteReader(notaDinamica.name, notaDinamica.content);
    
    await Game.addDialogue(`¿El... Conserje? ¿Por qué... por qué está tu nombre ahí, ${compName}? ¿'Si alguien llamado ${compName} lee esto'?`, "Tú");
    await Game.addDialogue("¡No! ¡Imposible! ¡Esto es una trampa! ¡Alguien está jugando con nosotros! ¡Mi nombre... cómo...!", compName);
    
    Game.updateRuloState('fear', 15);
    Game.addNotification(`Miedo de ${compName} +15`, "danger");
    
    await Game.addDialogue("Esto es... raro. Es un oso de peluche. Le falta un ojo y parece muy viejo.", "Tú");
    await Game.addDialogue("¿Un juguete? ¿De quién es esto? Qué... triste. Me da escalofríos. Déjalo, debe estar sucio.", compName);
    await Game.addDialogue("No... Siento... siento como si lo conociera. Como de un sueño... o una pesadilla. Lo guardaré.", "Tú");
    await Game.addDialogue("[Sistema: ¡Tranqui-Oso Obtenido! Abre la Mochila (Pestaña Minijuegos) cuando tu Miedo sea > 40% para intentar 'Respiración Controlada'.]", "Sistema");

    await Game.wait(500);
    displaySearchOptions();
}

async function searchWardrobe() {
    const compName = Game.getCompanionName();
    // --- CORRECCIÓN DUPE: Iniciar Cooldown de Loot INMEDIATAMENTE ---
    // CORRECCIÓN ERROR: Usar Game.getLootCooldownRates y Game.getDifficulty
    const rates = Game.getLootCooldownRates();
    // CORRECCIÓN ERROR: Renombrada a getGameDifficulty()
    const difficulty = Game.getGameDifficulty();
    const cooldownMs = rates[difficulty] || rates['normal'];
    Game.setFlag('wardrobe_cooldown', Date.now() + cooldownMs);

    await Game.addDialogue(`${compName} te alumbra mientras abres el armario metálico. Chirría ruidosamente.`, "Sistema");
    Game.updatePlayerState('fear', 5);
    Game.addNotification("Miedo +5", "danger");
    await Game.addDialogue("Dentro hay una caja de cartón con la etiqueta 'Efectos Personales'.", "Sistema");
    await Game.addDialogue("[Sistema: Saqueo de Caja (Obtendrás 3 items al azar)]", "Sistema");

    let itemsFoundNames = [];
    for (let i = 0; i < 3; i++) {
        await Game.wait(500);
        let roll = Math.random();
        let foundItem = null;

        if (roll <= 0.15) {
            foundItem = { id: 'pills', name: 'Píldoras "Calmantes"', stack: 1, restore: -30 };
        } else if (roll <= 0.30) {
            foundItem = { id: 'bandage', name: 'Venda Sucia', stack: 1, restore: 10 };
        } else if (roll <= 0.40) {
            foundItem = { id: 'battery_spent', name: 'Baterías Gastadas', stack: 2, restore: 20 };
        } else if (roll <= 0.50) {
            foundItem = { id: 'cereal', name: 'Barra de Cereal Rancia', stack: 1, restore: 20 };
        } else if (roll <= 0.60) {
            foundItem = { id: 'water', name: 'Agua Embotellada', stack: 1, restore: 30 };
        }

        if (foundItem) {
            Game.addItem('consumables', foundItem);
            itemsFoundNames.push(foundItem.name);
            // NUEVO: Mostrar loot en el diálogo
            await Game.addDialogue(`...encontraste ${foundItem.name}.`, "Sistema");
        }
    }

    if (itemsFoundNames.length === 0) {
        // Si no se encontró nada en los 3 intentos
        await Game.addDialogue("...polvo y pelusa.", "Sistema");
        // Garantizar 1 item si no se encontró nada
        let guaranteedItem = { id: 'water', name: 'Agua Embotellada', stack: 1, restore: 30 };
        Game.addItem('consumables', guaranteedItem);
        await Game.addDialogue(`...pero lograste rescatar ${guaranteedItem.name}.`, "Sistema");
    }

    await Game.addDialogue(`[Sistema: El armario está vacío. Quizás se reponga en ${Math.ceil(cooldownMs / 60000)} min.]`, "Sistema");

    displaySearchOptions();
}

/** NUEVA FUNCION: Hablar con Rulo */
async function handleTalkToRulo() {
    const compName = Game.getCompanionName();
    const currentState = Game.getState();
    const playerInventory = currentState.inventory.consumables;
    let roll = Math.random();

    // --- LÓGICA DE DECISIÓN (BASADA EN GUIÓN) ---

    // 1. DISPARADOR DE MIEDO
    if (currentState.rulo.fear > 70) {
        await Game.addDialogue("'¡Nos va a encontrar! ¡La cosa de la ventana! ¡El Conserje! ¡Estamos muertos, estamos muertos, muertos...!'", compName);
        Game.addChoice("[Calmarlo]", handleRuloFearCalm);
        Game.addChoice("[Abofetearlo]", handleRuloFearSlap);
        Game.addChoice("[Ignorarlo]", handleRuloFearIgnore);
        return; // Esperar decisión
    }

    // 2. DISPARADOR DE SED
    const hasWater = playerInventory.find(i => i.id === 'water');
    if (currentState.rulo.thirst < 30 && hasWater) {
        await Game.addDialogue(`(Tosiendo) '${Game.getPlayerName()}... mi garganta... está tan seca. ¿Me... me das un trago de esa botella que encontraste? Por favor. Solo uno.'`, compName);
        Game.addChoice("[Dar trago]", () => handleRuloThirstGive(hasWater));
        Game.addChoice("[Negarse]", handleRuloThirstRefuse);
        Game.addChoice("[Mentir]", handleRuloThirstLie);
        return; // Esperar decisión
    }

    // 3. DISPARADOR DE HAMBRE
    const hasFood = playerInventory.find(i => i.id === 'cereal');
    if (currentState.rulo.hunger < 30 && hasFood) {
        await Game.addDialogue("'Me voy a desmayar... no he comido en... ¿cuánto? ¿Todavía tienes esa barra? Podríamos... ¿compartirla?'", compName);
        Game.addChoice("[Compartir]", () => handleRuloHungerShare(hasFood));
        Game.addChoice("[Negarse]", handleRuloHungerRefuse);
        return; // Esperar decisión
    }

    // --- DIÁLOGO GENÉRICO (Si no hay disparadores críticos) ---
    if (currentState.rulo.fear > 30) {
        if (roll < 0.5) {
            await Game.addDialogue("'Manten la linterna baja... no queremos que nos vean. ¿Verdad?'", compName);
        } else {
            await Game.addDialogue("'Solo... sigamos buscando. Rápido. Quiero salir de aquí.'", compName);
        }
    } else {
        if (roll < 0.5) {
            await Game.addDialogue(`'Estamos juntos en esto, ${Game.getPlayerName()}. Lo lograremos.'`, compName);
            Game.addNotification(`${compName} intenta mantener la calma. Te sientes un poco mejor.`, "info");
            Game.updatePlayerState('fear', -5);
        } else {
            await Game.addDialogue("'Revisa todo. Cada detalle importa.'", compName);
        }
    }

    // Comentarios de estado (Menos críticos)
    if (currentState.rulo.thirst < 50 && currentState.rulo.thirst >= 30) {
        await Game.addDialogue("'Ugh... daría lo que fuera por un trago de agua.'", compName);
    } else if (currentState.rulo.hunger < 60 && currentState.rulo.hunger >= 30) {
        await Game.addDialogue("'Me rugen las tripas... ¿cuánto tiempo llevamos aquí?'", compName);
    }

    // --- Reducir Cooldown de Tranqui-Oso ---
    if (Game.getFlag('tranquiOsoCooldown') > Date.now()) {
        const reduction = 15000; // 15 segundos
        let newCooldown = Game.getFlag('tranquiOsoCooldown') - reduction;
        Game.setFlag('tranquiOsoCooldown', newCooldown);
        Game.addNotification(`Hablar con ${compName} calmó un poco al oso. (Cooldown -15s)`, 'info');
    }

    await Game.wait(500);
    displaySearchOptions(); // Volver a las opciones
}

// --- NUEVAS FUNCIONES: Ramas de Diálogo de Rulo ---

async function handleRuloFearCalm() {
    const compName = Game.getCompanionName();
    await Game.addDialogue(`'¡${compName}, mírame! ¡Mírame! Estamos juntos en esto. No te pierdas ahora.'`, "Tú");
    // Lógica de éxito/fracaso (simple por ahora)
    if (Math.random() > 0.3) {
        await Game.addDialogue("'Tú... tienes razón. Lo siento. Estoy... estoy bien. Sigamos.'", compName);
        Game.updateRuloState('fear', -15);
        Game.setFlag('amistad_rulo', (Game.getFlag('amistad_rulo') || 0) + 1);
    } else {
        await Game.addDialogue("'¡No lo entiendes! ¡No entiendes!'", compName);
        Game.updatePlayerState('fear', 5);
    }
    displaySearchOptions();
}

async function handleRuloFearSlap() {
    const compName = Game.getCompanionName();
    await Game.addDialogue(`(Le das una bofetada) '¡Cállate!'`, "Tú");
    await Game.addDialogue("...", compName);
    await Game.addDialogue("'...' (Te mira con una mezcla de miedo y rabia)", "Sistema");
    Game.updateRuloState('fear', -20); // El shock lo calla
    Game.setFlag('amistad_rulo', (Game.getFlag('amistad_rulo') || 0) - 2);
    Game.addNotification(`${compName} se calla. Tu relación ha empeorado.`, "danger");
    displaySearchOptions();
}

async function handleRuloFearIgnore() {
    const compName = Game.getCompanionName();
    await Game.addDialogue("Decides ignorarlo. Sus sollozos se hacen más fuertes.", "Sistema");
    Game.updateRuloState('fear', 5);
    Game.updatePlayerState('fear', 5);
    Game.addNotification(`El miedo de ${compName} aumenta. El tuyo también.`, "danger");
    displaySearchOptions();
}

async function handleRuloThirstGive(item) {
    await Game.addDialogue("'Claro, toma.'", "Tú");
    // El item 'agua' tiene 3 usos
    item.stack = (item.stack || 1) - 0.34; // Simular 1/3
    if (item.stack <= 0) {
        Game.removeItem('consumables', item.id);
    } else {
        Game.renderInventory(); // Actualizar UI
        Game.saveGame();
    }
    Game.updateRuloState('thirst', 30);
    Game.setFlag('amistad_rulo', (Game.getFlag('amistad_rulo') || 0) + 1);
    displaySearchOptions();
}

async function handleRuloThirstRefuse() {
    await Game.addDialogue("'No. Tenemos que guardarla. No sabemos cuándo encontraremos más.'", "Tú");
    Game.setFlag('amistad_rulo', (Game.getFlag('amistad_rulo') || 0) - 1);
    Game.updateRuloState('fear', 5);
    Game.addNotification("Rulo te mira con resentimiento.", "danger");
    displaySearchOptions();
}

async function handleRuloThirstLie() {
    const compName = Game.getCompanionName();
    await Game.addDialogue("'Ya no tengo.'", "Tú");
    await Game.addDialogue("'Mentiroso... Acabo de oír la botella en tu mochila.'", compName);
    Game.setFlag('amistad_rulo', (Game.getFlag('amistad_rulo') || 0) - 2);
    Game.updateRuloState('fear', 10);
    Game.addNotification(`${compName} sabe que mientes. Vuestra relación empeora.`, "danger");
    displaySearchOptions();
}

async function handleRuloHungerShare(item) {
    await Game.addDialogue("'Ten. Come.'", "Tú");
    Game.removeItem('consumables', item.id); // Se consume toda
    Game.updatePlayerState('hunger', 20); // Ambos recuperan un poco
    Game.updateRuloState('hunger', 20);
    Game.setFlag('amistad_rulo', (Game.getFlag('amistad_rulo') || 0) + 1);
    displaySearchOptions();
}

async function handleRuloHungerRefuse() {
    const compName = Game.getCompanionName();
    await Game.addDialogue("'Necesito toda mi energía. No puedo compartirla.'", "Tú");
    Game.setFlag('amistad_rulo', (Game.getFlag('amistad_rulo') || 0) - 1);
    Game.addNotification(`${compName} te mira con debilidad y rabia.`, "danger");
    displaySearchOptions();
}

async function startExitSequence() {
    const compName = Game.getCompanionName();
    await Game.wait(500);
    await Game.addDialogue(`La linterna de ${compName} parpadea agresivamente.`, "Sistema");
    await Game.addDialogue("¡La batería! ¡Se muere! ¡Rápido, ponle una de las que encontramos!", compName);
    await Game.addDialogue("[Sistema: Abre la mochila (I), ve a 'Consumibles' y usa 'Baterías Gastadas' para recargar la linterna.]", "Sistema");
    
    // ESPERAR a que el jugador use una batería, con un tiempo límite de 30s
    const batteryPromise = Game.waitForItemUse('battery_spent');
    const timeoutPromise = Game.wait(30000); // 30 segundos
    
    await Promise.race([batteryPromise, timeoutPromise]);
    
    // CORRECCIÓN: Usar Game.getState() para leer la energía real
    const ruloEnergy = Game.getState().rulo.energy;
    if (ruloEnergy > 15) { // Si tiene más de la energía inicial
        await Game.addDialogue("La luz de la linterna se estabiliza. Mucho mejor.", "Sistema");
    } else {
        await Game.addDialogue("La linterna sigue parpadeando. No la has recargado... o no has podido. No podemos esperar más.", "Sistema");
    }
    
    await Game.addDialogue("Bien. La puerta es la única salida. La ventana no es opción.", "Tú");
    await Game.addDialogue("Espera... 'El Conserje' del que hablaba la nota... se lleva a los que hacen ruido.", compName);
    
    await Game.addDialogue("[Decisión: Salir de la Habitación 1204]", "Sistema");
    Game.addChoice("ESCUCHAR EN LA PUERTA", handleExitListen);
    Game.addChoice("ABRIR LA PUERTA DE GOLPE", handleExitBash);
    Game.addChoice("ABRIR LA PUERTA LENTAMENTE", handleExitSneak);
    
    // GUARDADO: Punto de reanudación
    Game.setFlag('currentStoryNode', 'startExitSequence_Choices');
}

// --- SECUENCIAS DE SALIDA ---

async function handleExitListen() {
    await Game.addDialogue("Te acercas y pegas la oreja a la puerta metálica. Silencio total. Demasiado silencio.", "Tú");
    await Game.addDialogue("[Sistema: El camino al pasillo está abierto.]", "Sistema");
    // Aquí es donde llamarías a la función para cargar el siguiente nivel,
    // por ejemplo: Game.loadLevel('PasilloPiso12');
}
async function handleExitBash() {
    await Game.addDialogue("Abres la puerta con fuerza. El pasillo está oscuro y vacío, pero el ruido ha alertado a algo a lo lejos.", "Sistema");
    await Game.addDialogue("Oyes un eco metálico que se acerca.", "Sistema");
    await Game.addDialogue("[Sistema: El camino al pasillo está abierto. COMIENZA PERSECUCIÓN]", "Sistema");
}
async function handleExitSneak() {
    const compName = Game.getCompanionName();
    await Game.addDialogue(`Abres la puerta con cuidado. El pasillo está oscuro. ${compName} alumbra. Ven un rastro húmedo y oscuro que se aleja hacia... las escaleras del Piso 11.`, "Sistema");
    await Game.wait(1000);
    // CORRECCIÓN BUG: La ubicación solo debe cambiar cuando se cargue el nuevo nivel.
    // Game.setLocation("Pasillo Piso 12"); // <-- LÍNEA ELIMINADA
    await Game.addDialogue("Ahí... al final del pasillo. Las escaleras. Vamos... despacio.", compName);
    await Game.addDialogue("[Sistema: El camino al pasillo está abierto.]", "Sistema");
}