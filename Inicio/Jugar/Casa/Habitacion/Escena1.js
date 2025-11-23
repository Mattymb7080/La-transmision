/* Escena1.js FINAL */
import { GameEngine } from './Motor.js';

const engine = new GameEngine();

const RoomScene = {
    objects: [],

    start: (eng) => {
        // --- CONFIGURACIÓN INICIAL DEL JUGADOR (DURMIENDO) ---
        // Empezamos en la cama (Coordenadas de la cama)
        eng.playerPos = { x: 650, y: 420 }; // Más adentro de la cama
        eng.updatePlayerSprite();
        eng.dom.player.style.opacity = '1';
        
        // Rotamos al jugador para que parezca acostado
        eng.dom.player.style.transform = `translate(${eng.playerPos.x}px, ${eng.playerPos.y}px) rotate(180deg)`;
        
        eng.state.collisionsEnabled = false; // Sin colisiones al despertar
        eng.state.canMove = false; // No moverse aún

        // --- PISO / LÍMITES (Referencia Visual) ---
        createVisual(eng, 0, 0, 800, 600, '#1a1512', ''); 

        // --- MUEBLES ---

        // 1. ESCRITORIO (Arriba)
        createObject(eng, 'Escritorio', 
            250, 10, 250, 120, // Bajado un poco (Y=10)
            '../../../Assets/Imagenes/Cosas/Escritorio.png', 
            true,
            (e) => {
                if (e.playerPos.x < 350) {
                    // FOTO (Caja desvanecida mejorada)
                    e.showInspect('../../../Assets/Imagenes/Cosas/Feria ciencias.png', "La foto de la feria... éramos felices.");
                } else {
                    // AGENDA -> AHORA ES UNA NOTA
                    if (!e.state.flags.agenda) {
                        e.state.flags.agenda = true;
                        
                        // AÑADIMOS NOTA DIRECTAMENTE (No objeto)
                        e.addNote("Agenda de Rulo", "CONTACTOS:\n- Rulo: 555-0199\n- Casa: 555-4200\n\nNOTAS:\n'El código es mi año de nacimiento'.");
                        
                        e.updateObjective("Leer la Agenda (Presiona I -> Notas)");
                        e.showDialog("Aquí esta, lo llamaré luego.", null, "{PLAYER}");
                    } else {
                         e.showDialog("Solo basura escolar.", null, "{PLAYER}");
                    }
                }
           },
            0, { x: 10, y: 60, w: 230, h: 40 } // HITBOX AJUSTADA: Solo las patas/base, más pequeña
        );

        // 2. ARMARIO (Izquierda - Mirando a la derecha)
        createObject(eng, 'Armario', 
            -10, 200, 100, 200, // Ajustado pegado a la pared
            '../../../Assets/Imagenes/Cosas/Armario.png',
            true,
            (e) => {
                 if (!e.state.flags.armario) {
                    e.state.flags.armario = true;
                    e.addItem("Botella de Agua");
                    e.showDialog("Encontré agua.", null, "{PLAYER}");
                 } else {
                    e.showDialog("Solo ropa vieja.", null, "{PLAYER}");
                 }
            },
            -90, // ROTACIÓN CORRECTA: -90 grados (sentido antihorario) mira a la derecha
            { x: 20, y: 0, w: 60, h: 200 } // HITBOX VERDE: Ajustada al cuerpo físico del mueble
        );

        // 3. CAMA - ZONA 1 (Cuerpo/Cabecera - Textura)
        createObject(eng, 'Cama', 
            600, 400, 200, 200,   
            '../../../Assets/Imagenes/Cosas/Cama.png', 
            true, 
            (e) => { 
               // Aleatorio: Textura
               const text = Math.random() < 0.5 
                   ? "Las sábanas están frías y rasposas." 
                   : "El colchón está duro, pero sirve.";
               e.showDialog(text, null, "{PLAYER}");
            },
            0, 
            { x: 20, y: 20, w: 160, h: 120 } // Hitbox: Parte superior y media
        );

        // 3.1 CAMA - ZONA 2 (Pies/Debajo - Invisible)
        createObject(eng, 'Bajo Cama', 
            600, 540, 200, 60, // Ubicado en la parte inferior de la cama
            null, true, // Invisible pero colisionable
            (e) => {
                // Secuencia: Buscar y Monstruos
                e.showDialog("Busqué debajo de la cama... solo hay polvo.", [
                    { 
                        text: "...", 
                        callback: (eng2) => {
                             eng2.showDialog("Ya no creo en monstruos... o eso creo.", null, "{PLAYER}");
                        }
                    }
                ], "{PLAYER}");
            },
            0,
            { x: 20, y: 0, w: 160, h: 60 } // Hitbox: Parte inferior
        );

        // 4. VENTANA (Abajo - Pared Sur)
        createObject(eng, 'Ventana', 
            350, 580, 100, 20,    
            null, true, 
            (e) => {
                e.showInspect('../../../Assets/Imagenes/El miron.jpg', "Siento que me observan...");
            },
            0, { x: 0, y: 0, w: 100, h: 20 }
        );
        createVisual(eng, 350, 595, 100, 5, '#88ccff', ''); 

        // 5. PUERTA (Derecha)
        createObject(eng, 'Puerta', 
            780, 50, 20, 120, 
            null, true, 
            (e) => {
                if(!e.state.flags.agenda) {
                    e.showDialog("Necesito el número de Rulo.", null, "{PLAYER}");
                } else {
                    e.showDialog("¿Salir?", [
                         { text: "Sí", callback: () => alert("FIN DEMO") },
                         { text: "No", callback: (eng) => eng.advanceDialog() }
                    ], "{PLAYER}");
                }
            },
            0, { x: -10, y: 0, w: 30, h: 120 }
        );
        createVisual(eng, 790, 50, 10, 120, '#5a3e36', '');

        // --- INICIAR SECUENCIA ---
        runIntro(eng);
    }
};

// --- FUNCIONES AUXILIARES ---

function createObject(eng, name, x, y, w, h, src, collision, interaction, rotation = 0, hitboxOverride = null) {
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
        el.style.backgroundPosition = 'center'; // Centrado
        if (rotation) el.style.transform = `rotate(${rotation}deg)`;
        eng.dom.map.appendChild(el);
    }
    const finalHitbox = hitboxOverride ? hitboxOverride : { x: 0, y: 0, w: w, h: h };
    eng.currentScene.objects.push({ name, x, y, w, h, collision, interaction, domElement: el, hitbox: finalHitbox });
}

function createVisual(eng, x, y, w, h, color) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = x+'px'; el.style.top = y+'px';
    el.style.width = w+'px'; el.style.height = h+'px';
    el.style.background = color;
    el.style.zIndex = 0; 
    eng.dom.map.appendChild(el);
}

function runIntro(eng) {
    const gameView = document.getElementById('game-view');
    gameView.classList.add('eyes-closed');
    eng.updateObjective("Despertar...");

    setTimeout(() => {
        gameView.classList.remove('eyes-closed');
        gameView.classList.add('eyes-open');
        
        // Diálogo inicial con callback para despertar
        eng.showDialog("Ugh... mi cabeza...", [
            { text: "Levantarse", callback: (e) => wakeUpSequence(e) }
        ], "{PLAYER}");
    }, 1500);
}

// --- SECUENCIA DE DESPERTAR ---
function wakeUpSequence(eng) {
    eng.advanceDialog(); // Cerrar diálogo
    
    // Animación: Deslizarse a la izquierda (salir de la cama)
    let steps = 0;
    const interval = setInterval(() => {
        eng.playerPos.x -= 4; // Mover a la izquierda
        eng.playerPos.y -= 1; // Un poco arriba
        eng.updatePlayerSprite(); // Actualizar posición pero manteniendo rotación (css transform lo maneja el motor, ojo aqui)
        
        // *Truco*: Como updatePlayerSprite resetea el transform, forzamos la rotación manualmente durante la animación
        eng.dom.player.style.transform = `translate(${eng.playerPos.x}px, ${eng.playerPos.y}px) rotate(180deg)`;

        steps++;
        if (steps > 20) { // Menos pasos para que quede cerca de la cama (antes 40)
            clearInterval(interval);
            // Poner de pie
            eng.dom.player.style.transform = `translate(${eng.playerPos.x}px, ${eng.playerPos.y}px) rotate(0deg)`;
            
            eng.state.collisionsEnabled = true;
            eng.state.canMove = true;
            eng.updateObjective("Buscar Agenda");
            eng.addNotification("Te has levantado.");
        }
    }, 20);
}

engine.loadScene(RoomScene);