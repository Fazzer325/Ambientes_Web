import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectUrl = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", projectUrl), "utf8");
const css = await readFile(new URL("Css/index.css", projectUrl), "utf8");

test("la cotizacion conserva todos los conceptos de cobro", () => {
    for (const price of ["1500", "600", "7000", "2000"]) {
        assert.match(html, new RegExp(`data-precio=["']${price}["']`));
    }

    assert.match(html, /N[uú]mero de p[aá]ginas/i);
    assert.match(html, /2000 MXN/i);
});

test("el formulario y el resultado usan el nuevo diseño de dos paneles", () => {
    assert.match(html, /href=["']Css\/index\.css["']/i);
    assert.match(html, /class=["'][^"']*cotizador-layout[^"']*["']/i);
    assert.match(html, /class=["'][^"']*panel-resultado[^"']*["']/i);
    assert.match(css, /\.cotizador-layout\s*\{[^}]*display\s*:\s*flex/is);
});

test("existe un solo elemento para mostrar el total", () => {
    const totalIds = html.match(/id=["']total["']/gi) ?? [];
    assert.equal(totalIds.length, 1);
});
