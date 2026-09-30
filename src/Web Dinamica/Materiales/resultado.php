<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $cliente = trim((string)($_POST["cliente"] ?? ""));
    $producto = trim((string)($_POST["producto"] ?? ""));

    $preciou = filter_var($_POST["preciou"] ?? "", FILTER_VALIDATE_FLOAT);

    $cantidad = filter_var($_POST["cantidad"] ?? "", FILTER_VALIDATE_INT);

    if (
        $cliente == "" ||
        $producto == "" ||
        $preciou === false ||
        $cantidad === false ||
        $cantidad < 1 ||
        $cantidad > 100
    ) {
        echo "<p>Ingresa todos los datos y la cantidad entre 1 y 100.</p>";

    } else {

        $subtotal = $preciou * $cantidad;

        // Valores por defecto
        $descuento = 0;
        $total = $subtotal;

        if ($subtotal > 600) {
            $descuento = $subtotal * 0.1;
            $total = $subtotal - $descuento;
        }

        echo "<h2>Datos registrados</h2>";

        echo "<p>Cliente: "
            . htmlspecialchars($cliente, ENT_QUOTES, "UTF-8")
            . "</p>";

        echo "<p>Producto: "
            . htmlspecialchars($producto, ENT_QUOTES, "UTF-8")
            . "</p>";

        echo "<p>Precio unitario: $" . $preciou . "</p>";
        echo "<p>Cantidad: " . $cantidad . "</p>";
        echo "<p>Subtotal: $" . $subtotal . "</p>";
        echo "<p>Descuento: $" . $descuento . "</p>";
        echo "<p>Total: $" . $total . "</p>";
    }
}
?>