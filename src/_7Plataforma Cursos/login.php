<?php
require_once "config/conexion.php";

$page_title = "Iniciar Sesión";
$error = "";
$success = "";

// Si ya está autenticado, redirigir al Dashboard
if (usuario_autenticado()) {
    header("Location: dashboard.php");
    exit;
}

if (isset($_GET['registro']) && $_GET['registro'] === 'exitoso') {
    $success = "¡Registro exitoso! Ya puedes iniciar sesión con tus credenciales y tu contraseña encriptada.";
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        $error = "Por favor, completa todos los campos requeridos.";
    } else {
        try {
            // Consulta segura con Sentencia Preparada (evita SQL Injection)
            $stmt = $pdo->prepare("
                SELECT u.id, u.nombre, u.apellidos, u.email, u.password, u.rol_id, u.telefono, u.avatar, u.estado,
                       r.nombre AS rol_nombre, r.nivel_acceso
                FROM usuarios u
                JOIN roles r ON u.rol_id = r.id
                WHERE u.email = :email
                LIMIT 1
            ");
            $stmt->execute([':email' => $email]);
            $usuario = $stmt->fetch();

            // Verificación del hash encriptado con password_verify()
            if ($usuario && password_verify($password, $usuario['password'])) {
                if ($usuario['estado'] !== 'Activo') {
                    $error = "Tu cuenta se encuentra inactiva o deshabilitada. Consulta con el Administrador.";
                } else {
                    // Guardar datos en la sesión
                    $_SESSION['usuario'] = [
                        'id' => $usuario['id'],
                        'nombre' => $usuario['nombre'],
                        'apellidos' => $usuario['apellidos'],
                        'nombre_completo' => $usuario['nombre'] . ' ' . $usuario['apellidos'],
                        'email' => $usuario['email'],
                        'rol' => $usuario['rol_nombre'],
                        'rol_id' => $usuario['rol_id'],
                        'telefono' => $usuario['telefono'],
                        'avatar' => $usuario['avatar'],
                        'login_time' => date('d/m/Y H:i:s')
                    ];
                    $_SESSION['mensaje_bienvenida'] = "Inicio de sesión correcto como {$usuario['rol_nombre']}";

                    header("Location: dashboard.php");
                    exit;
                }
            } else {
                $error = "Correo electrónico o contraseña incorrectos. Verifica que la contraseña coincida con el hash encriptado.";
            }
        } catch (Exception $e) {
            $error = "Error al procesar el inicio de sesión: " . $e->getMessage();
        }
    }
}

include_once "includes/header.php";
?>

<div class="auth-wrapper">
    <div class="auth-card">
        <div class="auth-header">
            <div style="font-size:2.8rem;margin-bottom:0.5rem;">🔐</div>
            <h2>Acceso a la Plataforma</h2>
            <p>Ingresa tus credenciales para acceder a tu panel</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="alert alert-danger">
                <span>⚠️</span>
                <span><?php echo htmlspecialchars($error); ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="alert alert-success">
                <span>✅</span>
                <span><?php echo htmlspecialchars($success); ?></span>
            </div>
        <?php endif; ?>

        <form action="login.php" method="POST" autocomplete="off">
            <div class="form-group">
                <label for="email" class="form-label">Correo Electrónico:</label>
                <input type="email" id="email" name="email" class="form-control" placeholder="usuario@cursos.edu" required autofocus value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>">
            </div>

            <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
                    <label for="password" class="form-label" style="margin-bottom:0;">Contraseña:</label>
                    <button type="button" class="btn btn-outline btn-sm" style="padding:0.15rem 0.5rem;font-size:0.75rem;" onclick="togglePassword('password', this)">👁️ Mostrar</button>
                </div>
                <input type="password" id="password" name="password" class="form-control" placeholder="••••••••••••" required>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;padding:0.8rem;font-size:1rem;margin-top:0.5rem;">
                🚀 Iniciar Sesión
            </button>
        </form>

        <div style="text-align:center;margin-top:1.5rem;font-size:0.9rem;color:var(--text-muted);">
            ¿No tienes cuenta? <a href="registro.php" style="color:var(--primary);font-weight:600;text-decoration:none;">Regístrate aquí (Alumnos y Ponentes)</a>
        </div>

        <div style="margin-top:1.5rem;padding:0.85rem;background:#f8fafc;border-radius:var(--radius-sm);border:1px solid var(--border);text-align:center;">
            <p style="font-size:0.8rem;color:var(--text-muted);margin:0;">
                🔒 <strong>Seguridad:</strong> Autenticación protegida con hashing criptográfico BCRYPT.
            </p>
        </div>
    </div>
</div>

<?php include_once "includes/footer.php"; ?>
