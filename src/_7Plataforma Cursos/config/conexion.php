<?php
// ====================================================================
// ARCHIVO DE CONEXIÓN A BASE DE DATOS (PDO Y MYSQLI)
// Compatible con entornos locales XAMPP / MariaDB / MySQL
// ====================================================================

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$db_host = "localhost";
$db_name = "plataforma_cursos";
$db_user = "root";
$db_pass = ""; // Predeterminado en XAMPP

// Intentar conexión inicial sin contraseña (estándar XAMPP), o con fallback "123"
try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    try {
        // Intento con password "123" en caso de configuración personalizada
        $db_pass = "123";
        $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e2) {
        die("<div style='font-family:sans-serif;padding:20px;background:#fee2e2;color:#991b1b;border-radius:8px;'>
            <h3>Error de Conexión a la Base de Datos</h3>
            <p>No se pudo conectar a la base de datos <strong>{$db_name}</strong>.</p>
            <p><strong>Detalle:</strong> " . htmlspecialchars($e2->getMessage()) . "</p>
            <p>Verifique que MySQL esté iniciado en XAMPP y que haya importado el archivo <code>database.sql</code>.</p>
        </div>");
    }
}

// Conexión auxiliar MySQLi para compatibilidad con código de clase existente
$conexion = @mysqli_connect($db_host, $db_user, $db_pass, $db_name);
if ($conexion) {
    mysqli_set_charset($conexion, "utf8mb4");
}

// Función auxiliar para verificar si el usuario tiene sesión activa
function usuario_autenticado() {
    return isset($_SESSION['usuario']) && !empty($_SESSION['usuario']['id']);
}

// Función para obtener el usuario actual
function obtener_usuario_sesion() {
    return $_SESSION['usuario'] ?? null;
}
?>
