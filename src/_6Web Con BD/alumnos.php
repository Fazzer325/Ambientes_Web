<?php global $conexion;
include_once "conexion.php"; ?>

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
</head>
<body>
<?php
$sql = "SELECT * FROM alumnos";
$resultado = mysqli_query($conexion, $sql);?>

<h1>Lista de calificaciones</h1>
<table border="1">
    <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Semestre</th>
        <th>Materia</th>
    </tr>

    <?php while ($fila = $resultado->fetch_assoc()): ?>
        <tr>
            <td><?php echo $fila['ID']; ?></td>
            <td><?php  echo htmlspecialchars( $fila['Nombre']); ?></td>
            <td><?php echo htmlspecialchars( $fila['Semestre']); ?></td>
            <td><?php echo htmlspecialchars( $fila['Carrera']); ?></td>
        </tr>
    <?php endwhile; ?>
</table>
</body>
</html>
