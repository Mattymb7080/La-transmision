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
    Game.init();
    Game.hideLoadingScreen(); 
    
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
    await Game.addDialogue("Miras a tu alrededor. Es un cuarto de hospital viejo. El papel tapiz se está pelando. Ves una mesita de noche junto a tu cama y un armario metálico en la esquina. La figura en la otra cama no se mueve.", "Tú");
    await startRuloDialogue();
}

async function handleChoiceCall() {
    await Game.addDialogue("Gritas débilmente, '¿Hola?'. El bulto se mueve. Un gemido.", "Tú");
    await Game.addDialogue(`... ¿${Game.getPlayerName()}?...`, "Rulo");
    await Game.addDialogue("¡Rulo! Soy yo. ¿Estás bien?", "Tú");
    await startRuloDialogue(true);
}

async function handleChoiceStand() {
    await Game.addDialogue("Te pones en pie, pero tus piernas fallan. Caes al suelo. El ruido resuena.", "Tú");
    Game.updatePlayerState('fear', 5);
    Game.addNotification("Miedo +5", "danger");
    await Game.wait(500);
    await Game.addDialogue("¿Quién anda ahí?", "Rulo");
    await startRuloDialogue();
}

// --- SECUENCIAS DE HISTORIA ---

async function startRuloDialogue(skipWakeup = false) {
    if (!skipWakeup) {
        await Game.addDialogue("Rulo... Rulo, despierta.", "Tú");
        await Game.addDialogue(`Ugh... mi cabeza... ¿${Game.getPlayerName()}?`, "Rulo");
    }
    
    await Game.addDialogue("¿Dónde... dónde estamos? Esto no es mi cuarto.", "Rulo");
    await Game.addDialogue("Creo que es un hospital. Lo último que recuerdo... íbamos en tu auto. La tormenta, y esa luz cegadora... ¿chocamos?", "Tú");
    await Game.addDialogue("Sí... la luz. No recuerdo el impacto. Ugh, me siento débil... y todo es... raro.", "Rulo");
    await Game.addDialogue("Mira ese teléfono. ¿Es... de una película? Es de esos que giran. Qué anticuado. ¿Por qué no hay una TV de pantalla plana? Todo este lugar parece... viejo.", "Rulo");
    await Game.addDialogue("No sé, Rulo. Es... extraño. Todo parece... apagado.", "Tú");
    
    await triggerStateTutorial();
}

async function triggerStateTutorial() {
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
    await Game.addDialogue("Tengo sed. Y miedo. ¿Por qué nos dejarían aquí sin luz?", "Rulo");
    await Game.addDialogue("CRREEEEEEE... SHHH... BUMP.", "Sonido");
    await Game.addDialogue("Un sonido metálico y húmedo, como algo pesado siendo arrastrado, resuena desde el pasillo.", "Sistema");
    await Game.addDialogue("El sonido se detiene justo frente a su puerta. Ambos contienen la respiración.", "Sistema");
    await Game.addDialogue("¡No te muevas! ¡¿Oíste eso?!", "Rulo");
    
    await Game.addDialogue("[Sistema: Miedo Aumentado]", "Sistema");
    Game.updatePlayerState('fear', 15); // Total 25
    Game.updateRuloState('fear', 15); // Total 30
    Game.addNotification("Miedo +15", "danger");
    Game.addNotification("Miedo de Rulo +15", "danger");
    
    await Game.wait(500);
    await Game.addDialogue("Necesitamos luz. No podemos quedarnos aquí. Revisa tu lado, yo revisaré el mío. Pero... en silencio.", "Rulo");
    
    startRoomSearch();
}

// --- LÓGICA DE BÚSQUEDA ---

async function startRoomSearch() {
    await Game.addDialogue("[Sistema: Búsqueda Limitada]", "Sistema");
    displaySearchOptions();
}

function displaySearchOptions() {
    // GUARDADO: Este es el nodo principal de reanudación
    Game.setFlag('currentStoryNode', 'displaySearchOptions');
    
    Game.clearChoices();
    let searchesLeft = 0;
    
    if (searchState.nightstand) {
        Game.addChoice("Revisar la Mesita de Noche", searchNightstand);
        searchesLeft++;
    }
    if (searchState.wardrobe) {
        Game.addChoice("Revisar el Armario Metálico", searchWardrobe);
        searchesLeft++;
    }
    if (searchState.underBeds) {
        Game.addChoice("Revisar debajo de las Camillas", searchUnderBeds);
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
    Game.addChoice("Hablar con Rulo", handleTalkToRulo);

    if (mainSearches === 0) {
        // Si ya no quedan búsquedas principales, mostrar la salida
        Game.addChoice("Intentar salir de la habitación", startExitSequence);
    }
}

async function searchNightstand() {
    searchState.nightstand = false;
    Game.setFlag('search_nightstand', false); // Guardar estado de búsqueda
    
    await Game.addDialogue("Hurgas en el cajón superior de la mesita. Tus dedos tocan metal frío y papel.", "Sistema");
    
    Game.addItem('keyItems', { id: 'flashlight', name: 'Linterna', energy: 15 });
    Game.addItem('notes', NOTAS.nota1);
    Game.setFlag('note1_found', true); // CORRECCIÓN: Marcar que se encontró la nota 1
    Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 1, restore: 20 });

    await Game.addDialogue("¡Una linterna! No tiene mucha carga, la luz es débil.", "Tú");
    await Game.addDialogue("¡Dámela, dámela! Yo alumbro. Odio la oscuridad. No puedo pensar a oscuras.", "Rulo");
    
    Game.addChoice("[DAR LINTERNA]", handleGiveFlashlight);
    Game.addChoice("[NEGARSE]", handleRefuseFlashlight);
}

async function handleGiveFlashlight() {
    await Game.addDialogue("Confías en él. Rulo la toma con manos temblorosas y la enciende. El débil haz de luz corta la oscuridad.", "Sistema");
    
    // Lógica del motor: Rulo tiene la linterna
    Game.removeItem('keyItems', 'flashlight');
    Game.updateRuloState('hasFlashlight', true);
    Game.updateRuloState('energy', 15, true); // Le da 15 de energía
    Game.setFlag('n1_gave_flashlight', true); // Guardar decisión
    
    // ¡DESBLOQUEAR ESTADO DE RULO!
    Game.showRuloStats();
    Game.addNotification("El estado de Rulo ahora es visible.", "info");
    
    await readNote1();
}

async function handleRefuseFlashlight() {
    await Game.addDialogue(`Le dices que tú la llevarás. Rulo te mira dolido. 'No es momento de ser egoísta, ${Game.getPlayerName()}...'.`, "Tú");
    Game.updateRuloState('fear', 10);
    Game.setFlag('n1_refused_flashlight_first', true); // Guardar intento
    Game.addNotification("Miedo de Rulo +10", "danger");
    
    await Game.wait(1000);
    await Game.addDialogue("... (Rulo te la arrebata) ... ¡Dámela! Yo la llevaré.", "Rulo");
    await handleGiveFlashlight(); // Forzar entrega
}

async function readNote1() {
    await Game.addDialogue("También hay una... nota. Y una batería, pero parece medio muerta.", "Tú");
    await Game.addDialogue("Cualquier cosa sirve. ¿Qué dice la nota? Alumbra.", "Rulo");
    await Game.addDialogue("Leen la Nota #1: 'Hoja de Paciente'.", "Sistema");
    
    // ESPERA a que el jugador cierre la nota
    await Game.showNoteReader(NOTAS.nota1.name, NOTAS.nota1.content);
    
    await Game.addDialogue("...'Alimento'. Rulo, ¿qué significa 'alimento'?", "Tú");
    await Game.addDialogue(`¡Esto es una broma! ¡Tiene que ser una broma de mal gusto! ¡'La Cosecha'! ¡¿Qué hospital escribe esto?! ¡Sácame de aquí, ${Game.getPlayerName()}! ¡YA!`, "Rulo");
    Game.updateRuloState('fear', 10);
    Game.addNotification("Miedo de Rulo +10", "danger");

    await triggerWindowEvent(); // Evento fijo
}

async function triggerWindowEvent() {
    Game.setFlag('window_event_done', true); // Marcar que el evento ocurrió
    searchState.window = false; // Permitir que se revise de nuevo
    Game.setFlag('search_window', false); // Guardar estado
    
    await Game.addDialogue("Rulo, ahora sosteniendo la linterna, barre la habitación: las paredes desconchadas, una silla de ruedas volcada, la puerta metálica... y luego, la ventana enrejada.", "Sistema");
    await Game.addDialogue("Voy a... voy a ver qué hay afuera.", "Rulo");
    await Game.addDialogue("Apunta el haz hacia la ventana. Al principio, solo ven la lluvia golpeando el cristal.", "Sistema");
    await Game.wait(500);
    await Game.addDialogue("No veo na...", "Rulo");
    await Game.addDialogue("De repente, algo ENORME y pálido se estrella contra el cristal desde el exterior. Una masa de... ¿brazos? Una cara, pálida y sin ojos, se presiona contra el vidrio.", "Sistema");
    await Game.addDialogue("¡¡¡SKREEEEE!!!", "Sonido");
    
    await Game.addDialogue("[Sistema: PÁNICO]", "Sistema");
    Game.updatePlayerState('fear', 25); // Total 50
    Game.updateRuloState('fear', 30); // Total 65
    Game.addNotification("Miedo +25", "danger");
    Game.addNotification("Miedo de Rulo +30", "danger");

    await Game.addDialogue("¡¡APÁGALA!! ¡¡APÁGALA!!", "Rulo");
    await Game.addDialogue("Rulo grita y deja caer la linterna. La habitación vuelve a sumirse en la oscuridad, excepto por la linterna en el suelo, que parpadea erráticamente.", "Sistema");
    await Game.addDialogue("¡Rulo, cálmate! ¡Levanta la linterna! ¡Rápido!", "Tú");
    await Game.addDialogue("Rulo la recoge, temblando. '¡¿Qué era eso?! ¡Estamos en el piso 12! ¡Nada puede estar ahí fuera!'", "Rulo");
    
    await Game.addDialogue("Rulo... Rulo, cálmate. Tenemos que ser listos. Respira.", "Tú");
    Game.addNotification("Nueva opción de búsqueda disponible: Ventana.");
    
    displaySearchOptions(); // Volver a las opciones
}

async function handleCheckWindowAgain() {
    searchState.window = true; // Marcar como "revisada" para que no vuelva a salir
    Game.setFlag('search_window', true);
    
    await Game.addDialogue("Rulo, alumbra la ventana. Con cuidado. Quiero ver algo.", "Tú");
    await Game.addDialogue("¡Estás loco! ¡No voy a...", "Rulo");
    await Game.addDialogue("¡Hazlo! Necesitamos saber a qué nos enfrentamos.", "Tú");
    await Game.addDialogue("Rulo, a regañadientes, enfoca el tembloroso haz de luz. La criatura está aferrada al edificio, inmóvil. Su piel pálida y húmeda brilla bajo la lluvia.", "Sistema");
    
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
    await Game.addDialogue("¿Viste eso? Se fue... está bajando. Qué asco.", "Rulo");
    await Game.addDialogue("Sí. Creo que noté algo... Sigamos buscando.", "Tú");
    displaySearchOptions();
}

async function searchUnderBeds() {
    searchState.underBeds = false;
    Game.setFlag('search_underBeds', false); // Guardar estado
    
    await Game.addDialogue("Deciden revisar bajo las camas. Rulo alumbra el suelo polvoriento.", "Sistema");
    await Game.addDialogue("¡Espera! ¡Ahí!", "Rulo");
    
    Game.addItem('notes', NOTAS.nota2);
    Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 1, restore: 20 });
    Game.addItem('minigames', { id: 'tranqui_oso', name: 'Tranqui-Oso', description: "Un viejo oso de peluche. Te calma." });

    // CORRECCIÓN: Comprueba si es la primera nota encontrada
    const note1Found = Game.getFlag('note1_found');
    if (note1Found) {
        await Game.addDialogue("Hay otra nota... está arrugada.", "Tú");
    } else {
        await Game.addDialogue("Hay una nota... está arrugada.", "Tú");
    }
    
    // ESPERA a que el jugador cierre la nota
    await Game.showNoteReader(NOTAS.nota2.name, NOTAS.nota2.content);
    
    await Game.addDialogue("¿El... Conserje? ¿Por qué... por qué está tu nombre ahí, Rulo? ¿'Si alguien llamado Rulo lee esto'?", "Tú");
    await Game.addDialogue("¡No! ¡Imposible! ¡Esto es una trampa! ¡Alguien está jugando con nosotros! ¡Mi nombre... cómo...!", "Rulo");
    Game.updateRuloState('fear', 15);
    Game.addNotification("Miedo de Rulo +15", "danger");
    
    await Game.addDialogue("Esto es... raro. Es un oso de peluche. Le falta un ojo y parece muy viejo.", "Tú");
    await Game.addDialogue("¿Un juguete? ¿De quién es esto? Qué... triste. Me da escalofríos. Déjalo, debe estar sucio.", "Rulo");
    await Game.addDialogue("No... Siento... siento como si lo conociera. Como de un sueño... o una pesadilla. Lo guardaré.", "Tú");
    await Game.addDialogue("[Sistema: ¡Tranqui-Oso Obtenido! Abre la Mochila (Pestaña Minijuegos) cuando tu Miedo sea > 40% para intentar 'Respiración Controlada'.]", "Sistema");

    await Game.wait(500);
    displaySearchOptions();
}

async function searchWardrobe() {
    searchState.wardrobe = false;
    Game.setFlag('search_wardrobe', false); // Guardar estado
    
    await Game.addDialogue("Rulo te alumbra mientras abres el armario metálico. Chirría ruidosamente.", "Sistema");
    Game.updatePlayerState('fear', 5);
    Game.addNotification("Miedo +5", "danger");
    await Game.addDialogue("Dentro hay una caja de cartón con la etiqueta 'Efectos Personales'.", "Sistema");
    await Game.addDialogue("[Sistema: Saqueo de Caja (Obtendrás 3 items al azar)]", "Sistema");
    
    // Simulación de 3 items
    for (let i = 0; i < 3; i++) {
        await Game.wait(500);
        let roll = Math.random();
        
        if (roll <= 0.15) {
            Game.addItem('consumables', { id: 'pills', name: 'Píldoras "Calmantes"', stack: 1, restore: -30 });
        } else if (roll <= 0.30) {
            Game.addItem('consumables', { id: 'bandage', name: 'Venda Sucia', stack: 1, restore: 10 });
        } else if (roll <= 0.40) {
            Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 2, restore: 20 });
        } else if (roll <= 0.50) {
            Game.addItem('consumables', { id: 'cereal', name: 'Barra de Cereal Rancia', stack: 1, restore: 20 });
        } else if (roll <= 0.60) {
            Game.addItem('consumables', { id: 'water', name: 'Agua Embotellada', stack: 1, restore: 30 });
        } else {
            await Game.addDialogue("...polvo y pelusa.", "Sistema");
        }
    }

    await Game.wait(500);
    displaySearchOptions();
}

/** NUEVA FUNCION: Hablar con Rulo */
async function handleTalkToRulo() {
    const ruloFear = Game.getFlag('rulo_fear') || 15; // Usar el estado real de Rulo
    const ruloThirst = Game.getFlag('rulo_thirst') || 45;
    const ruloHunger = Game.getFlag('rulo_hunger') || 55;
    
    let roll = Math.random();
    
    if (ruloFear > 60) {
        if (roll < 0.5) {
            await Game.addDialogue("'No puedo... no puedo... nos va a encontrar, lo sé...'", "Rulo");
        } else {
            await Game.addDialogue("'¡¿Oíste eso?! ¡Se está moviendo! ¡Cállate, cállate!'", "Rulo");
        }
        Game.addNotification("Rulo está aterrado. Tu miedo aumenta.", "danger");
        Game.updatePlayerState('fear', 5);
    } else if (ruloFear > 30) {
        if (roll < 0.5) {   
            await Game.addDialogue("'Manten la linterna baja... no queremos que nos vean. ¿Verdad?'", "Rulo");
        } else {
            await Game.addDialogue("'Solo... sigamos buscando. Rápido. Quiero salir de aquí.'", "Rulo");
        }
    } else {
        if (roll < 0.5) {
            await Game.addDialogue(`'Estamos juntos en esto, ${Game.getPlayerName()}. Lo lograremos.'`, "Rulo");
            Game.addNotification("Rulo intenta mantener la calma. Te sientes un poco mejor.", "info");
            Game.updatePlayerState('fear', -5);
        } else {
            await Game.addDialogue("'Revisa todo. Cada detalle importa.'", "Rulo");
        }
    }

    // Comentarios de estado
    if (ruloThirst < 50) {
        await Game.addDialogue("'Ugh... daría lo que fuera por un trago de agua.'", "Rulo");
    } else if (ruloHunger < 60) {
        await Game.addDialogue("'Me rugen las tripas... ¿cuánto tiempo llevamos aquí?'", "Rulo");
    }

    await Game.wait(500);
    displaySearchOptions(); // Volver a las opciones
}


async function startExitSequence() {
    await Game.wait(500);
    await Game.addDialogue("La linterna de Rulo parpadea agresivamente.", "Sistema");
    await Game.addDialogue("¡La batería! ¡Se muere! ¡Rápido, ponle una de las que encontramos!", "Rulo");
    await Game.addDialogue("[Sistema: Abre la mochila (I), ve a 'Consumibles' y usa 'Baterías Gastadas' para recargar la linterna.]", "Sistema");
    
    // ESPERAR a que el jugador use una batería, con un tiempo límite de 30s
    const batteryPromise = Game.waitForItemUse('battery_spent');
    const timeoutPromise = Game.wait(30000); // 30 segundos
    
    await Promise.race([batteryPromise, timeoutPromise]);
    
    // Comprobar si realmente la usó (viendo la energía de Rulo)
    const ruloEnergy = Game.getFlag('rulo_energy') || 0; // Usar el estado real
    if (ruloEnergy > 15) { // Si tiene más de la energía inicial
        await Game.addDialogue("La luz de la linterna se estabiliza. Mucho mejor.", "Sistema");
    } else {
        await Game.addDialogue("La linterna sigue parpadeando. No la has recargado... o no has podido. No podemos esperar más.", "Sistema");
    }
    
    await Game.addDialogue("Bien. La puerta es la única salida. La ventana no es opción.", "Tú");
    await Game.addDialogue("Espera... 'El Conserje' del que hablaba la nota... se lleva a los que hacen ruido.", "Rulo");
    
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
    await Game.addDialogue("Abres la puerta con cuidado. El pasillo está oscuro. Rulo alumbra. Ven un rastro húmedo y oscuro que se aleja hacia... las escaleras del Piso 11.", "Sistema");
    Game.setLocation("Pasillo Piso 12");
    await Game.wait(1000);
    await Game.addDialogue("Ahí... al final del pasillo. Las escaleras. Vamos... despacio.", "Rulo");
    await Game.addDialogue("[Sistema: El camino al pasillo está abierto.]", "Sistema");
}