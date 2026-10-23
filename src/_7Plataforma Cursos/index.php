<?php
require_once "config/conexion.php";

if (usuario_autenticado()) {
    header("Location: dashboard.php");
} else {
    header("Location: login.php");
}
exit;
?>
