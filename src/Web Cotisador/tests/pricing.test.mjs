import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const calculatorScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];

class FormElement {
    constructor({ price } = {}) {
        this.value = "";
        this.checked = false;
        this.dataset = price ? { precio: price } : {};
        this.textContent = "";
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    dispatch(type) {
        this.listeners.get(type)?.();
    }
}

function loadCalculator() {
    const elements = {
        "#Paginas": new FormElement(),
        "#Dominio": new FormElement({ price: "1500" }),
        "#Hosting": new FormElement({ price: "600" }),
        "#BD": new FormElement({ price: "7000" }),
        "#SEO": new FormElement({ price: "2000" }),
        "#reset": new FormElement(),
        "#total": new FormElement()
    };

    const document = {
        querySelector(selector) {
            return elements[selector];
        },
        getElementById(id) {
            return elements[`#${id}`];
        }
    };

    vm.runInNewContext(calculatorScript, { document, console: { log() {} } });

    return elements;
}

function changePages(elements, numberOfPages) {
    elements["#Paginas"].value = String(numberOfPages);
    elements["#Paginas"].dispatch("change");
}

test("las primeras tres paginas no generan un cargo adicional", () => {
    const elements = loadCalculator();

    changePages(elements, 3);

    assert.equal(elements["#total"].textContent, "Total: $0 MXN");
});

test("cada pagina posterior a la tercera agrega 2000 sin acumular cambios anteriores", () => {
    const elements = loadCalculator();

    changePages(elements, 4);
    assert.equal(elements["#total"].textContent, "Total: $2000 MXN");

    changePages(elements, 5);
    assert.equal(elements["#total"].textContent, "Total: $4000 MXN");

    changePages(elements, 4);
    assert.equal(elements["#total"].textContent, "Total: $2000 MXN");
});

test("el cargo por paginas se suma a los servicios seleccionados", () => {
    const elements = loadCalculator();
    elements["#Dominio"].checked = true;
    elements["#Dominio"].dispatch("click");

    changePages(elements, 4);

    assert.equal(elements["#total"].textContent, "Total: $3500 MXN");
});
