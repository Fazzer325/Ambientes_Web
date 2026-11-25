const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Configuración personalizada del juego
const CONFIG = {
    puntosPorGolpe: 5,         // Puntaje de incremento (+5 en lugar de +1)
    golpesPorNivel: 3,         // Cada cuántos golpes se sube de nivel
    aumentoPorNivel: 1.15,     // La pelota va 15% más rápido en cada nivel
    velocidadMaxima: 16,       // Límite para que la pelota no atraviese la paleta
    anchoPared: 10,
    claveHistorial: "pongParedHistorial",
    claveJugador: "pongParedJugador",
    claveOpciones: "pongParedOpciones",
    maxHistorial: 3
};

// Velocidad inicial de la pelota según la dificultad elegida
const DIFICULTADES = {
    facil: 4,
    normal: 5,
    dificil: 7
};

// Esquemas de teclas que se pueden elegir en Opciones (en minúsculas, como e.key.toLowerCase())
const CONTROLES = {
    clasico: { arriba: ["w", "arrowup"], abajo: ["s", "arrowdown"], texto: "W / ↑ para subir y S / ↓ para bajar" },
    ik: { arriba: ["i"], abajo: ["k"], texto: "I para subir y K para bajar" }
};

// Altura de la paleta según el tamaño elegido
const TAMANOS_PALETA = {
    pequena: 70,
    normal: 100,
    grande: 130
};

// Personalización por defecto
const OPCIONES_DEFECTO = {
    colorTablero: "#0b6e4f",
    colorPaleta: "#ff6b6b",
    colorPelota: "#ffffff",
    tamanoPaleta: "normal",
    controles: "clasico"
};

// Estado del juego
const paddle = {
    x: 30,
    y: 175,
    width: 15,
    height: 100,
    speed: 7,
    dy: 0
};

const ball = {
    x: 400,
    y: 225,
    radius: 10,
    speedX: 5,
    speedY: 5
};

let score = 0;
let nivel = 1;
let golpes = 0;
let jugador = "";
let velocidadInicial = DIFICULTADES.normal;
let estado = "inicio";         // "inicio" | "jugando" | "pausa" | "fin"
let animacionId = null;
let avisoNivelHasta = 0;
let ultimoTiempo = null;
let opciones = { ...OPCIONES_DEFECTO };
let fondoPaleta = "#ff6b6b";
let colorTexto = "#fff";
let pantallaAnterior = null;   // A dónde regresa el botón "Volver" de Opciones

// Teclas presionadas (así soltar una tecla no frena la otra)
const teclas = { arriba: false, abajo: false };

// Elementos de la interfaz
const pantallaInicio = document.getElementById("pantallaInicio");
const pantallaPausa = document.getElementById("pantallaPausa");
const pantallaOpciones = document.getElementById("pantallaOpciones");
const pantallaFin = document.getElementById("pantallaFin");
const pantallas = [pantallaInicio, pantallaPausa, pantallaOpciones, pantallaFin];
const formInicio = document.getElementById("formInicio");
const inputNombre = document.getElementById("nombreJugador");
const selectDificultad = document.getElementById("dificultad");
const errorNombre = document.getElementById("errorNombre");
const textoResultado = document.getElementById("resultado");
const tablaHistorial = document.getElementById("tablaHistorial");
const textoControles = document.getElementById("textoControles");
const btnPausa = document.getElementById("btnPausa");
const avisoOpciones = document.getElementById("avisoOpciones");
const optTablero = document.getElementById("optTablero");
const optPaleta = document.getElementById("optPaleta");
const optPelota = document.getElementById("optPelota");
const optTamano = document.getElementById("optTamano");
const optControles = document.getElementById("optControles");

// Captura de eventos del teclado
document.addEventListener("keydown", (e) => {
    const tecla = e.key.toLowerCase();

    // P o Esc: pausar / continuar / cerrar opciones
    if (tecla === "p" || tecla === "escape") {
        if (estado === "jugando") {
            e.preventDefault();
            pausar();
            return;
        }
        if (!pantallaOpciones.classList.contains("oculto") && tecla === "escape") {
            e.preventDefault();
            cerrarOpciones();
            return;
        }
        if (estado === "pausa" && pantallaOpciones.classList.contains("oculto")) {
            e.preventDefault();
            reanudar();
            return;
        }
    }

    if (estado !== "jugando") return;
    const control = CONTROLES[opciones.controles];
    if (control.arriba.includes(tecla)) {
        e.preventDefault(); // Que las flechas no muevan la página
        teclas.arriba = true;
    } else if (control.abajo.includes(tecla)) {
        e.preventDefault();
        teclas.abajo = true;
    }
    actualizarDireccion();
});
document.addEventListener("keyup", (e) => {
    const tecla = e.key.toLowerCase();
    const control = CONTROLES[opciones.controles];
    if (control.arriba.includes(tecla)) {
        teclas.arriba = false;
    } else if (control.abajo.includes(tecla)) {
        teclas.abajo = false;
    }
    actualizarDireccion();
});

function actualizarDireccion() {
    paddle.dy = (Number(teclas.abajo) - Number(teclas.arriba)) * paddle.speed;
}

function soltarTeclas() {
    teclas.arriba = false;
    teclas.abajo = false;
    paddle.dy = 0;
}

// Lógica de físicas y colisiones
// "factor" ajusta el movimiento al tiempo real: vale 1 a 60 FPS, 0.5 a 120 FPS, etc.
// Así la pelota va igual de rápido en cualquier monitor (60, 120, 144 Hz...).
function update(factor = 1) {
    // 1. Movimiento de la paleta
    paddle.y += paddle.dy * factor;

    // Limitar la paleta para que no salga del Canvas
    limitarPaleta();

    // 2. Movimiento de la pelota
    ball.x += ball.speedX * factor;
    ball.y += ball.speedY * factor;

    // Rebote superior e inferior (se recoloca para que no se quede pegada)
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.speedY = Math.abs(ball.speedY);
    } else if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.speedY = -Math.abs(ball.speedY);
    }

    // Rebote en la pared derecha (simulando el modo práctica)
    const bordePared = canvas.width - CONFIG.anchoPared;
    if (ball.x + ball.radius > bordePared) {
        ball.x = bordePared - ball.radius;
        ball.speedX = -Math.abs(ball.speedX);
    }

    // 3. Colisión de la pelota con la paleta (solo si viene hacia la izquierda)
    if (
        ball.speedX < 0 &&
        ball.x - ball.radius < paddle.x + paddle.width &&
        ball.x + ball.radius > paddle.x &&
        ball.y > paddle.y &&
        ball.y < paddle.y + paddle.height
    ) {
        ball.speedX = Math.abs(ball.speedX);
        ball.x = paddle.x + paddle.width + ball.radius; // Evitar que la pelota se "atasque"
        score += CONFIG.puntosPorGolpe;
        golpes++;

        // Subir de nivel cada cierto número de golpes
        if (golpes % CONFIG.golpesPorNivel === 0) {
            subirNivel();
        }
    }

    // 4. Fin del juego si la pelota sale por la izquierda
    if (ball.x + ball.radius < 0) {
        finDelJuego();
    }
}

function limitarPaleta() {
    if (paddle.y < 0) paddle.y = 0;
    if (paddle.y + paddle.height > canvas.height) paddle.y = canvas.height - paddle.height;
}

// Aumenta la velocidad de la pelota al subir de nivel
function subirNivel() {
    nivel++;
    ball.speedX = limitarVelocidad(ball.speedX * CONFIG.aumentoPorNivel);
    ball.speedY = limitarVelocidad(ball.speedY * CONFIG.aumentoPorNivel);
    avisoNivelHasta = performance.now() + 1200;
}

function limitarVelocidad(v) {
    const signo = Math.sign(v) || 1;
    return signo * Math.min(Math.abs(v), CONFIG.velocidadMaxima);
}

// Función para reiniciar el estado
function resetGame() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = velocidadInicial;
    ball.speedY = Math.random() < 0.5 ? velocidadInicial : -velocidadInicial;
    paddle.y = (canvas.height - paddle.height) / 2;
    soltarTeclas();
    score = 0;
    nivel = 1;
    golpes = 0;
    avisoNivelHasta = 0;
}

// Dibujo de los elementos en el Canvas
function draw() {
    // Limpiar el fotograma anterior (el fondo del tablero viene del CSS)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Línea central punteada, como en una mesa de ping-pong
    ctx.strokeStyle = colorTexto === "#fff" ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dibujar pared derecha (visual)
    ctx.fillStyle = "#e67e22";
    ctx.fillRect(canvas.width - CONFIG.anchoPared, 0, CONFIG.anchoPared, canvas.height);

    // Dibujar paleta con fondo degradado
    ctx.fillStyle = fondoPaleta;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Dibujar pelota
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = opciones.colorPelota;
    ctx.fill();
    ctx.closePath();

    // Dibujar marcador: jugador, puntos y nivel
    ctx.fillStyle = colorTexto;
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Jugador: " + jugador, 70, 32);
    ctx.textAlign = "center";
    ctx.font = "30px Arial";
    ctx.fillText("Puntos: " + score, canvas.width / 2, 40);
    ctx.textAlign = "right";
    ctx.font = "20px Arial";
    ctx.fillText("Nivel: " + nivel, canvas.width - 30, 32);

    // Aviso temporal al subir de nivel
    if (performance.now() < avisoNivelHasta) {
        ctx.textAlign = "center";
        ctx.font = "bold 44px Arial";
        ctx.fillStyle = "#feca57";
        ctx.fillText("¡Nivel " + nivel + "!", canvas.width / 2, canvas.height / 2);
    }
}

// Bucle de animación principal
function gameLoop(tiempo) {
    // Milisegundos desde el fotograma anterior, convertidos a "fotogramas de 60 FPS".
    // Se limita a 2 para que un tirón (cambiar de pestaña) no haga saltar la pelota.
    const factor = ultimoTiempo === null ? 1 : Math.min((tiempo - ultimoTiempo) / (1000 / 60), 2);
    ultimoTiempo = tiempo;

    update(factor);
    draw();
    if (estado === "jugando") {
        animacionId = requestAnimationFrame(gameLoop);
    }
}

// ---------- Pantallas ----------

// Muestra una pantalla encima del tablero (o ninguna si se pasa null)
function mostrarPantalla(pantalla) {
    pantallas.forEach((p) => p.classList.toggle("oculto", p !== pantalla));
    btnPausa.disabled = estado !== "jugando";
}

// ---------- Nombre del jugador ----------

// Limpia y valida el nombre: 1 a 15 caracteres, letras, números, espacios, punto, guion y guion bajo
function validarNombre(texto) {
    const nombre = texto.trim().replace(/\s+/g, " ");
    if (nombre.length === 0) return { ok: false, error: "Escribe tu nombre para jugar." };
    if (nombre.length > 15) return { ok: false, error: "Máximo 15 caracteres." };
    if (!/^[\p{L}\p{N} ._-]+$/u.test(nombre)) {
        return { ok: false, error: "Usa solo letras, números, espacios, punto o guiones." };
    }
    return { ok: true, nombre };
}

formInicio.addEventListener("submit", (e) => {
    e.preventDefault();
    const resultado = validarNombre(inputNombre.value);
    if (!resultado.ok) {
        errorNombre.textContent = resultado.error;
        inputNombre.focus();
        return;
    }
    errorNombre.textContent = "";
    jugador = resultado.nombre;
    velocidadInicial = DIFICULTADES[selectDificultad.value] || DIFICULTADES.normal;
    guardarEnStorage(CONFIG.claveJugador, jugador);
    iniciarPartida();
});

function iniciarPartida() {
    resetGame();
    estado = "jugando";
    mostrarPantalla(null);
    quitarFoco(); // Que las teclas no escriban en el formulario ni "pulsen" botones
    ultimoTiempo = null;
    cancelAnimationFrame(animacionId);
    animacionId = requestAnimationFrame(gameLoop);
}

function quitarFoco() {
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }
}

// ---------- Pausa ----------

function pausar() {
    if (estado !== "jugando") return;
    estado = "pausa";
    cancelAnimationFrame(animacionId);
    soltarTeclas();
    draw();
    mostrarPantalla(pantallaPausa);
    document.getElementById("btnContinuar").focus();
}

function reanudar() {
    if (estado !== "pausa") return;
    estado = "jugando";
    mostrarPantalla(null);
    quitarFoco();
    ultimoTiempo = null; // El tiempo en pausa no cuenta
    animacionId = requestAnimationFrame(gameLoop);
}

function salirAlInicio() {
    estado = "inicio";
    cancelAnimationFrame(animacionId);
    resetGame();
    draw();
    mostrarPantalla(pantallaInicio);
    inputNombre.focus();
}

btnPausa.addEventListener("click", pausar);
document.getElementById("btnContinuar").addEventListener("click", reanudar);
document.getElementById("btnSalir").addEventListener("click", salirAlInicio);

// Si el jugador cambia de pestaña o minimiza, el juego se pausa solo
document.addEventListener("visibilitychange", () => {
    if (document.hidden) pausar();
});

// ---------- Opciones (personalización) ----------

const COLOR_VALIDO = /^#[0-9a-f]{6}$/i;

// Mezcla un color con blanco (destino 255) o negro (destino 0) en proporción t
function mezclarColor(hex, destino, t) {
    const n = parseInt(hex.slice(1), 16);
    return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255]
        .map((v) => Math.round(v + (destino - v) * t).toString(16).padStart(2, "0"))
        .join("");
}

function esColorClaro(hex) {
    const n = parseInt(hex.slice(1), 16);
    const luz = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return luz / 255 > 0.6;
}

// Lee las opciones guardadas y descarta valores inválidos o manipulados
function cargarOpciones() {
    let guardadas = {};
    try {
        guardadas = JSON.parse(localStorage.getItem(CONFIG.claveOpciones) || "{}") || {};
    } catch {
        guardadas = {};
    }
    const validas = { ...OPCIONES_DEFECTO };
    ["colorTablero", "colorPaleta", "colorPelota"].forEach((campo) => {
        if (typeof guardadas[campo] === "string" && COLOR_VALIDO.test(guardadas[campo])) {
            validas[campo] = guardadas[campo].toLowerCase();
        }
    });
    if (Object.hasOwn(TAMANOS_PALETA, guardadas.tamanoPaleta)) validas.tamanoPaleta = guardadas.tamanoPaleta;
    if (Object.hasOwn(CONTROLES, guardadas.controles)) validas.controles = guardadas.controles;
    return validas;
}

// Aplica las opciones al juego y al formulario
function aplicarOpciones() {
    const c = opciones.colorTablero;
    canvas.style.background = "linear-gradient(135deg, " + c + " 0%, " + mezclarColor(c, 0, 0.3) + " 100%)";
    colorTexto = esColorClaro(c) ? "#111" : "#fff";

    // Fondo de la paleta: degradado del color elegido (más claro a la izquierda)
    fondoPaleta = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
    fondoPaleta.addColorStop(0, mezclarColor(opciones.colorPaleta, 255, 0.45));
    fondoPaleta.addColorStop(1, opciones.colorPaleta);

    // Cambiar el tamaño manteniendo la paleta centrada donde estaba
    const centro = paddle.y + paddle.height / 2;
    paddle.height = TAMANOS_PALETA[opciones.tamanoPaleta];
    paddle.y = centro - paddle.height / 2;
    limitarPaleta();

    textoControles.textContent = CONTROLES[opciones.controles].texto;
    soltarTeclas();

    optTablero.value = opciones.colorTablero;
    optPaleta.value = opciones.colorPaleta;
    optPelota.value = opciones.colorPelota;
    optTamano.value = opciones.tamanoPaleta;
    optControles.value = opciones.controles;

    if (estado !== "jugando") draw();
}

function cambiarOpcion(campo, valor) {
    const esColor = campo.startsWith("color");
    if (esColor && !COLOR_VALIDO.test(valor)) return;
    if (campo === "tamanoPaleta" && !Object.hasOwn(TAMANOS_PALETA, valor)) return;
    if (campo === "controles" && !Object.hasOwn(CONTROLES, valor)) return;
    opciones[campo] = valor;
    aplicarOpciones();
    guardarEnStorage(CONFIG.claveOpciones, JSON.stringify(opciones));
    avisoOpciones.textContent = "Cambios guardados ✔";
}

optTablero.addEventListener("input", () => cambiarOpcion("colorTablero", optTablero.value));
optPaleta.addEventListener("input", () => cambiarOpcion("colorPaleta", optPaleta.value));
optPelota.addEventListener("input", () => cambiarOpcion("colorPelota", optPelota.value));
optTamano.addEventListener("change", () => cambiarOpcion("tamanoPaleta", optTamano.value));
optControles.addEventListener("change", () => cambiarOpcion("controles", optControles.value));

function abrirOpciones(desde) {
    pantallaAnterior = desde;
    avisoOpciones.textContent = "";
    mostrarPantalla(pantallaOpciones);
    document.getElementById("btnVolverOpciones").focus();
}

function cerrarOpciones() {
    mostrarPantalla(pantallaAnterior || pantallaInicio);
    if (pantallaAnterior === pantallaPausa) {
        document.getElementById("btnContinuar").focus();
    } else {
        inputNombre.focus();
    }
}

document.getElementById("btnOpcionesInicio").addEventListener("click", () => abrirOpciones(pantallaInicio));
document.getElementById("btnOpcionesPausa").addEventListener("click", () => abrirOpciones(pantallaPausa));
document.getElementById("btnVolverOpciones").addEventListener("click", cerrarOpciones);

document.getElementById("btnRestablecer").addEventListener("click", () => {
    opciones = { ...OPCIONES_DEFECTO };
    aplicarOpciones();
    guardarEnStorage(CONFIG.claveOpciones, JSON.stringify(opciones));
    avisoOpciones.textContent = "Opciones restablecidas ✔";
});

document.getElementById("btnBorrarHistorial").addEventListener("click", () => {
    if (!confirm("¿Borrar los 3 mejores puntajes? No se puede deshacer.")) return;
    try {
        localStorage.removeItem(CONFIG.claveHistorial);
    } catch {
        // Sin acceso a localStorage no hay nada que borrar
    }
    avisoOpciones.textContent = "Historial borrado ✔";
});

// ---------- Fin del juego e historial ----------

function finDelJuego() {
    estado = "fin";
    soltarTeclas();
    const partida = { nombre: jugador, puntos: score, nivel: nivel, fecha: new Date().toISOString() };
    const top = guardarPuntaje(partida);
    textoResultado.textContent = jugador + ", hiciste " + score + " puntos y llegaste al nivel " + nivel + ".";
    mostrarHistorial(top, partida);
    mostrarPantalla(pantallaFin);
    document.getElementById("btnReintentar").focus();
}

// Lee el historial guardado y descarta registros dañados o manipulados
function leerHistorial() {
    try {
        const datos = JSON.parse(localStorage.getItem(CONFIG.claveHistorial) || "[]");
        if (!Array.isArray(datos)) return [];
        return datos.filter((p) =>
            p && typeof p.nombre === "string" && p.nombre.length <= 15 &&
            Number.isFinite(p.puntos) && p.puntos >= 0 &&
            !Number.isNaN(Date.parse(p.fecha))
        );
    } catch {
        return [];
    }
}

// Guarda la partida y conserva solo los 3 mejores puntajes
function guardarPuntaje(partida) {
    const top = leerHistorial()
        .concat(partida)
        .sort((a, b) => b.puntos - a.puntos || Date.parse(a.fecha) - Date.parse(b.fecha))
        .slice(0, CONFIG.maxHistorial);
    guardarEnStorage(CONFIG.claveHistorial, JSON.stringify(top));
    return top;
}

function guardarEnStorage(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
    } catch {
        // Si el navegador bloquea localStorage, el juego sigue funcionando sin guardar
    }
}

// Pinta la tabla con textContent (nunca innerHTML) para evitar inyección de código
function mostrarHistorial(top, partidaActual) {
    tablaHistorial.textContent = "";
    const formato = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" });

    if (top.length === 0) {
        const fila = tablaHistorial.insertRow();
        const celda = fila.insertCell();
        celda.colSpan = 4;
        celda.textContent = "Sin puntajes todavía";
        return;
    }

    top.forEach((p, i) => {
        const fila = tablaHistorial.insertRow();
        if (p.fecha === partidaActual.fecha && p.nombre === partidaActual.nombre) {
            fila.classList.add("actual");
        }
        const medallas = ["🥇", "🥈", "🥉"];
        [medallas[i] || i + 1, p.nombre, p.puntos, formato.format(new Date(p.fecha))].forEach((valor) => {
            fila.insertCell().textContent = valor;
        });
    });
}

document.getElementById("btnReintentar").addEventListener("click", iniciarPartida);

document.getElementById("btnCambiar").addEventListener("click", () => {
    estado = "inicio";
    mostrarPantalla(pantallaInicio);
    inputNombre.select();
    inputNombre.focus();
});

// Iniciar: cargar opciones, recordar el último nombre y dibujar el tablero detrás de la pantalla de inicio
try {
    inputNombre.value = localStorage.getItem(CONFIG.claveJugador) || "";
} catch {
    inputNombre.value = "";
}
opciones = cargarOpciones();
resetGame();
aplicarOpciones();
mostrarPantalla(pantallaInicio);
inputNombre.focus();
