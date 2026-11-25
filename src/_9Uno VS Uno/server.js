"use strict";

const path = require("path");
const http = require("http");
const os = require("os");
const crypto = require("crypto");
const express = require("express");
const { Server } = require("socket.io");

const PUERTO = Number(process.env.PORT) || 3000;

// ---------- Reglas del juego (el servidor es quien manda) ----------
const JUEGO = {
    ancho: 800,
    alto: 450,
    radio: 10,
    paleta: {
        ancho: 15,
        alto: 100,
        margen: 30,             // Distancia de cada paleta a su borde
        velocidad: 7,           // px por paso con teclado
        velocidadPuntero: 10    // px máx. por paso al seguir el dedo / clic
    },
    golpesPorNivel: 3,          // Cada 3 golpes en el mismo punto sube el nivel
    aumentoPorNivel: 1.1,       // +10% de velocidad por nivel
    velocidadMaxima: 14,        // Tope para que la pelota no atraviese la paleta
    anguloMaximo: Math.PI / 4,  // 45° si pega en la orilla de la paleta
    esperaSaque: 1000,          // ms de espera antes de cada saque
    cuentaRegresiva: 3000,      // ms de cuenta 3-2-1 al iniciar o reanudar
    pausasPorJugador: 3
};
const DIFICULTADES = { facil: 4, normal: 5, dificil: 7 };
const PUNTOS_PARA_GANAR = [3, 5, 7];
const MAX_SALAS = 200;
const MAX_ENTRADAS_POR_SEGUNDO = 120;
const PASO_MS = 1000 / 60;      // La física corre a 60 pasos por segundo
const LETRAS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin O/0 ni I/1 para no confundir

// ---------- Servidor web ----------
const app = express();
app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e4 });

/** @type {Map<string, any>} */
const salas = new Map();

// ---------- Utilidades ----------
function limitar(valor, min, max) {
    return Math.min(Math.max(valor, min), max);
}

function redondear(v) {
    return Math.round(v * 10) / 10;
}

// Mismas reglas que en el cliente: 1 a 15 caracteres, letras, números, espacios, punto y guiones
function validarNombre(texto) {
    if (typeof texto !== "string") return null;
    const nombre = texto.trim().replace(/\s+/g, " ");
    if (nombre.length < 1 || nombre.length > 15) return null;
    if (!/^[\p{L}\p{N} ._-]+$/u.test(nombre)) return null;
    return nombre;
}

function generarCodigo() {
    let codigo;
    do {
        codigo = Array.from({ length: 4 }, () => LETRAS_CODIGO[crypto.randomInt(LETRAS_CODIGO.length)]).join("");
    } while (salas.has(codigo));
    return codigo;
}

function responder(cb, datos) {
    if (typeof cb === "function") cb(datos);
}

// ---------- Vestíbulo (lista de salas abiertas) ----------
function salasAbiertas() {
    return [...salas.values()]
        .filter((s) => s.estado === "esperando")
        .map((s) => ({
            codigo: s.codigo,
            anfitrion: s.jugadores[0].nombre,
            dificultad: s.dificultad,
            puntosParaGanar: s.puntosParaGanar
        }));
}

function avisarVestibulo() {
    io.to("vestibulo").emit("salas", salasAbiertas());
}

// ---------- Salas ----------
function nuevoJugador(socket, nombre) {
    return {
        id: socket.id,
        nombre,
        y: (JUEGO.alto - JUEGO.paleta.alto) / 2,
        dir: 0,
        objetivo: null,
        puntos: 0,
        pausas: JUEGO.pausasPorJugador,
        revancha: false
    };
}

function xPaleta(lado) {
    return lado === 0 ? JUEGO.paleta.margen : JUEGO.ancho - JUEGO.paleta.margen - JUEGO.paleta.ancho;
}

function datosPartida(sala) {
    return {
        codigo: sala.codigo,
        nombres: sala.jugadores.map((j) => j.nombre),
        puntos: sala.jugadores.map((j) => j.puntos),
        puntosParaGanar: sala.puntosParaGanar,
        dificultad: sala.dificultad,
        config: JUEGO
    };
}

// Coloca la pelota al centro y la lanza hacia "haciaLado" después de una pausa corta
function sacar(sala, haciaLado) {
    const b = sala.pelota;
    b.x = JUEGO.ancho / 2;
    b.y = JUEGO.alto / 2;
    b.velocidad = DIFICULTADES[sala.dificultad];
    sala.nivel = 1;
    sala.golpes = 0;
    const angulo = (Math.random() * 2 - 1) * (Math.PI / 6); // ±30°
    b.vx = (haciaLado === 0 ? -1 : 1) * b.velocidad * Math.cos(angulo);
    b.vy = b.velocidad * Math.sin(angulo);
    sala.saqueEn = Date.now() + JUEGO.esperaSaque;
}

function iniciarPartida(sala) {
    sala.jugadores.forEach((j) => {
        j.puntos = 0;
        j.revancha = false;
        j.pausas = JUEGO.pausasPorJugador;
        j.y = (JUEGO.alto - JUEGO.paleta.alto) / 2;
        j.dir = 0;
        j.objetivo = null;
    });
    sacar(sala, crypto.randomInt(2));
    io.to(sala.codigo).emit("inicio", datosPartida(sala));
    cuentaRegresiva(sala);
}

// Cuenta 3-2-1 y luego arranca (o continúa) el juego
function cuentaRegresiva(sala) {
    sala.estado = "cuenta";
    clearTimeout(sala.temporizador);
    io.to(sala.codigo).emit("cuenta", { ms: JUEGO.cuentaRegresiva });
    sala.temporizador = setTimeout(() => {
        if (sala.estado !== "cuenta") return;
        sala.estado = "jugando";
        // Que la espera del saque no se haya consumido durante la cuenta
        sala.saqueEn = Math.max(sala.saqueEn, Date.now() + 300);
        io.to(sala.codigo).emit("jugando");
    }, JUEGO.cuentaRegresiva);
}

function terminar(sala, ganador, motivo) {
    sala.estado = "fin";
    clearTimeout(sala.temporizador);
    sala.jugadores.forEach((j) => { j.revancha = false; });
    io.to(sala.codigo).emit("fin", {
        ganador,
        motivo,
        puntos: sala.jugadores.map((j) => j.puntos),
        nombres: sala.jugadores.map((j) => j.nombre)
    });
}

function cerrarSala(sala) {
    clearTimeout(sala.temporizador);
    salas.delete(sala.codigo);
    for (const j of sala.jugadores) {
        const s = io.sockets.sockets.get(j.id);
        if (s) {
            s.leave(sala.codigo);
            s.data.sala = null;
            s.data.lado = null;
            s.join("vestibulo");
        }
    }
    avisarVestibulo();
}

// El jugador deja su sala (botón "Salir" o desconexión)
function salirDeSala(socket) {
    const sala = salas.get(socket.data.sala);
    if (!sala) return;
    const lado = socket.data.lado;
    const otro = sala.jugadores[1 - lado];

    if (otro && ["cuenta", "jugando", "pausa"].includes(sala.estado)) {
        terminar(sala, 1 - lado, "abandono");
    } else if (otro && sala.estado === "fin") {
        io.to(otro.id).emit("rivalSalio");
    }
    cerrarSala(sala);
}

// ---------- Física (un paso de 1/60 s) ----------
function moverPaleta(j) {
    const p = JUEGO.paleta;
    if (j.objetivo !== null) {
        const diferencia = j.objetivo - (j.y + p.alto / 2);
        j.y += limitar(diferencia, -p.velocidadPuntero, p.velocidadPuntero);
    } else {
        j.y += j.dir * p.velocidad;
    }
    j.y = limitar(j.y, 0, JUEGO.alto - p.alto);
}

function chocaConPaleta(b, lado, j) {
    const x = xPaleta(lado);
    const p = JUEGO.paleta;
    const r = JUEGO.radio;
    const haciaElla = lado === 0 ? b.vx < 0 : b.vx > 0;
    return haciaElla &&
        b.x - r < x + p.ancho &&
        b.x + r > x &&
        b.y + r > j.y &&
        b.y - r < j.y + p.alto;
}

// Rebote: el ángulo depende de dónde pega la pelota en la paleta
function rebotar(sala, lado) {
    const b = sala.pelota;
    const j = sala.jugadores[lado];
    const p = JUEGO.paleta;
    const relativo = limitar((b.y - (j.y + p.alto / 2)) / (p.alto / 2), -1, 1);

    sala.golpes++;
    if (sala.golpes % JUEGO.golpesPorNivel === 0) {
        sala.nivel++;
        b.velocidad = Math.min(b.velocidad * JUEGO.aumentoPorNivel, JUEGO.velocidadMaxima);
    }

    const angulo = relativo * JUEGO.anguloMaximo;
    const direccion = lado === 0 ? 1 : -1;
    b.vx = direccion * b.velocidad * Math.cos(angulo);
    b.vy = b.velocidad * Math.sin(angulo);
    b.x = lado === 0 ? xPaleta(0) + p.ancho + JUEGO.radio : xPaleta(1) - JUEGO.radio; // Evitar que se "atasque"
}

function anotar(sala, lado) {
    const j = sala.jugadores[lado];
    j.puntos++;
    io.to(sala.codigo).emit("gol", { lado, puntos: sala.jugadores.map((x) => x.puntos) });
    if (j.puntos >= sala.puntosParaGanar) {
        terminar(sala, lado, "puntos");
    } else {
        sacar(sala, 1 - lado); // Saca hacia quien recibió el gol
    }
}

function paso(sala, ahora) {
    sala.jugadores.forEach(moverPaleta);
    if (ahora < sala.saqueEn) return;

    const b = sala.pelota;
    b.x += b.vx;
    b.y += b.vy;

    // Rebote superior e inferior
    if (b.y - JUEGO.radio < 0) {
        b.y = JUEGO.radio;
        b.vy = Math.abs(b.vy);
    } else if (b.y + JUEGO.radio > JUEGO.alto) {
        b.y = JUEGO.alto - JUEGO.radio;
        b.vy = -Math.abs(b.vy);
    }

    // Colisión con las paletas
    if (chocaConPaleta(b, 0, sala.jugadores[0])) rebotar(sala, 0);
    else if (chocaConPaleta(b, 1, sala.jugadores[1])) rebotar(sala, 1);

    // Gol si la pelota sale por un lado
    if (b.x + JUEGO.radio < 0) anotar(sala, 1);
    else if (b.x - JUEGO.radio > JUEGO.ancho) anotar(sala, 0);
}

function emitirEstado(sala) {
    const b = sala.pelota;
    io.to(sala.codigo).volatile.emit("estado", {
        b: [redondear(b.x), redondear(b.y)],
        p: sala.jugadores.map((j) => redondear(j.y)),
        n: sala.nivel
    });
}

// Bucle principal con paso fijo: la velocidad no depende de lo que tarde cada vuelta
let ultimoTick = performance.now();
let acumulado = 0;
setInterval(() => {
    const ahora = performance.now();
    acumulado += ahora - ultimoTick;
    ultimoTick = ahora;

    let pasos = 0;
    while (acumulado >= PASO_MS && pasos < 5) {
        const reloj = Date.now();
        for (const sala of salas.values()) {
            if (sala.estado === "jugando") paso(sala, reloj);
        }
        acumulado -= PASO_MS;
        pasos++;
    }
    if (pasos === 5) acumulado = 0; // Si el servidor se atrasó, no intentar "alcanzar"

    if (pasos > 0) {
        for (const sala of salas.values()) {
            if (sala.estado === "jugando" || sala.estado === "cuenta") emitirEstado(sala);
        }
    }
}, PASO_MS);

// ---------- Conexiones ----------
io.on("connection", (socket) => {
    socket.data.sala = null;
    socket.data.lado = null;
    socket.data.entradas = 0;
    socket.data.ventana = Date.now();
    socket.join("vestibulo");
    socket.emit("salas", salasAbiertas());

    socket.on("crearSala", (datos, cb) => {
        if (socket.data.sala) return responder(cb, { ok: false, error: "Ya estás en una sala." });
        const nombre = validarNombre(datos && datos.nombre);
        if (!nombre) return responder(cb, { ok: false, error: "Nombre no válido." });
        const dificultad = Object.hasOwn(DIFICULTADES, datos.dificultad) ? datos.dificultad : "normal";
        const puntosParaGanar = PUNTOS_PARA_GANAR.includes(datos.puntosParaGanar) ? datos.puntosParaGanar : 5;
        if (salas.size >= MAX_SALAS) return responder(cb, { ok: false, error: "El servidor está lleno, intenta más tarde." });

        const codigo = generarCodigo();
        salas.set(codigo, {
            codigo,
            dificultad,
            puntosParaGanar,
            estado: "esperando",
            jugadores: [nuevoJugador(socket, nombre)],
            pelota: { x: JUEGO.ancho / 2, y: JUEGO.alto / 2, vx: 0, vy: 0, velocidad: DIFICULTADES[dificultad] },
            nivel: 1,
            golpes: 0,
            saqueEn: 0,
            temporizador: null
        });
        socket.leave("vestibulo");
        socket.join(codigo);
        socket.data.sala = codigo;
        socket.data.lado = 0;
        responder(cb, { ok: true, codigo, dificultad, puntosParaGanar });
        avisarVestibulo();
    });

    socket.on("unirse", (datos, cb) => {
        if (socket.data.sala) return responder(cb, { ok: false, error: "Ya estás en una sala." });
        const nombre = validarNombre(datos && datos.nombre);
        if (!nombre) return responder(cb, { ok: false, error: "Nombre no válido." });
        const codigo = typeof datos.codigo === "string" ? datos.codigo.trim().toUpperCase() : "";
        if (!/^[A-Z0-9]{4}$/.test(codigo)) return responder(cb, { ok: false, error: "El código tiene 4 letras o números." });
        const sala = salas.get(codigo);
        if (!sala) return responder(cb, { ok: false, error: "No existe una sala con ese código." });
        if (sala.estado !== "esperando") return responder(cb, { ok: false, error: "Esa sala ya está jugando." });

        sala.jugadores.push(nuevoJugador(socket, nombre));
        socket.leave("vestibulo");
        socket.join(codigo);
        socket.data.sala = codigo;
        socket.data.lado = 1;
        responder(cb, { ok: true, codigo });
        avisarVestibulo();
        iniciarPartida(sala); // ¡Ya hay dos jugadores!
    });

    socket.on("salir", () => salirDeSala(socket));

    // Movimiento de la paleta: { dir: -1 | 0 | 1 } con teclado o { y: número } con dedo / clic
    socket.on("entrada", (datos) => {
        const sala = salas.get(socket.data.sala);
        if (!sala || !datos || typeof datos !== "object") return;

        // Límite de mensajes por segundo para que nadie sature el servidor
        const ahora = Date.now();
        if (ahora - socket.data.ventana >= 1000) {
            socket.data.ventana = ahora;
            socket.data.entradas = 0;
        }
        if (++socket.data.entradas > MAX_ENTRADAS_POR_SEGUNDO) return;

        const j = sala.jugadores[socket.data.lado];
        if (!j) return;
        if (datos.dir === -1 || datos.dir === 0 || datos.dir === 1) {
            j.dir = datos.dir;
            j.objetivo = null;
        } else if (Number.isFinite(datos.y)) {
            j.objetivo = limitar(datos.y, 0, JUEGO.alto);
            j.dir = 0;
        }
    });

    socket.on("pausa", (cb) => {
        const sala = salas.get(socket.data.sala);
        if (!sala || sala.estado !== "jugando") return responder(cb, { ok: false });
        const j = sala.jugadores[socket.data.lado];
        if (j.pausas <= 0) return responder(cb, { ok: false, error: "Ya usaste tus pausas." });
        j.pausas--;
        sala.estado = "pausa";
        sala.restanteSaque = Math.max(0, sala.saqueEn - Date.now());
        io.to(sala.codigo).emit("pausa", { nombre: j.nombre, lado: socket.data.lado, pausas: sala.jugadores.map((x) => x.pausas) });
        responder(cb, { ok: true });
    });

    socket.on("reanudar", () => {
        const sala = salas.get(socket.data.sala);
        if (!sala || sala.estado !== "pausa") return;
        sala.saqueEn = Date.now() + JUEGO.cuentaRegresiva + sala.restanteSaque;
        cuentaRegresiva(sala);
    });

    socket.on("revancha", () => {
        const sala = salas.get(socket.data.sala);
        if (!sala || sala.estado !== "fin" || sala.jugadores.length < 2) return;
        sala.jugadores[socket.data.lado].revancha = true;
        io.to(sala.codigo).emit("revancha", { votos: sala.jugadores.map((j) => j.revancha) });
        if (sala.jugadores.every((j) => j.revancha)) iniciarPartida(sala);
    });

    socket.on("disconnect", () => salirDeSala(socket));
});

server.listen(PUERTO, "0.0.0.0", () => {
    console.log("Servidor activo en http://localhost:" + PUERTO);
    // Direcciones de la red local para jugar desde el celular (misma Wi-Fi)
    for (const lista of Object.values(os.networkInterfaces())) {
        for (const red of lista || []) {
            if (red.family === "IPv4" && !red.internal) {
                console.log("  En tu red:  http://" + red.address + ":" + PUERTO);
            }
        }
    }
});
