/* Escena1.js */
import { GameEngine } from './Motor.js';

const engine = new GameEngine();

const RoomScene = {
    objects: [],

    start: (eng) => {
        // --- 1. Configurar Jugador ---
        // Posición inicial (SOBRE LA CAMA, AJUSTADO)
        // La cama está en X=550, Y=300. El jugador debe estar encima.
        eng.playerPos = { x: 600, y: 350 }; 
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
                    if (!e.state.flags.agenda) {
                        e.state.flags.agenda = true;
                        e.addItem("Agenda Telefónica");
                        e.showDialog("Conseguí la agenda. Ahora a buscar un teléfono.", null, "Objetivo");
                    } else {
                         e.showDialog("Son las cosas de {COMPANION}. Mejor no husmear más.", null, e.names.playerName);
                    }
                }
           },
            0, // Rotación
            // HITBOX (Morado): Solo la base
            { x: 10, y: 50, w: 280, h: 40 } 
        );

        // CAMA (Asegurada dentro del mapa)
        // Mapa es 800px ancho. Cama w=200. X debe ser < 600.
        createObject(eng, 'Cama', 
            550, 300, // Subida un poco para dejar espacio abajo
            200, 220, // Tamaño visual
            '../../../Assets/Imagenes/Cosas/Cama.png', 
            true, // Tiene colisión
            (e) => { 
               e.showDialog("Solo polvo. Ya no creo en monstruos... creo.", null, e.names.playerName);
            },
            180, 
            // HITBOX (Morado): Dejamos que el jugador camine "sobre" la cabecera un poco
            { x: 10, y: 60, w: 180, h: 150 } 
        );

        // ARMARIO (Pegado a la izquierda)
        createObject(eng, 'Armario', 
            0, 250, // X=0 Pegado a pared izquierda
            100, 280, // AUMENTADO TAMAÑO VISUAL
            '../../../Assets/Imagenes/Cosas/Armario.png',
            true,
            (e) => {
                if(e.state.flags.armario) {
                     e.showDialog("Solo ropa vieja.", null, "Armario");
                } else {
                    e.state.flags.armario = true;
                    
                    // Lógica RNG (Probabilidades)
                    const rand = Math.random();
                    
                    if (rand < 0.30) {
                        // 30% Agua
                        e.addItem("Botella de Agua");
                        e.showDialog("Mamá siempre guarda cosas aquí. Encontré agua.", null, e.names.playerName);
                    } else if (rand < 0.70) {
                        // 40% Barra (0.30 a 0.70)
                        e.addItem("Barra de Cereal");
                        e.showDialog("Una barra de cereal, qué suerte.", null, e.names.playerName);
                    } else {
                        // 30% Nada
                        e.showDialog("Solo ropa vieja. Juraría que había guardado algo aquí.", null, e.names.playerName);
                    }
                }
            },
            -90, 
            // HITBOX (Morado): Base pequeña
            { x: 0, y: 220, w: 90, h: 60 } 
        );


        // INTERACTUABLES (Ventana y Puerta)
        
        // Ventana (Abajo Izquierda)
        createObject(eng, 'Ventana', 
            80, 560, // Posición
            120, 40, // Tamaño
            null, true, 
            (e) => {
                // Interacción de Ventana: Ver calle/auto
                e.showInspect('../../../Assets/Imagenes/El miron.jpg', "El auto de papá está encendido. Veo las luces reflejadas en el asfalto mojado.");
            },
            0,
            { x: 0, y: 0, w: 120, h: 40 }
        );
        
        // Luz de Ventana (Efecto Visual)
        createVisual(eng, 80, 460, 120, 100, 'linear-gradient(to bottom, rgba(200, 255, 255, 0.15), rgba(0,0,0,0))', '');
        createVisual(eng, 80, 580, 120, 20, '#2b3a42', ''); // Visual marco

        // Puerta (PARED DERECHA VERTICAL - Salida Lateral)
        createObject(eng, 'Puerta', 
            770, 50, // Un poco más adentro para que se vea
            30, 120, 
            null, true, 
            (e) => {
                if(!e.state.flags.agenda) {
                    e.showDialog("No puedo irme sin el número de Rulo. Prometí llamar.", null, e.names.playerName);
                } else {
                    e.showDialog("¿Debería salir ya?", [
                        { text: "Sí, salir", callback: () => alert("FIN DE LA DEMO") },
                        { text: "Aún no", callback: (eng) => eng.showDialog("Revisaré una vez más.", null, e.names.playerName) }
                    ], "Puerta");
                }
            },
            0,
            { x: -10, y: 0, w: 40, h: 120 } 
        );
        createVisual(eng, 780, 50, 20, 120, '#5a3e36', ''); // Visual (Marco puerta)


        // --- 3. Secuencia de Inicio ---
        runIntro(eng);
    }
};

function createObject(eng, name, x, y, w, h, src, collision, interaction, rotation = 0, hitboxOverride = null) {
    
    // --- NUEVO: RESTRICCIÓN DE MAPA (CLAMPING) ---
    // Aseguramos que el objeto nunca se dibuje fuera del canvas (800x600 aprox)
    // Dejamos un margen de seguridad
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > 800) x = 800 - w;
    if (y + h > 600) y = 600 - h;

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