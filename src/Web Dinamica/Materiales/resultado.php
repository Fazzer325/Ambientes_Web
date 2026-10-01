<?php
$mensaje = "";
$datosValidos = false;

$cliente = "";
$producto = "";
$preciou = 0;
$cantidad = 0;
$subtotal = 0;
$descuento = 0;
$total = 0;

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $cliente = trim((string)($_POST["cliente"] ?? ""));
    $producto = trim((string)($_POST["producto"] ?? ""));

    $preciou = filter_var($_POST["preciou"] ?? "", FILTER_VALIDATE_FLOAT);
    $cantidad = filter_var($_POST["cantidad"] ?? "", FILTER_VALIDATE_INT);

    if (
        $cliente === "" ||
        $producto === "" ||
        $preciou === false ||
        $preciou < 0 ||
        $preciou > 100 ||
        $cantidad === false ||
        $cantidad < 1 ||
        $cantidad > 100
    ) {
        $mensaje = "Ingresa todos los datos correctamente. El precio debe estar entre 0 y 100 y la cantidad entre 1 y 100.";
    } else {
        $subtotal = $preciou * $cantidad;
        $descuento = 0;

        if ($subtotal > 600) {
            $descuento = $subtotal * 0.10;
        }

        $total = $subtotal - $descuento;
        $datosValidos = true;
    }
} else {
    $mensaje = "No se recibieron datos del formulario.";
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Resultado</title>
    <link rel="stylesheet" href="index.css">
</head>
<body>

<?php if ($datosValidos): ?>

    <h2>Datos registrados</h2>

    <p>Cliente: <?= htmlspecialchars($cliente, ENT_QUOTES, "UTF-8") ?></p>
    <p>Producto: <?= htmlspecialchars($producto, ENT_QUOTES, "UTF-8") ?></p>
    <p>Precio unitario: $<?= number_format((float)$preciou, 2) ?></p>
    <p>Cantidad: <?= $cantidad ?></p>
    <p>Subtotal: $<?= number_format($subtotal, 2) ?></p>
    <p>Descuento: $<?= number_format($descuento, 2) ?></p>
    <p>Total: $<?= number_format($total, 2) ?></p>

<?php else: ?>

    <p><?= htmlspecialchars($mensaje, ENT_QUOTES, "UTF-8") ?></p>

<?php endif; ?>

<p><a href="index.php">Volver al formulario</a></p>

</body>
</html>
