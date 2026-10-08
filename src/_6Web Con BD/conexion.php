<?php
$Host = "localhost";
$User = "root";
$Password = "123";
$Database = "escuela";

$conexion = mysqli_connect($Host, $User, $Password, $Database);

if (!$conexion) {
    die("\nError de conexión: " . mysqli_connect_error()."\n");
}

//echo "\nConexión exitosa\n";
?>

