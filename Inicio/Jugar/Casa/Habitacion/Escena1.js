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

        // ESCRITORIO (Más grande, Hitbox ajustada)
        createObject(eng, 'Escritorio', 
            20, 40,  
            300, 90, // AUMENTADO TAMAÑO VISUAL
            '../../../Assets/Imagenes/Cosas/Escritorio.png', 
            true,
            (e) => {
                e.showDialog("La foto de {COMPANION} y yo. Éramos inseparables.");
            }
        );

        // CAMA (Tamaño original)
        createObject(eng, 'Cama', 
            560, 380, 
            200, 220,  
            '../../../Assets/Imagenes/Cosas/Cama.png', 
            true, // Tiene colisión
            (e) => { 
               e.showDialog("Debajo de la cama... Solo hay pelusas.");
            },
            180 
        );

        // ARMARIO (Más grande, Hitbox fina)
        createObject(eng, 'Armario', 
            20, 280, // MOVIDO ADENTRO (x=20)
            100, 280, // AUMENTADO TAMAÑO VISUAL
            '../../../Assets/Imagenes/Cosas/Armario.png',
            true,
            (e) => {
                if(e.state.flags.armario) {
                     e.showDialog("Vacío.");
                } else {
                    e.state.flags.armario = true;
                    e.addItem("Barra Energética");
                     e.showDialog("Encontré comida.");
                }
            },
            -90
        );

        // GENERAR NÚMERO ALEATORIO PARA RULO
        const ruloNumber = Math.floor(Math.random() * 9000000) + 1000000;

        // ITEM: Agenda
        createObject(eng, 'Mesita', 100, 220, 40, 40, null, true, (e) => {
            if (!e.state.flags.agenda) {
                e.state.flags.agenda = true;
                e.addNote("Agenda de Rulo", `El número de Rulo es: 55-${ruloNumber}`);
                e.showDialog("¡Aquí está! La agenda. Ahora necesito un teléfono.");
                e.updateHeaderState("ANSIOSO", "warning");
            }
        });

        // INTERACTUABLES (Ventana y Puerta)
        
        // Ventana (Abajo Izquierda)
        createObject(eng, 'Ventana', 80, 580, 120, 20, null, true, (e) => {
            e.showDialog("Está lloviendo... el cielo se ve extraño.");
        });
        createVisual(eng, 80, 580, 120, 20, '#2b3a42', ''); // Visual

        // Puerta (PARED DERECHA VERTICAL - Salida Lateral)
        createObject(eng, 'Puerta', 750, 50, 50, 120, null, true, (e) => {
             if(!e.state.flags.agenda) e.showDialog("No puedo irme sin el número de Rulo.");
             else e.showDialog("¿Debería salir ya?");
        });
        createVisual(eng, 760, 50, 20, 120, '#5a3e36', ''); // Visual (Marco puerta)


        // --- 3. Secuencia de Inicio ---
        runIntro(eng);
    }
};

function createObject(eng, name, x, y, w, h, src, collision, interaction, rotation = 0) {
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
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        if (rotation) el.style.transform = `rotate(${rotation}deg)`;
        eng.dom.map.appendChild(el);
    }

    // 2. Lógica
    eng.currentScene.objects.push({
        name, x, y, w, h, 
        collision, 
        interaction, 
        domElement: el 
    });
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