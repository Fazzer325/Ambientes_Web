const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Conexión con el servidor (Socket.IO)
const socket = io();

// Valores por defecto: se reemplazan con los que manda el servidor al iniciar la partida
let config = {
    ancho: 800,
    alto: 450,
    radio: 10,
    paleta: { ancho: 15, alto: 100, margen: 30, velocidad: 7, velocidadPuntero: 10 }
};

const CLAVES = {
    historial: "pong1v1Historial",
    jugador: "pong1v1Jugador",
    opciones: "pong1v1Opciones"
};
const MAX_HISTORIAL = 3;
const ENVIO_PUNTERO_MS = 16;   // Como máximo ~60 mensajes por segundo al arrastrar

// Esquemas de teclas que se pueden elegir en Opciones
const CONTROLES = {
    clasico: { arriba: ["w", "arrowup"], abajo: ["s", "arrowdown"], texto: "W / ↑ subir, S / ↓ bajar" },
    ik: { arriba: ["i"], abajo: ["k"], texto: "I subir, K bajar" }
};

const OPCIONES_DEFECTO = {
    colorTablero: "#1e3a8a",
    colorPaleta: "#2ecc71",
    colorRival: "#ff6b6b",
    colorPelota: "#ffffff",
    controles: "clasico"
};

const NOMBRES_DIFICULTAD = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };

// ---------- Estado del cliente ----------
let estado = "lobby";          // "lobby" | "espera" | "cuenta" | "jugando" | "pausa" | "fin"
let partida = null;            // { codigo, nombres, puntos, puntosParaGanar }
let miLado = null;             // 0 = izquierda (quien crea la sala), 1 = derecha
let miNombre = "";
let cuentaHasta = 0;
let animacionId = null;
let ultimoTiempo = null;
let opciones = { ...OPCIONES_DEFECTO };
let colorTexto = "#fff";
let fondos = ["#2ecc71", "#ff6b6b"];
let pantallaAnterior = null;
let ultimoFin = null;

// Instantáneas del servidor para dibujar suave entre una y otra (interpolación)
let snapAnterior = null;
let snapActual = null;
let tAnterior = 0;
let tActual = 0;
let intervalo = 1000 / 60;

// Mi paleta se mueve al instante en pantalla (predicción) y se corrige con lo que dice el servidor
let miY = null;
let miDir = 0;
let miObjetivo = null;
let arrastrando = false;
let yPendiente = null;
let ultimoEnvioPuntero = 0;
const teclas = { arriba: false, abajo: false };

// Avisos en el tablero
let aviso = { texto: "", hasta: 0, color: "#feca57" };
let ultimoNivel = 1;

// ---------- Elementos de la interfaz ----------
const $ = (id) => document.getElementById(id);
const pantallas = {
    lobby: $("pantallaLobby"),
    espera: $("pantallaEspera"),
    pausa: $("pantallaPausa"),
    opciones: $("pantallaOpciones"),
    fin: $("pantallaFin")
};
const inputNombre = $("nombreJugador");
const inputCodigo = $("codigoUnirse");
const errorLobby = $("errorLobby");
const btnPausa = $("btnPausa");
const avisoJuego = $("avisoJuego");
const optTablero = $("optTablero");
const optPaleta = $("optPaleta");
const optRival = $("optRival");
const optPelota = $("optPelota");
const optControles = $("optControles");

// ---------- Utilidades ----------
function limitar(v, min, max) {
    return Math.min(Math.max(v, min), max);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function guardarEnStorage(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
    } catch {
        // Si el navegador bloquea localStorage, el juego sigue sin guardar
    }
}

function leerStorage(clave) {
    try {
        return localStorage.getItem(clave);
    } catch {
        return null;
    }
}

// Mismas reglas que el servidor
function validarNombre(texto) {
    const nombre = texto.trim().replace(/\s+/g, " ");
    if (nombre.length === 0) return { ok: false, error: "Escribe tu nombre para jugar." };
    if (nombre.length > 15) return { ok: false, error: "Máximo 15 caracteres." };
    if (!/^[\p{L}\p{N} ._-]+$/u.test(nombre)) {
        return { ok: false, error: "Usa solo letras, números, espacios, punto o guiones." };
    }
    return { ok: true, nombre };
}

function xPaleta(lado) {
    return lado === 0 ? config.paleta.margen : config.ancho - config.paleta.margen - config.paleta.ancho;
}

function mostrarPantalla(nombre) {
    Object.entries(pantallas).forEach(([clave, el]) => el.classList.toggle("oculto", clave !== nombre));
    btnPausa.disabled = estado !== "jugando";
}

function avisoBarra(texto) {
    avisoJuego.textContent = texto;
    clearTimeout(avisoBarra.t);
    avisoBarra.t = setTimeout(() => { avisoJuego.textContent = ""; }, 3000);
}

function quitarFoco() {
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
}

// ---------- Conexión ----------
function actualizarConexion(conectado) {
    $("estadoConexion").textContent = conectado ? "🟢 Conectado al servidor" : "🔴 Sin conexión, reintentando…";
    document.querySelectorAll(".requiere-conexion").forEach((b) => { b.disabled = !conectado; });
    renderSalas(conectado ? ultimasSalas : []);
}

let ultimasSalas = [];

socket.on("connect", () => actualizarConexion(true));
socket.on("disconnect", () => {
    actualizarConexion(false);
    // Al perder la conexión el servidor cierra la sala: volver al lobby
    if (estado !== "lobby") {
        volverAlLobby();
        errorLobby.textContent = "Se perdió la conexión con el servidor.";
    }
});

// ---------- Lobby ----------
function renderSalas(lista) {
    ultimasSalas = Array.isArray(lista) ? lista : [];
    const ul = $("listaSalas");
    ul.textContent = "";
    if (ultimasSalas.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No hay salas abiertas. ¡Crea una!";
        ul.appendChild(li);
        return;
    }
    ultimasSalas.forEach((s) => {
        const li = document.createElement("li");
        const texto = document.createElement("span");
        texto.textContent = s.codigo + " · " + s.anfitrion + " · " + (NOMBRES_DIFICULTAD[s.dificultad] || "") + " · a " + s.puntosParaGanar;
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = "Unirse";
        boton.disabled = !socket.connected;
        boton.addEventListener("click", () => unirse(s.codigo));
        li.append(texto, boton);
        ul.appendChild(li);
    });
}

socket.on("salas", renderSalas);

function nombreValido() {
    const r = validarNombre(inputNombre.value);
    if (!r.ok) {
        errorLobby.textContent = r.error;
        inputNombre.focus();
        return null;
    }
    errorLobby.textContent = "";
    miNombre = r.nombre;
    guardarEnStorage(CLAVES.jugador, miNombre);
    return miNombre;
}

$("formCrear").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = nombreValido();
    if (!nombre) return;
    const datos = {
        nombre,
        dificultad: $("dificultad").value,
        puntosParaGanar: Number($("puntosGanar").value)
    };
    socket.emit("crearSala", datos, (r) => {
        if (!r || !r.ok) {
            errorLobby.textContent = (r && r.error) || "No se pudo crear la sala.";
            return;
        }
        miLado = 0;
        estado = "espera";
        $("codigoSala").textContent = r.codigo;
        $("detalleSala").textContent = "Dificultad " + NOMBRES_DIFICULTAD[r.dificultad] + " · gana quien llegue a " + r.puntosParaGanar;
        $("avisoEspera").textContent = "";
        mostrarPantalla("espera");
    });
});

$("formUnirse").addEventListener("submit", (e) => {
    e.preventDefault();
    unirse(inputCodigo.value);
});

function unirse(codigo) {
    const nombre = nombreValido();
    if (!nombre) return;
    const limpio = String(codigo).trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(limpio)) {
        errorLobby.textContent = "El código tiene 4 letras o números.";
        inputCodigo.focus();
        return;
    }
    socket.emit("unirse", { nombre, codigo: limpio }, (r) => {
        if (!r || !r.ok) {
            errorLobby.textContent = (r && r.error) || "No se pudo entrar a la sala.";
            return;
        }
        miLado = 1;
    });
}

function enlaceSala() {
    return location.origin + location.pathname + "?sala=" + encodeURIComponent($("codigoSala").textContent);
}

$("btnCopiar").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(enlaceSala());
        $("avisoEspera").textContent = "Enlace copiado ✔";
    } catch {
        // Sin HTTPS el portapapeles puede estar bloqueado: mostrar el enlace para copiarlo a mano
        $("avisoEspera").textContent = enlaceSala();
    }
});

if (navigator.share) {
    $("btnCompartir").classList.remove("oculto");
    $("btnCompartir").addEventListener("click", () => {
        navigator.share({ title: "Pong 1 vs 1", text: "¡Juega conmigo! Código: " + $("codigoSala").textContent, url: enlaceSala() })
            .catch(() => {});
    });
}

$("btnCancelarSala").addEventListener("click", () => {
    socket.emit("salir");
    volverAlLobby();
});

function volverAlLobby() {
    estado = "lobby";
    partida = null;
    miLado = null;
    snapAnterior = null;
    snapActual = null;
    detenerBucle();
    soltarControles();
    mostrarPantalla("lobby");
    draw();
}

// ---------- Partida ----------
socket.on("inicio", (datos) => {
    partida = datos;
    config = datos.config;
    estado = "cuenta";
    snapAnterior = null;
    snapActual = null;
    miY = (config.alto - config.paleta.alto) / 2;
    ultimoNivel = 1;
    ultimoFin = null;
    soltarControles();
    aplicarOpciones();
    mostrarPantalla(null);
    quitarFoco();
    iniciarBucle();
});

socket.on("cuenta", (datos) => {
    cuentaHasta = performance.now() + (Number(datos && datos.ms) || 0);
    estado = "cuenta";
    mostrarPantalla(null);
    quitarFoco();
    iniciarBucle();
});

socket.on("jugando", () => {
    estado = "jugando";
    btnPausa.disabled = false;
    ultimoTiempo = null;
});

socket.on("estado", (datos) => {
    snapAnterior = snapActual;
    tAnterior = tActual;
    snapActual = datos;
    tActual = performance.now();
    if (snapAnterior) intervalo = limitar(intervalo * 0.9 + (tActual - tAnterior) * 0.1, 8, 50);
    if (miY === null || estado !== "jugando") miY = datos.p[miLado];
    if (datos.n > ultimoNivel) {
        mostrarAviso("¡Nivel " + datos.n + "!", "#feca57");
    }
    ultimoNivel = datos.n;
});

socket.on("gol", (datos) => {
    if (!partida) return;
    partida.puntos = datos.puntos;
    ultimoNivel = 1;
    const mio = datos.lado === miLado;
    mostrarAviso(mio ? "¡Punto para ti!" : "Punto para " + partida.nombres[datos.lado], mio ? "#2ecc71" : "#ff7675");
});

socket.on("pausa", (datos) => {
    if (!partida) return;
    estado = "pausa";
    detenerBucle();
    soltarControles();
    const quien = datos.lado === miLado ? "Tú pausaste" : datos.nombre + " pausó";
    $("textoPausa").textContent = quien + " el juego. Te quedan " + datos.pausas[miLado] + " pausas.";
    mostrarPantalla("pausa");
    draw();
});

socket.on("fin", (datos) => {
    if (!partida) return;
    estado = "fin";
    detenerBucle();
    soltarControles();
    partida.puntos = datos.puntos;
    const gane = datos.ganador === miLado;
    const rival = datos.nombres[1 - miLado] || "Rival";

    $("tituloFin").textContent = gane ? "🏆 ¡Ganaste!" : "😢 Perdiste";
    $("resultado").textContent = datos.motivo === "abandono"
        ? (gane ? rival + " abandonó la partida." : "Abandonaste la partida.")
        : datos.nombres[0] + " " + datos.puntos[0] + " - " + datos.puntos[1] + " " + datos.nombres[1];

    ultimoFin = {
        nombre: miNombre,
        rival,
        misPuntos: datos.puntos[miLado],
        susPuntos: datos.puntos[1 - miLado],
        gano: gane,
        fecha: new Date().toISOString()
    };
    mostrarHistorial(guardarPartida(ultimoFin), ultimoFin);

    const puedeRevancha = datos.motivo !== "abandono";
    $("btnRevancha").disabled = !puedeRevancha;
    $("avisoRevancha").textContent = puedeRevancha ? "" : "La sala se cerró.";
    mostrarPantalla("fin");
    draw();
});

socket.on("revancha", (datos) => {
    if (!partida || !Array.isArray(datos.votos)) return;
    if (datos.votos[miLado] && !datos.votos[1 - miLado]) {
        $("avisoRevancha").textContent = "Esperando a que " + partida.nombres[1 - miLado] + " acepte…";
    } else if (!datos.votos[miLado] && datos.votos[1 - miLado]) {
        $("avisoRevancha").textContent = partida.nombres[1 - miLado] + " quiere la revancha.";
    }
});

socket.on("rivalSalio", () => {
    $("btnRevancha").disabled = true;
    $("avisoRevancha").textContent = "Tu rival salió de la sala.";
});

$("btnRevancha").addEventListener("click", () => {
    socket.emit("revancha");
    $("btnRevancha").disabled = true;
});

$("btnVolverLobby").addEventListener("click", () => {
    socket.emit("salir");
    volverAlLobby();
});

function mostrarAviso(texto, color) {
    aviso = { texto, color, hasta: performance.now() + 1200 };
}

// ---------- Pausa ----------
function pedirPausa() {
    if (estado !== "jugando") return;
    socket.emit("pausa", (r) => {
        if (r && !r.ok && r.error) avisoBarra(r.error);
    });
}

function reanudar() {
    if (estado === "pausa") socket.emit("reanudar");
}

btnPausa.addEventListener("click", pedirPausa);
$("btnContinuar").addEventListener("click", reanudar);
$("btnAbandonar").addEventListener("click", () => {
    if (confirm("¿Abandonar la partida? Tu rival gana.")) socket.emit("salir");
});

// Si el jugador cambia de pestaña o bloquea el celular, se pausa (si le quedan pausas)
document.addEventListener("visibilitychange", () => {
    if (document.hidden) pedirPausa();
});

// ---------- Controles: teclado ----------
document.addEventListener("keydown", (e) => {
    const tecla = e.key.toLowerCase();
    const opcionesAbiertas = !pantallas.opciones.classList.contains("oculto");

    if (tecla === "p" || tecla === "escape") {
        if (estado === "jugando") {
            e.preventDefault();
            pedirPausa();
            return;
        }
        if (opcionesAbiertas && tecla === "escape") {
            e.preventDefault();
            cerrarOpciones();
            return;
        }
        if (estado === "pausa" && !opcionesAbiertas) {
            e.preventDefault();
            reanudar();
            return;
        }
    }

    if (estado !== "jugando" && estado !== "cuenta") return;
    const control = CONTROLES[opciones.controles];
    if (control.arriba.includes(tecla)) {
        e.preventDefault();
        teclas.arriba = true;
    } else if (control.abajo.includes(tecla)) {
        e.preventDefault();
        teclas.abajo = true;
    } else {
        return;
    }
    enviarDireccion();
});

document.addEventListener("keyup", (e) => {
    const tecla = e.key.toLowerCase();
    const control = CONTROLES[opciones.controles];
    if (control.arriba.includes(tecla)) teclas.arriba = false;
    else if (control.abajo.includes(tecla)) teclas.abajo = false;
    else return;
    enviarDireccion();
});

function enviarDireccion() {
    const dir = Number(teclas.abajo) - Number(teclas.arriba);
    if (dir === miDir && miObjetivo === null) return;
    miDir = dir;
    miObjetivo = null;
    if (partida) socket.emit("entrada", { dir });
}

function soltarControles() {
    teclas.arriba = false;
    teclas.abajo = false;
    arrastrando = false;
    yPendiente = null;
    if (miDir !== 0 && partida) socket.emit("entrada", { dir: 0 });
    miDir = 0;
}

// ---------- Controles: dedo o clic sobre el tablero ----------
function yEnTablero(e) {
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top - canvas.clientTop) * (config.alto / canvas.clientHeight);
    return limitar(y, 0, config.alto);
}

function marcarObjetivo(e) {
    if (estado !== "jugando" && estado !== "cuenta") return;
    miObjetivo = yEnTablero(e);
    miDir = 0;
    yPendiente = miObjetivo;
    programarEnvioPuntero();
}

canvas.addEventListener("pointerdown", (e) => {
    if (estado !== "jugando" && estado !== "cuenta") return;
    e.preventDefault();
    arrastrando = true;
    marcarObjetivo(e);
    try {
        canvas.setPointerCapture(e.pointerId); // Seguir el dedo aunque salga del tablero
    } catch {
        // Algunos navegadores no lo permiten: el control sigue funcionando dentro del tablero
    }
});
canvas.addEventListener("pointermove", (e) => {
    if (arrastrando) marcarObjetivo(e);
});
["pointerup", "pointercancel"].forEach((tipo) => {
    canvas.addEventListener(tipo, () => { arrastrando = false; });
});

// Manda la posición del dedo como máximo cada 16 ms (la última posición nunca se pierde)
let temporizadorPuntero = null;

function programarEnvioPuntero() {
    const espera = ENVIO_PUNTERO_MS - (performance.now() - ultimoEnvioPuntero);
    if (espera <= 0) {
        enviarPuntero();
    } else if (temporizadorPuntero === null) {
        temporizadorPuntero = setTimeout(enviarPuntero, espera);
    }
}

function enviarPuntero() {
    temporizadorPuntero = null;
    if (yPendiente === null || !partida) return;
    socket.emit("entrada", { y: Math.round(yPendiente) });
    yPendiente = null;
    ultimoEnvioPuntero = performance.now();
}

// ---------- Pantalla completa (útil en celular) ----------
const btnPantallaCompleta = $("btnPantallaCompleta");
if (!document.documentElement.requestFullscreen) {
    btnPantallaCompleta.classList.add("oculto");
} else {
    btnPantallaCompleta.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock("landscape").catch(() => {});
                }
            }
        } catch {
            avisoBarra("Tu navegador no permite pantalla completa.");
        }
    });
}

// ---------- Bucle de dibujo ----------
function iniciarBucle() {
    if (animacionId !== null) return;
    ultimoTiempo = null;
    animacionId = requestAnimationFrame(bucle);
}

function detenerBucle() {
    if (animacionId !== null) cancelAnimationFrame(animacionId);
    animacionId = null;
}

function bucle(tiempo) {
    const factor = ultimoTiempo === null ? 1 : Math.min((tiempo - ultimoTiempo) / (1000 / 60), 2);
    ultimoTiempo = tiempo;
    predecirMiPaleta(factor);
    draw();
    animacionId = (estado === "jugando" || estado === "cuenta") ? requestAnimationFrame(bucle) : null;
}

// Mueve mi paleta igual que lo hará el servidor, para que responda sin retraso
function predecirMiPaleta(f) {
    if (miLado === null || !snapActual) return;
    const servidor = snapActual.p[miLado];
    if (estado !== "jugando") {
        miY = servidor;
        return;
    }
    const p = config.paleta;
    if (miObjetivo !== null) {
        miY += limitar(miObjetivo - (miY + p.alto / 2), -p.velocidadPuntero * f, p.velocidadPuntero * f);
    } else {
        miY += miDir * p.velocidad * f;
    }
    miY = limitar(miY, 0, config.alto - p.alto);

    // Corrección: si se separa mucho, saltar; si ya está quieta, acercarse suavemente
    const quieta = miObjetivo === null ? miDir === 0 : Math.abs(miObjetivo - (miY + p.alto / 2)) < 1;
    if (Math.abs(servidor - miY) > 120) miY = servidor;
    else if (quieta) miY += (servidor - miY) * Math.min(1, 0.15 * f);
}

// Posiciones a dibujar: interpoladas entre las dos últimas instantáneas
function posiciones() {
    const centroPaleta = (config.alto - config.paleta.alto) / 2;
    if (!snapActual) {
        return { bx: config.ancho / 2, by: config.alto / 2, p: [centroPaleta, centroPaleta] };
    }
    if (!snapAnterior) {
        return { bx: snapActual.b[0], by: snapActual.b[1], p: snapActual.p.slice() };
    }
    const t = limitar((performance.now() - tActual) / intervalo, 0, 1);
    const salto = Math.abs(snapActual.b[0] - snapAnterior.b[0]) > 60; // Saque: no interpolar el "teletransporte"
    return {
        bx: salto ? snapActual.b[0] : lerp(snapAnterior.b[0], snapActual.b[0], t),
        by: salto ? snapActual.b[1] : lerp(snapAnterior.b[1], snapActual.b[1], t),
        p: [lerp(snapAnterior.p[0], snapActual.p[0], t), lerp(snapAnterior.p[1], snapActual.p[1], t)]
    };
}

function draw() {
    const W = config.ancho;
    const H = config.alto;
    const p = config.paleta;
    const pos = posiciones();
    if (miLado !== null && miY !== null && snapActual) pos.p[miLado] = miY;

    ctx.clearRect(0, 0, W, H);

    // Línea central punteada
    ctx.strokeStyle = colorTexto === "#fff" ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paletas: la mía con mi color y la del rival con el suyo
    [0, 1].forEach((lado) => {
        ctx.fillStyle = fondos[lado];
        ctx.fillRect(xPaleta(lado), pos.p[lado], p.ancho, p.alto);
    });

    // Pelota (oculta durante la espera del lobby)
    if (partida) {
        ctx.beginPath();
        ctx.arc(pos.bx, pos.by, config.radio, 0, Math.PI * 2);
        ctx.fillStyle = opciones.colorPelota;
        ctx.fill();
        ctx.closePath();
    }

    // Marcador
    ctx.fillStyle = colorTexto;
    if (partida) {
        ctx.font = "18px Arial";
        ctx.textAlign = "left";
        ctx.fillText(partida.nombres[0] + (miLado === 0 ? " (tú)" : ""), 60, 30);
        ctx.textAlign = "right";
        ctx.fillText(partida.nombres[1] + (miLado === 1 ? " (tú)" : ""), W - 60, 30);

        ctx.font = "bold 44px Arial";
        ctx.textAlign = "right";
        ctx.fillText(String(partida.puntos[0]), W / 2 - 30, 60);
        ctx.textAlign = "left";
        ctx.fillText(String(partida.puntos[1]), W / 2 + 30, 60);

        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Nivel " + (snapActual ? snapActual.n : 1) + " · a " + partida.puntosParaGanar, W / 2, H - 16);
    } else {
        ctx.font = "26px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Crea una sala o únete a una", W / 2, H / 2);
    }

    const ahora = performance.now();

    // Cuenta regresiva 3-2-1
    if (estado === "cuenta") {
        const n = Math.ceil((cuentaHasta - ahora) / 1000);
        ctx.font = "bold 90px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#feca57";
        ctx.fillText(n > 0 ? String(n) : "¡Ya!", W / 2, H / 2 + 30);
    } else if (ahora < aviso.hasta) {
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = aviso.color;
        ctx.fillText(aviso.texto, W / 2, H / 2 + 14);
    }
}

// ---------- Opciones (personalización local) ----------
const COLOR_VALIDO = /^#[0-9a-f]{6}$/i;
const CAMPOS_COLOR = ["colorTablero", "colorPaleta", "colorRival", "colorPelota"];

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

function cargarOpciones() {
    let guardadas = {};
    try {
        guardadas = JSON.parse(leerStorage(CLAVES.opciones) || "{}") || {};
    } catch {
        guardadas = {};
    }
    const validas = { ...OPCIONES_DEFECTO };
    CAMPOS_COLOR.forEach((campo) => {
        if (typeof guardadas[campo] === "string" && COLOR_VALIDO.test(guardadas[campo])) {
            validas[campo] = guardadas[campo].toLowerCase();
        }
    });
    if (Object.hasOwn(CONTROLES, guardadas.controles)) validas.controles = guardadas.controles;
    return validas;
}

function degradadoPaleta(lado, color) {
    const x = xPaleta(lado);
    const g = ctx.createLinearGradient(x, 0, x + config.paleta.ancho, 0);
    g.addColorStop(0, mezclarColor(color, 255, 0.45));
    g.addColorStop(1, color);
    return g;
}

function aplicarOpciones() {
    const c = opciones.colorTablero;
    canvas.style.background = "linear-gradient(135deg, " + c + " 0%, " + mezclarColor(c, 0, 0.3) + " 100%)";
    colorTexto = esColorClaro(c) ? "#111" : "#fff";

    // Mi paleta siempre con "mi" color, esté a la izquierda o a la derecha
    const yo = miLado === null ? 0 : miLado;
    fondos[yo] = degradadoPaleta(yo, opciones.colorPaleta);
    fondos[1 - yo] = degradadoPaleta(1 - yo, opciones.colorRival);

    $("textoControles").textContent = CONTROLES[opciones.controles].texto;

    optTablero.value = opciones.colorTablero;
    optPaleta.value = opciones.colorPaleta;
    optRival.value = opciones.colorRival;
    optPelota.value = opciones.colorPelota;
    optControles.value = opciones.controles;

    if (animacionId === null) draw();
}

function cambiarOpcion(campo, valor) {
    if (CAMPOS_COLOR.includes(campo) && !COLOR_VALIDO.test(valor)) return;
    if (campo === "controles") {
        if (!Object.hasOwn(CONTROLES, valor)) return;
        soltarControles();
    }
    opciones[campo] = valor;
    aplicarOpciones();
    guardarEnStorage(CLAVES.opciones, JSON.stringify(opciones));
    $("avisoOpciones").textContent = "Cambios guardados ✔";
}

optTablero.addEventListener("input", () => cambiarOpcion("colorTablero", optTablero.value));
optPaleta.addEventListener("input", () => cambiarOpcion("colorPaleta", optPaleta.value));
optRival.addEventListener("input", () => cambiarOpcion("colorRival", optRival.value));
optPelota.addEventListener("input", () => cambiarOpcion("colorPelota", optPelota.value));
optControles.addEventListener("change", () => cambiarOpcion("controles", optControles.value));

function abrirOpciones(desde) {
    pantallaAnterior = desde;
    $("avisoOpciones").textContent = "";
    mostrarPantalla("opciones");
    $("btnVolverOpciones").focus();
}

function cerrarOpciones() {
    // Si mientras tanto la partida siguió (el rival reanudó), no volver a la pausa
    if (pantallaAnterior === "pausa" && estado !== "pausa") {
        mostrarPantalla(estado === "fin" ? "fin" : null);
        return;
    }
    mostrarPantalla(pantallaAnterior || "lobby");
}

$("btnOpcionesLobby").addEventListener("click", () => abrirOpciones("lobby"));
$("btnOpcionesPausa").addEventListener("click", () => abrirOpciones("pausa"));
$("btnVolverOpciones").addEventListener("click", cerrarOpciones);

$("btnRestablecer").addEventListener("click", () => {
    opciones = { ...OPCIONES_DEFECTO };
    soltarControles();
    aplicarOpciones();
    guardarEnStorage(CLAVES.opciones, JSON.stringify(opciones));
    $("avisoOpciones").textContent = "Opciones restablecidas ✔";
});

$("btnBorrarHistorial").addEventListener("click", () => {
    if (!confirm("¿Borrar tus 3 mejores partidas? No se puede deshacer.")) return;
    try {
        localStorage.removeItem(CLAVES.historial);
    } catch {
        // Sin acceso a localStorage no hay nada que borrar
    }
    $("avisoOpciones").textContent = "Historial borrado ✔";
});

// ---------- Historial: tus 3 mejores partidas (en este navegador) ----------
function leerHistorial() {
    try {
        const datos = JSON.parse(leerStorage(CLAVES.historial) || "[]");
        if (!Array.isArray(datos)) return [];
        return datos.filter((h) =>
            h && typeof h.nombre === "string" && h.nombre.length <= 15 &&
            typeof h.rival === "string" && h.rival.length <= 15 &&
            Number.isInteger(h.misPuntos) && h.misPuntos >= 0 &&
            Number.isInteger(h.susPuntos) && h.susPuntos >= 0 &&
            typeof h.gano === "boolean" &&
            !Number.isNaN(Date.parse(h.fecha))
        );
    } catch {
        return [];
    }
}

// Mejor partida = más puntos tuyos; a igualdad, las ganadas y luego la diferencia
function guardarPartida(partidaNueva) {
    const top = leerHistorial()
        .concat(partidaNueva)
        .sort((a, b) =>
            b.misPuntos - a.misPuntos ||
            Number(b.gano) - Number(a.gano) ||
            (b.misPuntos - b.susPuntos) - (a.misPuntos - a.susPuntos) ||
            Date.parse(b.fecha) - Date.parse(a.fecha))
        .slice(0, MAX_HISTORIAL);
    guardarEnStorage(CLAVES.historial, JSON.stringify(top));
    return top;
}

function mostrarHistorial(top, actual) {
    const tbody = $("tablaHistorial");
    tbody.textContent = "";
    const formato = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" });
    const medallas = ["🥇", "🥈", "🥉"];

    top.forEach((h, i) => {
        const fila = tbody.insertRow();
        if (h.fecha === actual.fecha) fila.classList.add("actual");
        const marcador = h.misPuntos + " - " + h.susPuntos + (h.gano ? " ✔" : "");
        [medallas[i] || i + 1, h.nombre, h.rival, marcador, formato.format(new Date(h.fecha))].forEach((valor) => {
            fila.insertCell().textContent = valor;
        });
    });
}

// ---------- Arranque ----------
inputNombre.value = leerStorage(CLAVES.jugador) || "";
const salaEnlace = new URLSearchParams(location.search).get("sala");
if (salaEnlace && /^[A-Za-z0-9]{4}$/.test(salaEnlace)) {
    inputCodigo.value = salaEnlace.toUpperCase();
}
opciones = cargarOpciones();
aplicarOpciones();
renderSalas([]);
actualizarConexion(socket.connected);
mostrarPantalla("lobby");
(inputNombre.value ? (salaEnlace ? $("formUnirse").querySelector("button") : inputCodigo) : inputNombre).focus();
