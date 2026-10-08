const cliente = document.querySelector("#cliente");
const paginas = document.querySelector("#Paginas");
const dominio = document.querySelector("#Dominio");
const hosting = document.querySelector("#Hosting");
const bd = document.querySelector("#BD");
const seo = document.querySelector("#SEO");
const reset = document.querySelector("#reset");
const formulario = document.querySelector("#cotizador");
const cupon = document.querySelector("#Cupon");
const EE = document.querySelector("#EasterEgg");
const img = document.querySelector("#Imagen");

formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    abrirPopup();
});

[cliente, paginas].forEach(function (campo) {
    campo.addEventListener("input", function () {
        campo.setCustomValidity("");
    });
});

function obtenerDescuento() {
    switch (cupon.value.trim().toLowerCase()) {
        case "septiembre": return 0.15;
        case "octubre": return 0.50;
        default: return 0;
    }
}

const servicios = [
    {elemento: dominio, nombre: "Dominio"},
    {elemento: hosting, nombre: "Hosting"},
    {elemento: bd, nombre: "Base de datos"},
    {elemento: seo, nombre: "SEO"}
];

function calcularTotal() {
    const numeroPaginas = Math.max(0, parseInt(paginas.value) || 0);
    const paginasExtra = Math.max(0, numeroPaginas);
    let totalPaginas = paginasExtra * 2000;
    if (numeroPaginas <= 3 && numeroPaginas > 0) {
        totalPaginas = 5000
    }

    const totalServicios = servicios.reduce(function (suma, servicio) {
        if (servicio.elemento.checked) {
            return suma + parseInt(servicio.elemento.dataset.precio);
        }
        return suma;
    }, 0);

    return (totalPaginas + totalServicios) * (1 - obtenerDescuento()) * 1.16;
}

// !-- POPUP -- !

function abrirPopup() {
    const nombreCliente = cliente.value.trim();
    const cantidadPaginas = Number(paginas.value);
    cliente.setCustomValidity("");
    paginas.setCustomValidity("");

    if (!nombreCliente) {
        cliente.setCustomValidity("Ingresa el nombre del cliente.");
        cliente.reportValidity();
        return;
    }

    if (!Number.isInteger(cantidadPaginas) || cantidadPaginas <= 0) {
        paginas.setCustomValidity("Ingresa un número entero de páginas mayor que 0.");
        paginas.reportValidity();
        return;
    }

    if (!formulario.reportValidity()) {
        return;
    }

    document.getElementById("popupCliente").textContent =
        nombreCliente;

    const numeroPaginas = Math.max(0, parseInt(paginas.value) || 0);
    document.getElementById("popupPaginas").textContent = numeroPaginas;

    const paginasExtra = Math.max(0, numeroPaginas - 3);
    const costoPaginas = paginasExtra * 2000;
    const contenedorPaginas = document.getElementById("popupPaginasExtra");

    contenedorPaginas.innerHTML = "";

    if (paginasExtra > 0) {
        const parrafo = document.createElement("p");
        parrafo.innerHTML =
            "<strong>Páginas adicionales:</strong> " +
            paginasExtra +
            " = $" +
            costoPaginas.toLocaleString("es-MX");

        contenedorPaginas.appendChild(parrafo);
    }

    const popupServicios = document.getElementById("popupServicios");
    popupServicios.innerHTML = "";

    servicios.forEach(function (servicio) {
        if (servicio.elemento.checked) {
            const precio = parseInt(servicio.elemento.dataset.precio);
            const parrafo = document.createElement("p");

            parrafo.innerHTML =
                "<strong>" +
                servicio.nombre +
                ":</strong> $" +
                precio.toLocaleString("es-MX");

            popupServicios.appendChild(parrafo);
        }
    });

    const descuento = obtenerDescuento();
    document.getElementById("CuponDescuento").textContent = descuento > 0
        ? "Descuento por cupón: " + (descuento * 100) + "%"
        : cupon.value.trim() ? "Cupón no válido: sin descuento." : "";

    const total = calcularTotal();

    document.getElementById("popupTotal").textContent =
        "$" + total.toLocaleString("es-MX") + " MXN";

    document.getElementById("popupCotizacion").showModal();
}

function cerrarPopup() {
    document.getElementById("popupCotizacion").close();
}

reset.addEventListener("click", function () {
    cliente.setCustomValidity("");
    paginas.setCustomValidity("");
    const popup = document.getElementById("popupCotizacion");

    if (popup.open) {
        popup.close();
    }
});

// -------------------- IMPORTAR BARRA --------------------



const imagenes = ["Imagenes/0.png", "Imagenes/1.jpg", "Imagenes/2.jpg", "Imagenes/3.gif", "Imagenes/4.jpg"];
let indiceImagen = 0;

EE.addEventListener("click", function () {
    indiceImagen = (indiceImagen + 1) % imagenes.length;
    img.src = imagenes[indiceImagen];
});
