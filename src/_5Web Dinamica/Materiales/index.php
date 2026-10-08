<!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Registro</title>
    <link rel="stylesheet" href="index.css">
</head>
<body>

<h1>Registro</h1>

<form action="resultado.php" method="POST">

    <label for="cliente">Cliente</label>
    <input type="text" id="cliente" name="cliente" required>

    <label for="producto">Producto</label>
    <input type="text" id="producto" name="producto" required>

    <label for="preciou">Precio unitario</label>
    <input type="number" id="preciou" name="preciou"
           min="0" max="100" step="0.01" required>

    <label for="cantidad">Cantidad</label>
    <input type="number" id="cantidad" name="cantidad"
           min="1" max="100" step="1" required>

    <br><br>

    <button type="submit">Enviar</button>
</form>

</body>
</html>
