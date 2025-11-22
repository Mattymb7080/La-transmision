/* Escena1.js */
import { GameEngine } from './Motor.js';

const engine = new GameEngine();

const RoomScene = {
    objects: [],

    start: (eng) => {
        // --- 1. Configurar Jugador ---
        // Posición inicial (ACCOSTADO EN CAMA)
        eng.playerPos = { x: 500, y: 400 }; // Un poco más centrado para no chocar al levantar
        eng.updatePlayerSprite();
        // Visible pero rotado (acostado)
        eng.dom.player.style.opacity = '1'; 
        eng.dom.player.style.transform = `translate(${eng.playerPos.x}px, ${eng.playerPos.y}px) rotate(90deg)`;
        eng.state.collisionsEnabled = false;

        // --- 2. Crear Muebles ---

        // ESCRITORIO
        createObject(eng, 'Escritorio', 
            20, 40,  
            300, 90, // AUMENTADO TAMAÑO VISUAL
            '../../../Assets/Imagenes/Cosas/Escritorio.png', 
            true,
            (e) => {
                // Lógica dividida por posición del jugador
                // El escritorio va de X=20 a X=320. Mitad = 170.
                
                if (e.playerPos.x < 170) {
                    // LADO IZQUIERDO: FOTO
                    e.showInspect(
                        '../../../Assets/Imagenes/Cosas/Feria ciencias.png',
                        "{COMPANION} y yo en 5to grado. Ganamos con la batería de papa."
                    );
                } else {
                    // LADO DERECHO: AGENDA
                    // (Aquí iría la lógica de la agenda que ya tenías)
                    if (!e.state.flags.agenda) {
                        // ... lógica de obtener agenda ...
                        e.state.flags.agenda = true;
                        e.addItem("Agenda Telefónica");
                        e.showDialog("Conseguí la agenda. Ahora a buscar un teléfono.");
                    } else {
                         e.showDialog("Son las cosas de {COMPANION}. Mejor no husmear más.");
                    }
                }
           },
            0, // Rotación
            { x: 10, y: 40, w: 280, h: 50 } // COLISIÓN: Solo la parte de abajo (patas)
        );

        // CAMA (Restaurada y Ajustada)
        createObject(eng, 'Cama', 
            550, 350, // Posición ajustada para que no salga del mapa
            200, 220, // Tamaño visual
            '../../../Assets/Imagenes/Cosas/Cama.png', 
            true, // Tiene colisión
            (e) => { 
               e.showDialog("Solo polvo. Ya no creo en monstruos... creo.");
            },
            180, 
            { x: 10, y: 40, w: 180, h: 170 } // COLISIÓN: Un poco más pequeña que la imagen visual
        );

        // ARMARIO (Pegado a la izquierda)
        createObject(eng, 'Armario', 
            0, 250, // X=0 Pegado a pared izquierda
            100, 280, // AUMENTADO TAMAÑO VISUAL
            '../../../Assets/Imagenes/Cosas/Armario.png',
            true,
            (e) => {
                if(e.state.flags.armario) {
                     e.showDialog("Solo ropa vieja.");
                } else {
                    e.state.flags.armario = true;
                    
                    // Lógica RNG (Probabilidades)
                    const rand = Math.random();
                    
                    if (rand < 0.30) {
                        // 30% Agua
                        e.addItem("Botella de Agua");
                        e.showDialog("Mamá siempre guarda cosas aquí. Encontré agua.");
                    } else if (rand < 0.70) {
                        // 40% Barra (0.30 a 0.70)
                        e.addItem("Barra de Cereal");
                        e.showDialog("Mamá siempre guarda cosas aquí. Una barra de cereal, qué suerte.");
                    } else {
                        // 30% Nada
                        e.showDialog("Solo ropa vieja. Juraría que había guardado algo aquí.");
                    }
                }
            },
            -90, 
            { x: 0, y: 180, w: 100, h: 100 } // COLISIÓN: Solo la base del armario
        );


        // INTERACTUABLES (Ventana y Puerta)
        
        // Ventana (Abajo Izquierda)
        createObject(eng, 'Ventana', 
            80, 560, // Posición
            120, 40, // Tamaño
            null, true, 
            (e) => {
                // Mostrar "Auto" (Usando una imagen temporal, asegúrate de tener una imagen de auto o calle)
                // Si no tienes imagen de auto, usa 'El miron.jpg' como placeholder o sube una.
                e.showInspect('../../../Assets/Imagenes/El miron.jpg', "El auto de papá está listo. Están impacientes.");
            },
            0,
            { x: 0, y: 0, w: 120, h: 40 }
        );
        
        // Luz de Ventana (Efecto Visual)
        // Creamos un div amarillo semitransparente sobre el suelo frente a la ventana
        createVisual(eng, 80, 480, 120, 100, 'linear-gradient(to bottom, rgba(255, 255, 200, 0.1), rgba(255, 255, 200, 0))', '');
        createVisual(eng, 80, 580, 120, 20, '#2b3a42', ''); // Visual

        // Puerta (PARED DERECHA VERTICAL - Salida Lateral)
        // Ajustada posición más pegada a la pared derecha (X=780)
        createObject(eng, 'Puerta', 
            760, 50, // Un poco más adentro para que se vea
            20, 120, 
            null, true, 
            (e) => {
                if(!e.state.flags.agenda) e.showDialog("No puedo irme sin el número de Rulo.");
                else e.showDialog("¿Debería salir ya?");
            },
            0,
            { x: -10, y: 0, w: 30, h: 120 } // Hitbox un poco más ancha para facilitar click
        );
        createVisual(eng, 780, 50, 20, 120, '#5a3e36', ''); // Visual (Marco puerta)


        // --- 3. Secuencia de Inicio ---
        runIntro(eng);
    }
};

function createObject(eng, name, x, y, w, h, src, collision, interaction, rotation = 0, hitboxOverride = null) {
    // 1. Elemento Visual (DOM)
    let el = null;
    if (src) {
        el = document.createElement('div');
        el.className = 'sprite';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.style.backgroundImage = `url('${src}')`;
        el.style.backgroundSize = 'contain'; // Ajuste para que se vea entero
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'bottom center'; // Alinear abajo
        if (rotation) el.style.transform = `rotate(${rotation}deg)`;
        eng.dom.map.appendChild(el);
    }
    
    // DEBUG: Descomenta esto si quieres ver las cajas rojas y entender por qué chocas
    /*
    const debug = document.createElement('div');
    const hb = hitboxOverride || {x:0, y:0, w:w, h:h};
    debug.style.position = 'absolute';
    debug.style.border = '1px solid red';
    debug.style.left = (x + hb.x) + 'px';
    debug.style.top = (y + hb.y) + 'px';
    debug.style.width = hb.w + 'px';
    debug.style.height = hb.h + 'px';
    eng.dom.map.appendChild(debug);
    */

    // 2. Lógica de Colisión (Hitbox separado)
    // Si pasamos hitboxOverride, usamos eso. Si no, usamos el tamaño visual (w, h)
    const finalHitbox = hitboxOverride ? hitboxOverride : { x: 0, y: 0, w: w, h: h };

    // 2. Lógica
    eng.currentScene.objects.push({
        name, x, y, w, h, 
        collision, 
        interaction, 
        domElement: el,
        hitbox: finalHitbox // Guardamos la hitbox para el Motor
    });
    
    // DEBUG: Visualizar Hitbox (Opcional, descomentar para ver cajas rojas)
    /*
    const debugBox = document.createElement('div');
    debugBox.style.position = 'absolute';
    debugBox.style.left = (x + finalHitbox.x) + 'px';
    debugBox.style.top = (y + finalHitbox.y) + 'px';
    debugBox.style.width = finalHitbox.w + 'px';
    debugBox.style.height = finalHitbox.h + 'px';
    debugBox.style.border = '1px solid red';
    debugBox.style.pointerEvents = 'none';
    debugBox.style.zIndex = 9999;
    eng.dom.map.appendChild(debugBox);
    */
}

function createVisual(eng, x, y, w, h, color, labelText) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = x+'px'; el.style.top = y+'px';
    el.style.width = w+'px'; el.style.height = h+'px';
    el.style.background = color;
    el.style.zIndex = 0; // Detrás
    
    // Texto indicador
    if (labelText) {
        const lbl = document.createElement('div');
        lbl.className = 'visual-indicator';
        lbl.innerText = labelText;
        el.appendChild(lbl);
    }
    
    eng.dom.map.appendChild(el);
}

function runIntro(eng) {
    const gameView = document.getElementById('game-view');
    
    // 1. INICIO: Ojos cerrados
    gameView.classList.add('eyes-closed');
    eng.state.canMove = false;
    
    if(typeof eng.updateHeaderState === 'function') {
        eng.updateHeaderState('DURMIENDO', 'normal'); // Gris
    }
    
    // SECUENCIA PROGRESIVA
    setTimeout(() => {
        // 2. Fase 1: Apenas abre (oscuro)
        gameView.classList.remove('eyes-closed');
        gameView.classList.add('blink-phase-1');
        
        setTimeout(() => { 
            // 3. Cierra otra vez
            gameView.classList.remove('blink-phase-1');
            gameView.classList.add('eyes-closed');
            
            setTimeout(() => { 
                // 4. Fase 2: Abre más
                gameView.classList.remove('eyes-closed');
                gameView.classList.add('blink-phase-2');
                
                setTimeout(() => {
                    // 5. Cierra ultima vez
                    gameView.classList.remove('blink-phase-2');
                    gameView.classList.add('eyes-closed');

                    setTimeout(() => {
                         // 6. ABRE TOTALMENTE (Clase eyes-open forza height 0)
                         gameView.classList.remove('eyes-closed');
                         gameView.classList.add('eyes-open');
                         
                         setTimeout(() => {
                            eng.showDialog("Ugh... mi cabeza... ¿Qué hora es?", [
                                { text: "Levantarse", callback: (e) => wakeUpSequence(e) },
                                { text: "Dormir más", callback: (e) => { 
                                    e.showDialog("No... tengo que buscar a Rulo.", [
                                         { text: "Levantarse", callback: (eng2) => wakeUpSequence(eng2) }
                                    ]); 
                                }}
                            ]);
                         }, 1000);
                    }, 1000);
                }, 2000); 

            }, 1500); 
        }, 2000); 
    }, 1000); // Tiempo inicial antes de empezar
}

function wakeUpSequence(eng) {
    eng.addNotification("Te levantas de la cama."); 
    
    // Animación de levantarse (Deslizarse a la izquierda y rotar)
    const targetX = eng.playerPos.x - 100;
    
    // Usamos un intervalo simple para animar el movimiento
    let steps = 0;
    const interval = setInterval(() => {
        eng.playerPos.x -= 5;
        eng.updatePlayerSprite();
        steps++;
        
        if (eng.playerPos.x <= targetX) {
            clearInterval(interval);
            // Poner de pie
            eng.dom.player.style.transform = `translate(${eng.playerPos.x}px, ${eng.playerPos.y}px) rotate(0deg)`;
            
            eng.updateObjective("Buscar Agenda Telefónica");
            eng.updateHeaderState("NORMAL", "normal");

            eng.state.collisionsEnabled = true;
            eng.state.canMove = true;
        }
    }, 20);
}

// Inicializar
engine.loadScene(RoomScene);