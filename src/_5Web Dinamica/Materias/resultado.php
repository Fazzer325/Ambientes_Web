<!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultado del registro</title>
    <link rel="stylesheet" href="footer.css">
</head>
<body>
<?php include __DIR__ . '/header.php'; ?>
<h1>Resultado del registro</h1>
<main class="resultado">
<?php
if($_SERVER["REQUEST_METHOD"] == "POST"){
    $nombre = trim((string)($_POST["nombre"] ?? ""));
    $materia = trim((string)($_POST["materia"] ?? ""));
    $calificacion = filter_var($_POST["calificacion"] ??"",FILTER_VALIDATE_FLOAT
    );

    if (
        $nombre == "" ||
        $materia == "" ||
        $calificacion === false ||
        $calificacion < 0 ||
        $calificacion > 10
    ) {
        echo "<p> Ingresa todos los datos y una calificacion entre 0 y 10</p>";
    }else{
        echo "<h2>Datos registrados</h2>";
        echo "<p> Nombre:". htmlspecialchars($nombre, ENT_QUOTES, "UTF-8")."</p>";
        echo "<p> Materia:". htmlspecialchars($materia, ENT_QUOTES, "UTF-8")."</p>";
        echo "<p> Calificacion:". $calificacion . "</p>";
    }
} else {
    echo "<p>Completa el formulario para consultar el resultado.</p>";
}
?>
    <a class="volver" href="index.php">Volver al registro</a>
</main>
<?php include_once __DIR__ . '/footer.php'; ?>
</body>
</html>
