/* Motor.js */
import { getTheme, THEME_PALETTES, getNames } from '../../../settings-manager.js';

export class GameEngine {
    constructor() {
        this.state = {
            health: 100,
            hunger: 20, // 0 = sin hambre, 100 = muriendo de hambre
            thirst: 10,
            items: [], // Objetos usables
            notes: [], // Notas/Coleccionables
            flags: {}, 
            canMove: false, 
            collisionsEnabled: true,
            dialogCooldown: false, // Evita re-interacción inmediata
            inspecting: false, // Nuevo estado para el overlay de imagen
            readingNote: false, // Nuevo estado para leer notas
            activeMenu: null // 'status', 'inventory', null
        };
        
        this.names = getNames();
        this.playerPos = { x: 0, y: 0 };
        this.currentScene = null;
        this.dialogQueue = [];
        this.isTyping = false;
        
        this.init();
    }

    init() {
        // Referencias DOM
        this.dom = {
            player: document.getElementById('player'),
            map: document.getElementById('game-map'),
            // Botón Hamburguesa
            menuBtn: document.querySelector('.menu-icon'), // Selector más seguro
            
            // Referencias Nuevas
            inspectOverlay: document.getElementById('inspect-overlay'),
            inspectImage: document.getElementById('inspect-image'),
            inspectText: document.getElementById('inspect-text'),
            noteOverlay: document.getElementById('note-overlay'),
            noteContent: document.getElementById('note-content'),
            
            dialogBox: document.getElementById('dialog-box'),
            dialogName: document.getElementById('dialog-name'), // Referencia al nombre
            logContainer: document.getElementById('game-log'), // Referencia al nuevo contenedor de abajo
            dialogText: document.getElementById('dialog-text'),
            dialogCursor: document.getElementById('dialog-cursor'),
            statusMenu: document.getElementById('status-menu'),
            inventoryMenu: document.getElementById('inventory-menu'),
            
            // Barras
            barHealth: document.getElementById('bar-health'),
            barHunger: document.getElementById('bar-hunger'),
            barThirst: document.getElementById('bar-thirst'),
            valHealth: document.getElementById('val-health'),
            valHunger: document.getElementById('val-hunger'),
            valThirst: document.getElementById('val-thirst'),
            // Header Status y Objetivo
            headerState: document.getElementById('header-state-box'),
            objective: document.getElementById('objective-text')
        };

        this.setupInputs();
        
        // Loop Principal
        this.lastTime = 0;
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    setupInputs() {
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            // Teclas de Acción
            if (key === 'e') this.handleInteractInput(); // Centralizamos la lógica de E
            if (key === 'q') this.toggleMenu('status');
            if (key === 'i') this.toggleMenu('inventory');
            if (key === 'escape') this.toggleMenu('pause'); // Placeholder para menú pausa
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Opcional: Cerrar inspección con Click
        this.dom.inspectOverlay.addEventListener('click', () => {
            this.closeInspect();
        });

        // Click en Diálogo (Omitir / Avanzar)
        this.dom.dialogBox.addEventListener('click', () => {
            if (this.isTyping) {
                this.skipTyping();
            } else {
                this.advanceDialog();
            }
        });

        // Click en Hamburguesa
        this.dom.menuBtn.addEventListener('click', (e) => {
            this.toggleMenu('pause'); // Abre menú de pausa (o alerta por ahora)
        });

        // CLICK EN CAJA DE ESTADO (HEADER) - Ahora sí abre el menú
        this.dom.headerState.addEventListener('click', () => {
            this.toggleMenu('status');
        });

        // Lógica de Pestañas Inventario
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remover activo de todos
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                // Activar clickeado
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
            });
        });

    }
    
    // --- Lógica Centralizada de Interacción [E] ---
    handleInteractInput() {
        // 1. Si está inspeccionando una imagen -> Cerrar
        if (this.state.inspecting) {
            this.closeInspect();
            return;
        }

        // 2. Si está leyendo una nota -> Cerrar
        if (this.state.readingNote) {
            this.closeNoteView();
            return;
        }

        // 3. Si hay un diálogo activo
        if (this.dom.dialogBox.classList.contains('active')) {
            if (this.isTyping) {
                this.skipTyping(); // Omitir texto
            } else {
                this.advanceDialog(); // Cerrar/Avanzar
            }
            return;
        }

        // 4. Si hay un menú abierto (Inventario/Status) -> No hacer nada (o cerrarlo)
        if (this.state.activeMenu) {
            return;
        }

        // 5. Interacción Normal con el mundo
        if (!this.state.dialogCooldown) {
            this.tryInteract();
        }
    }

    // --- Lógica del Core ---

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (this.state.canMove && !this.state.activeMenu) {
            this.handleMovement(dt);
        }
        
        this.checkProximity(); // Iluminar objetos cercanos
        this.ySort(); // Ordenar profundidad (z-index)

        requestAnimationFrame(this.loop);
    }

    handleMovement(dt) {
        const speed = 250; // Pixeles por segundo
        let dx = 0;
        let dy = 0;

        if (this.keys['w']) dy -= speed * dt;
        if (this.keys['s']) dy += speed * dt;
        if (this.keys['a']) dx -= speed * dt;
        if (this.keys['d']) dx += speed * dt;

        if (dx !== 0 || dy !== 0) {
            const nextX = this.playerPos.x + dx;
            const nextY = this.playerPos.y + dy;

            if (!this.checkCollision(nextX, this.playerPos.y)) this.playerPos.x = nextX;
            if (!this.checkCollision(this.playerPos.x, nextY)) this.playerPos.y = nextY;

            this.updatePlayerSprite();
        }
    }

    updatePlayerSprite() {
        this.dom.player.style.transform = `translate(${this.playerPos.x}px, ${this.playerPos.y}px)`;
    }

    // Profundidad Real 2.5D
    ySort() {
        // La Z-index es igual a la posición Y. 
        // Objetos con Y mayor (más abajo) tapan a los de Y menor.
        
        // Jugador
        // +80 es la altura del sprite aprox, usamos la base (pies)
        this.dom.player.style.zIndex = Math.floor(this.playerPos.y + 80);

        // Objetos
        if(this.currentScene) {
            this.currentScene.objects.forEach(obj => {
                if(obj.domElement) {
                    // Usamos la base del objeto (Y + Altura)
                    obj.domElement.style.zIndex = Math.floor(obj.y + obj.h);
                }
            });
        }
    }

    checkCollision(x, y) {
        if (!this.state.collisionsEnabled) return false;

        // Hitbox de los pies del jugador (más pequeña que el sprite)
        const pRect = { x: x + 10, y: y + 60, w: 20, h: 20 };

        // Límites del mapa
        if (x < 0 || y < 0 || x > 760 || y > 520) return true;

        // Objetos
        for (let obj of this.currentScene.objects) {
            if (!obj.collision) continue;
            
            // Usamos la hitbox si existe, o el objeto completo si no
            const hbX = obj.hitbox ? (obj.x + obj.hitbox.x) : obj.x;
            const hbY = obj.hitbox ? (obj.y + obj.hitbox.y) : obj.y;
            const hbW = obj.hitbox ? obj.hitbox.w : obj.w;
            const hbH = obj.hitbox ? obj.hitbox.h : obj.h;

            // AABB Collision
            if (pRect.x < hbX + hbW &&
                pRect.x + pRect.w > hbX &&
                pRect.y < hbY + hbH &&
                pRect.y + pRect.h > hbY) {
                return true;
            }
        }
        return false;
    }

    checkProximity() {
        // Evitar crash si no hay escena cargada
        if (!this.currentScene) return;

        // Centro del jugador
        const cx = this.playerPos.x + 20;
        const cy = this.playerPos.y + 70;
        
        // AUMENTAMOS la distancia de detección para simular las cajas blancas grandes
        // sin afectar la colisión física (cajas moradas)
        let interactRange = 90; 
        let target = null;

        this.currentScene.objects.forEach(obj => {
            if (obj.domElement) {
                obj.domElement.classList.remove('interactive-highlight');
                // Remover burbujas antiguas
                const bubble = obj.domElement.querySelector('.interact-bubble');
                if(bubble) bubble.remove();
            }

            if (!obj.interaction) return;

            // Calcular centro del HITBOX del objeto (no del sprite completo)
            // obj.x/y es la posición visual, obj.hitbox es la colisión real si existe
            let ox, oy;
            
            if (obj.hitbox) {
                // Usar el centro del hitbox si está definido
                ox = (obj.x + obj.hitbox.x) + (obj.hitbox.w / 2);
                oy = (obj.y + obj.hitbox.y) + (obj.hitbox.h / 2);
            } else {
                // Fallback al objeto visual
                ox = obj.x + obj.w / 2;
                oy = obj.y + obj.h / 2; // Centrado verticalmente también para más consistencia
            }

            const dist = Math.hypot(cx - ox, cy - oy);

            if (dist < interactRange) {
                target = obj;
            }
        });

        if (target && target.domElement) {
            target.domElement.classList.add('interactive-highlight');
            
            // Crear burbuja [E] si no existe
            if(!target.domElement.querySelector('.interact-bubble')) {
                const b = document.createElement('div');
                b.className = 'interact-bubble';
                b.innerText = "[ E ] " + (target.name || "Interactuar");
                target.domElement.appendChild(b);
            }
            
            this.currentTarget = target;
        } else {
            this.currentTarget = null;
        }
    }

    tryInteract() {
        if (this.state.activeMenu) return; // No interactuar con menú abierto
        if (this.currentTarget) {
            this.currentTarget.interaction(this);
        }
    }

    // --- Sistema de UI ---

    toggleMenu(menuName) {
        // Cerrar si ya está abierto
        if (this.state.activeMenu === menuName) {
            this.state.activeMenu = null;
            this.dom.statusMenu.classList.add('hidden');
            this.dom.inventoryMenu.classList.add('hidden');
            this.state.canMove = true;
            return;
        }

        if (menuName === 'pause') {
            alert("PAUSA (En construcción)");
            return;
        }

        // Abrir
        this.state.activeMenu = menuName;
        this.state.canMove = false;

        if (menuName === 'status') {
            this.updateStatusBars();
            this.dom.statusMenu.classList.remove('hidden');
        } else if (menuName === 'inventory') {
            this.updateInventoryUI();
            this.dom.inventoryMenu.classList.remove('hidden');
        }
    }

    updateStatusBars() {
        this.dom.barHealth.style.width = this.state.health + '%';
        this.dom.barHunger.style.width = this.state.hunger + '%';
        this.dom.barThirst.style.width = this.state.thirst + '%';
        // Números
        this.dom.valHealth.innerText = this.state.health;
        this.dom.valHunger.innerText = this.state.hunger;
        this.dom.valThirst.innerText = this.state.thirst;
    }

    updateInventoryUI() {
        // Objetos
        const listItems = document.getElementById('list-items');
        listItems.innerHTML = '';
        if (this.state.items.length === 0) listItems.innerHTML = '<li>(Vacío)</li>';
        
        this.state.items.forEach(item => {
            const li = document.createElement('li');
            li.style.margin = '10px 0';
            li.innerHTML = `📦 ${item} <button class="decision-btn" style="font-size:0.8rem">USAR</button>`;
            listItems.appendChild(li);
        });

        // Notas
        const listNotes = document.getElementById('list-notes');
        listNotes.innerHTML = '';
        if (this.state.notes.length === 0) listNotes.innerHTML = '<li>(Sin Notas)</li>';

        this.state.notes.forEach(note => {
            const li = document.createElement('li');
            li.style.margin = '10px 0';
            // Botón para abrir nota
            const btn = document.createElement('button');
            btn.className = 'decision-btn';
            btn.style.width = '100%';
            btn.innerText = `📄 ${note.title}`;
            btn.onclick = () => this.viewNote(note); // Usamos el nuevo visor
            li.appendChild(btn);
            listNotes.appendChild(li);
        });
    }

    // --- FUNCIÓN RECUPERADA ---
    addNotification(text) {
        const p = document.createElement('p');
        p.innerText = `> ${text}`;
        p.style.animation = "fadeIn 0.5s";
        // Insertar al principio del log de abajo (lo más nuevo arriba)
        this.dom.logContainer.insertBefore(p, this.dom.logContainer.firstChild);
    }

    // --- Sistema de Diálogo ---

    // Ahora acepta un nombre opcional (si es null, usa "Tú" o no muestra nada)
    showDialog(text, choices = null, speakerName = null) {
        // 1. Limpiar intervalo anterior si existía (CRÍTICO para evitar texto corrupto)
        if (this.currentTypingInterval) clearInterval(this.currentTypingInterval);

        this.state.canMove = false;
        this.dom.dialogBox.classList.add('active'); // Mostrar caja
        this.dom.dialogCursor.classList.remove('visible'); // Ocultar flecha
        this.dom.dialogText.innerHTML = ""; // Limpiar

        // Gestionar Nombre
        if (speakerName) {
            this.dom.dialogName.innerText = speakerName;
            this.dom.dialogName.style.display = 'block';
        } else {
            // Si no hay nombre específico, usamos el del jugador por defecto o ocultamos
            this.dom.dialogName.style.display = 'none';
        }

        this.currentChoices = choices; // Guardar decisiones si hay
        this.fullText = "";
        
        // Procesar nombres
        this.fullText = text.replace('{PLAYER}', this.names.playerName || 'Tú')
                            .replace('{COMPANION}', this.names.companionName || 'Rulo');
        
        this.typewriterEffect(this.fullText);
    }

    typewriterEffect(text) {
        this.isTyping = true;
        let i = 0;
        const speed = 45; // Un poco más lento para leer mejor

        this.currentTypingInterval = setInterval(() => {
            // Usar textContent para evitar problemas de HTML, pero append
            this.dom.dialogText.textContent += text.charAt(i);
            
            // SONIDO (Asegurar que suene)
            const sfx = new Audio('../../../Assets/Audios/Dialogo 1.mp3');
            sfx.volume = 0.3;
            sfx.play().catch(e => {}); 

            i++;
            if (i >= text.length) {
                this.finishTyping(this.currentTypingInterval);
            }
        }, speed);
    }

    skipTyping() {
        clearInterval(this.currentTypingInterval);
        this.dom.dialogText.textContent = this.fullText; // Mostrar todo de golpe
        this.finishTyping(null);
    }

    finishTyping(interval) {
        if(interval) clearInterval(interval);
        this.isTyping = false;

        // Si hay decisiones, mostrarlas ahora
        if (this.currentChoices) {
            const choiceContainer = document.createElement('div');
            this.currentChoices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'decision-btn';
                btn.innerText = `[ ${choice.text} ]`;
                btn.onclick = () => {
                    this.dom.dialogBox.classList.remove('active');
                    choice.callback(this);
                };
                choiceContainer.appendChild(btn);
            });
            this.dom.dialogText.appendChild(document.createElement('br'));
            this.dom.dialogText.appendChild(choiceContainer);
        } else {
            this.dom.dialogCursor.classList.add('visible'); // Mostrar flecha solo si no hay decisiones
        }
    }

    advanceDialog() {
        if (this.currentChoices) return; // No avanzar si hay decisiones pendientes
        
        // Cerrar diálogo
        this.dom.dialogBox.classList.remove('active');
        this.state.canMove = true;
        
        // Activar cooldown breve para no volver a interactuar con el objeto inmediatamente si sigues presionando E
        this.state.dialogCooldown = true;
        setTimeout(() => { this.state.dialogCooldown = false; }, 300);
    }

    addItem(name) {
        this.state.items.push(name);
        this.addNotification(`+ ${name}`);
    }

    // --- NUEVO: Sistema de Inspección (Overlay) ---
    showInspect(imageSrc, text) {
        // Pausar movimiento
        this.state.canMove = false;
        this.state.inspecting = true;

        // Configurar elementos
        this.dom.inspectImage.style.backgroundImage = `url('${imageSrc}')`;
        this.dom.inspectText.innerText = text.replace('{COMPANION}', this.names.companionName || 'Rulo');
        
        // Mostrar
        this.dom.inspectOverlay.style.display = 'flex';
    }

    closeInspect() {
        this.state.inspecting = false;
        this.dom.inspectOverlay.style.display = 'none';
        this.state.canMove = true;
        // Pequeño cooldown para no re-abrir al instante
        this.state.dialogCooldown = true;
        setTimeout(() => { this.state.dialogCooldown = false; }, 300);
    }

    // --- NUEVO: Visor de Notas ---
    viewNote(noteObj) {
        this.state.canMove = false;
        this.state.readingNote = true;
        
        // Formatear contenido (convierte saltos de línea en <br>)
        const formattedContent = noteObj.content.replace(/\n/g, '<br>');

        this.dom.noteContent.innerHTML = `
            <h3>${noteObj.title}</h3>
            <p>${formattedContent}</p>
        `;
        
        this.dom.noteOverlay.style.display = 'flex';
    }

    closeNoteView() {
        this.state.readingNote = false;
        this.dom.noteOverlay.style.display = 'none';
        // Si abrimos desde el menú, técnicamente el menú sigue abierto (no canMove)
    }

    addNote(title, content) {
        this.state.notes.push({ title, content });
        this.addNotification(`+ Nota: ${title}`);
    }

    // --- FUNCIÓN QUE FALTABA (CRÍTICO) ---
    updateObjective(text) {
        if(!this.dom.objective) return;
        this.dom.objective.innerText = text;
        // Reiniciar animación para llamar la atención
        this.dom.objective.style.animation = 'none';
        this.dom.objective.offsetHeight; /* trigger reflow */
        this.dom.objective.style.animation = 'fadeIn 2s';
    }

    updateHeaderState(text, type = 'normal') {
        if(!this.dom.headerState) return;
        this.dom.headerState.innerText = text;
        this.dom.headerState.className = 'header-status-box'; // Limpiar clases previas
        this.dom.headerState.classList.add(`status-${type}`);
    }

    loadScene(scene) {
        this.currentScene = scene;
        scene.start(this);
    }
}