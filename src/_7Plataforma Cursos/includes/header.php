<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$usuario_actual = $_SESSION['usuario'] ?? null;

// Determinar clase de badge de rol sin contaminar la variable global $rol_nombre
$badge_class = 'role-alumno';
if ($usuario_actual) {
    $rol_badge_slug = strtolower(trim($usuario_actual['rol'] ?? ''));
    if ($rol_badge_slug === 'superadmin') $badge_class = 'role-superadmin';
    else if ($rol_badge_slug === 'director') $badge_class = 'role-director';
    else if ($rol_badge_slug === 'ponente') $badge_class = 'role-ponente';
    else $badge_class = 'role-alumno';
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($page_title) ? htmlspecialchars($page_title) . " - " : ""; ?>EduPlatform Cursos</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
</head>
<body>

<header class="navbar">
    <div class="nav-container">
        <a href="<?php echo $usuario_actual ? 'dashboard.php' : 'login.php'; ?>" class="brand-logo">
            <div class="brand-icon">🎓</div>
            <span>EduPlatform <small style="font-size:0.75rem;font-weight:400;color:var(--text-muted);">Cursos Web</small></span>
        </a>

        <ul class="nav-menu">
            <?php if ($usuario_actual): ?>
                <li><a href="dashboard.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'dashboard.php' ? 'active' : ''; ?>">📊 Dashboard</a></li>
                <li><a href="explorador_bd.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'explorador_bd.php' ? 'active' : ''; ?>">📁 Base de Datos & PW</a></li>
                <li><a href="documentacion.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'documentacion.php' ? 'active' : ''; ?>">📑 Evidencia y Reporte</a></li>
                
                <li class="user-badge-header">
                    <span class="badge-role <?php echo $badge_class; ?>">
                        <?php echo htmlspecialchars($usuario_actual['rol']); ?>
                    </span>
                    <span style="font-size:0.9rem;font-weight:600;color:#334155;">
                        <?php echo htmlspecialchars($usuario_actual['nombre']); ?>
                    </span>
                    <a href="logout.php" class="btn btn-outline btn-sm" title="Cerrar Sesión">🚪 Salir</a>
                </li>
            <?php else: ?>
                <li><a href="login.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'login.php' ? 'active' : ''; ?>">Iniciar Sesión</a></li>
                <li><a href="registro.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'registro.php' ? 'active' : ''; ?>">Registrarse</a></li>
                <li><a href="explorador_bd.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'explorador_bd.php' ? 'active' : ''; ?>">Ver BD & Criptografía</a></li>
            <?php endif; ?>
        </ul>
    </div>
</header>
<main class="main-wrapper">
