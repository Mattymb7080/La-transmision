/* * Noche1.js
 * El guion para la Noche 1.
 */

import * as Game from './Motor.js';

// --- Constantes de la Historia ---
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

// --- INICIO DEL JUEGO ---
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
    
    if (Game.isNewPlayer()) {
        Game.promptForName(startNight1);
    } else {
        startNight1();
    }
});

async function startNight1() {
    Game.showGameContainer();
    Game.hideLoadingScreen(); // Oculta la pantalla de carga

    Game.showIntroOverlay(`Noche ${Game.getNightNumber()}`);
    await Game.wait(2500);
    Game.hideIntroOverlay();
    await Game.wait(1500); // Aumenta la espera post-animación

    await Game.addDialogue("Tus párpados pesan como el plomo. Un olor a antiséptico y... algo más, algo dulce y podrido, llena tu nariz. Te duele la cabeza.", "Sistema");
    await Game.addDialogue("Abres los ojos.", "Sistema");
    await Game.wait(500);
    
    Game.addDialogue("[Sistema: Nuevas Interacciones Disponibles]", "Sistema");
    Game.addChoice("Observar entorno.", () => handleChoiceObserve());
    Game.addChoice("Llamar a la figura.", () => handleChoiceCall());
    Game.addChoice("Levantarse.", () => handleChoiceStand());
}

// --- MANEJADORES DE ELECCIONES ---

async function handleChoiceObserve() {
    await Game.addDialogue("Miras a tu alrededor. Es un cuarto de hospital viejo. El papel tapiz se está pelando. Ves una mesita de noche junto a tu cama y un armario metálico en la esquina. La figura en la otra cama no se mueve.", "Tú");
    await startRuloDialogue();
}

async function handleChoiceCall() {
    await Game.addDialogue("Gritas débilmente, '¿Hola?'. El bulto se mueve. Un gemido.", "Tú");
    await Game.addDialogue(`... ¿${Game.getPlayerName()}?... Es Rulo. Tu mejor amigo.`, "Rulo");
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
    
    await Game.addDialogue("¿Dónde... dónde estamos? Esto no es... esto no es mi cuarto.", "Rulo");
    await Game.addDialogue("Creo que es un hospital. Lo último que recuerdo... íbamos en tu auto. La tormenta era terrible, y esa luz cegadora... ¿chocamos?", "Tú");
    await Game.addDialogue("No lo sé... No recuerdo el impacto. Solo... la luz. Y luego oscuridad. Me siento débil... y tengo sed.", "Rulo");
    
    await triggerStateTutorial();
}

async function triggerStateTutorial() {
    await Game.addDialogue("[Sistema: Tutorial de Estado]", "Sistema");
    Game.addNotification("¡Estados de personaje activados!");
    
    // Establecer valores iniciales
    Game.updatePlayerState('health', 90, true);
    Game.updatePlayerState('hunger', 60, true);
    Game.updatePlayerState('thirst', 50, true);
    Game.updatePlayerState('fear', 10, true);
    
    Game.updateRuloState('health', 85, true);
    Game.updateRuloState('hunger', 55, true);
    Game.updateRuloState('thirst', 45, true);
    Game.updateRuloState('fear', 15, true);
    
    Game.showRuloStats();
    
    await Game.wait(500); // Espera reducida
    await Game.addDialogue("¿Por qué está todo tan oscuro? No me gusta esto. ¿Por qué nos dejarían aquí sin luz?", "Rulo");
    await Game.addDialogue("Tranquilo. Vamos a revisar. Debe haber un interruptor.", "Tú");
    await Game.addDialogue("CRREEEEEEE... SHHH... BUMP.", "Sonido");
    await Game.addDialogue("El sonido se detiene justo frente a su puerta.", "Sistema");
    await Game.addDialogue("¡No te muevas! ¡¿Oíste eso?!", "Rulo");
    
    Game.addDialogue("[Sistema: Miedo Aumentado]", "Sistema");
    Game.updatePlayerState('fear', 15); // Total 25
    Game.updateRuloState('fear', 15); // Total 30
    Game.addNotification("Miedo +15", "danger");
    Game.addNotification("Miedo de Rulo +15", "danger");
    
    await Game.wait(500);
    await Game.addDialogue("Necesitamos luz. No podemos quedarnos aquí a oscuras. Revisa tu lado, yo revisaré el mío.", "Rulo");
    
    startRoomSearch();
}

// (El resto del script de búsqueda es idéntico al anterior)
// ...

let searchState = {
    nightstand: true,
    wardrobe: true,
    underBeds: true
};

function startRoomSearch() {
    Game.addDialogue("[Sistema: Búsqueda Limitada]", "Sistema");
    displaySearchOptions();
}

function displaySearchOptions() {
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

    if (searchesLeft === 0) {
        startExitSequence();
    }
}

async function searchNightstand() {
    searchState.nightstand = false;
    await Game.addDialogue("Hurgas en el cajón superior de la mesita. Tus dedos tocan metal frío y papel.", "Sistema");
    
    Game.addItem('keyItems', { id: 'flashlight', name: 'Linterna', description: 'Una linterna pequeña.', energy: 15 });
    Game.addItem('notes', NOTAS.nota1);
    Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 1, restore: 20 });

    await Game.addDialogue("¡Una linterna! ¡Genial, dámela, yo alumbraré!", "Rulo");
    
    Game.addChoice("DAR LINTERNA", handleGiveFlashlight);
    Game.addChoice("NEGARSE", handleRefuseFlashlight);
}

async function handleGiveFlashlight() {
    await Game.addDialogue("Confías en él. Rulo toma la linterna. Sus manos tiemblan, pero la enciende.", "Sistema");
    Game.removeItem('keyItems', 'flashlight');
    Game.updateRuloState('hasFlashlight', true);
    Game.updateRuloState('energy', 15, true);
    
    await triggerWindowEvent();
}

async function handleRefuseFlashlight() {
    await Game.addDialogue(`Le dices que tú la llevarás. Rulo te mira dolido. 'No es momento de ser egoísta, ${Game.getPlayerName()}'.`, "Tú");
    Game.updateRuloState('fear', 10);
    Game.addNotification("Miedo de Rulo +10", "danger");
    
    await triggerWindowEvent();
}

async function triggerWindowEvent() {
    await Game.addDialogue("Voy a... voy a ver qué hay afuera.", "Rulo");
    await Game.addDialogue("Apunta el haz hacia la ventana. Al principio, solo ven la lluvia golpeando el cristal.", "Sistema");
    await Game.wait(500);
    await Game.addDialogue("No veo na...", "Rulo");
    await Game.addDialogue("De repente, algo ENORME y pálido se estrella contra el cristal desde el exterior.", "Sistema");
    await Game.addDialogue("¡¡¡SKREEEEE!!!", "Sonido");
    
    Game.addDialogue("[Sistema: PÁNICO]", "Sistema");
    Game.updatePlayerState('fear', 25); // Total 50
    Game.updateRuloState('fear', 30); // Total 60
    Game.addNotification("Miedo +25", "danger");
    Game.addNotification("Miedo de Rulo +30", "danger");

    await Game.addDialogue("¡¡APÁGALA!! ¡¡APÁGALA!!", "Rulo");
    await Game.addDialogue("Rulo grita y deja caer la linterna. La habitación vuelve a sumirse en la oscuridad.", "Sistema");
    await Game.addDialogue("¡Rulo, cálmate! ¡Levanta la linterna! ¡Rápido!", "Tú");
    await Game.addDialogue("Rulo la recoge, temblando. 'Lo siento... yo... ¿qué era eso? Estamos en el piso 12... ¡nada puede estar ahí fuera!'", "Rulo");
    await Game.wait(500);

    displaySearchOptions();
}

async function searchWardrobe() {
    searchState.wardrobe = false;
    await Game.addDialogue("Rulo te alumbra mientras abres el armario metálico. Chirría ruidosamente.", "Sistema");
    Game.updatePlayerState('fear', 5);
    Game.addNotification("Miedo +5", "danger");
    await Game.addDialogue("Dentro hay una caja de cartón con la etiqueta 'Efectos Personales'.", "Sistema");
    
    if (Math.random() <= 0.60) Game.addItem('consumables', { id: 'water', name: 'Agua Embotellada', stack: 1, restore: 30 });
    if (Math.random() <= 0.50) Game.addItem('consumables', { id: 'cereal', name: 'Barra de Cereal Rancia', stack: 1, restore: 20 });
    if (Math.random() <= 0.40) Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 2, restore: 20 });
    if (Math.random() <= 0.30) Game.addItem('consumables', { id: 'bandage', name: 'Venda Sucia', stack: 1, restore: 10 });
    if (Math.random() <= 0.15) Game.addItem('consumables', { id: 'pills', name: 'Píldoras "Calmantes"', stack: 1, restore: -30 });
    if (Math.random() <= 0.05) Game.addItem('minigames', { id: 'tranqui_oso', name: 'Juguete "Tranqui-Oso"', description: "Reduce el miedo." });

    await Game.wait(500);
    displaySearchOptions();
}

async function searchUnderBeds() {
    searchState.underBeds = false;
    await Game.addDialogue("Deciden revisar bajo las camas. Rulo alumbra el suelo polvoriento.", "Sistema");
    await Game.addDialogue("¡Espera! ¡Ahí!", "Rulo");
    
    Game.addItem('notes', NOTAS.nota2);
    Game.addItem('consumables', { id: 'battery_spent', name: 'Baterías Gastadas', stack: 1, restore: 20 });

    await Game.wait(500);
    displaySearchOptions();
}

async function startExitSequence() {
    await Game.wait(500);
    await Game.addDialogue("La linterna de Rulo parpadea.", "Sistema");
    await Game.addDialogue("La batería se está muriendo. Tenemos que usar las que encontramos.", "Rulo");
    await Game.addDialogue("[Sistema: Abre la mochila (I), ve a 'Consumibles' y usa 'Baterías Gastadas' para recargar la linterna.]", "Sistema");
    
    await Game.wait(500);
    await Game.addDialogue("Bien. La puerta es la única salida. ¿El pasillo o la ventana?", "Tú");
    await Game.addDialogue("¡La ventana no! ¡Estamos a 12 pisos de altura y esa cosa estaba ahí! Tiene que ser la puerta. Pero... ¿y 'El Conserje' del que hablaba la nota?", "Rulo");
    await Game.wait(500);

    Game.addDialogue("[Decisión: Salir de la Habitación 1204]", "Sistema");
    Game.addChoice("ESCUCHAR EN LA PUERTA", handleExitListen);
    Game.addChoice("ABRIR LA PUERTA DE GOLPE", handleExitBash);
    Game.addChoice("ABRIR LA PUERTA LENTAMENTE", handleExitSneak);
}

// --- SECUENCIAS DE SALIDA (SIN "FIN DE LA DEMO") ---

async function handleExitListen() {
    await Game.addDialogue("Te acercas y pegas la oreja a la puerta metálica. Silencio total. Demasiado silencio.", "Tú");
    await Game.addDialogue("[Sistema: El camino al pasillo está abierto.]", "Sistema");
    // Aquí es donde llamarías a la función para cargar el siguiente nivel,
    // por ejemplo: Game.loadLevel('PasilloPiso12');
}
async function handleExitBash() {
    await Game.addDialogue("Abres la puerta con fuerza. El pasillo está oscuro y vacío, pero el ruido ha alertado a algo a lo lejos.", "Sistema");
    await Game.addDialogue("[Sistema: El camino al pasillo está abierto.]", "Sistema");
    // Aquí comenzaría un evento de persecución
}
async function handleExitSneak() {
    await Game.addDialogue("Abres la puerta con cuidado. El pasillo está oscuro. Rulo alumbra. Ven un rastro húmedo y oscuro que se aleja.", "Sistema");
    Game.setLocation("Pasillo Piso 12"); // Ejemplo de uso de la nueva función
    await Game.wait(1000); // Corrección de errata (era Game.all)
    await Game.addDialogue("[Sistema: El camino al pasillo está abierto.]", "Sistema");
}
