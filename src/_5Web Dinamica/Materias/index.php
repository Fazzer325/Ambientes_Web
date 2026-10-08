
<?php include "header.php"; ?>

<h1>Registro</h1>

<form action="resultado.php" method="POST">

    <label for="nombre">Nombre</label>
    <input type="text" id ="nombre" name="nombre" required>

    <label for="materia">Materia</label>
    <input type="text" id ="materia" name="materia" required>

    <label for="calificacion">Calificacion</label>
    <input type="number" id="calificacion" name="calificacion"
           min="0" max="10" step="0.1" required>

    <br><br>

    <button type="submit">Enviar</button>
</form>

 <?php include_once "footer.php";?>