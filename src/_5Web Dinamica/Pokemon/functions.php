<?php
// Consulta un Pokémon por nombre o número.
$entrada = $_GET["pokemon"] ?? $_POST["nombre"] ?? "Pikachu";
$pokemon = is_string($entrada) ? trim($entrada) : "";
$nombre = $pokemon;
$datos = null;
$error = "";

function escapar(string $texto): string
{
    return htmlspecialchars($texto, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
}

if ($pokemon === "" || !preg_match('/^[a-zA-Z0-9-]+$/', $pokemon)) {
    $error = "Ingresa un nombre o número válido de Pokémon.";
} else {
    $url = "https://pokeapi.co/api/v2/pokemon/" . strtolower($pokemon);
    $contexto = stream_context_create(["http" => [
        "timeout" => 10,
        "ignore_errors" => true,
        "follow_location" => 0,
    ]]);
    $respuesta = @file_get_contents($url, false, $contexto);
    $cabeceras = $http_response_header ?? [];
    $estado = 0;
    foreach ($cabeceras as $cabecera) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $cabecera, $coincidencia)) {
            $estado = (int)$coincidencia[1];
        }
    }

    if ($estado === 404) {
        $error = "No se encontró ese Pokémon. Revisa el nombre.";
    } elseif ($respuesta === false || $estado !== 200) {
        $error = "No se pudo conectar con PokéAPI. Intenta de nuevo más tarde.";
    } else {
        $datos = json_decode($respuesta, true);
        if (!is_array($datos) || !isset($datos["name"], $datos["types"], $datos["height"], $datos["weight"])) {
            $datos = null;
            $error = "La API devolvió una respuesta inválida.";
        }
    }
}
