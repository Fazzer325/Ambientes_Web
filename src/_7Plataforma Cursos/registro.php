<?php
require_once "config/conexion.php";

$page_title = "Registrar Nuevo Usuario";
$error = "";
$success = "";

// Cargar roles disponibles de la base de datos
try {
    $stmtRoles = $pdo->query("SELECT id, nombre, descripcion FROM roles ORDER BY id ASC");
    $roles_disponibles = $stmtRoles->fetchAll();
} catch (Exception $e) {
    $roles_disponibles = [];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombre = trim($_POST['nombre'] ?? '');
    $apellidos = trim($_POST['apellidos'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $rol_id = intval($_POST['rol_id'] ?? 3); // 3 = Alumno por defecto
    $password = $_POST['password'] ?? '';
    $password_confirm = $_POST['password_confirm'] ?? '';

    // Datos específicos según rol
    $carrera = trim($_POST['carrera'] ?? 'Ingeniería en Tecnologías de la Información');
    $semestre = intval($_POST['semestre'] ?? 5);
    $matricula = trim($_POST['matricula'] ?? '');
    $especialidad = trim($_POST['especialidad'] ?? 'Tecnología Web');
    $departamento = trim($_POST['departamento'] ?? 'Dirección Académica');

    if (empty($nombre) || empty($apellidos) || empty($email) || empty($password)) {
        $error = "Por favor, completa todos los campos obligatorios.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "El formato del correo electrónico no es válido.";
    } elseif (strlen($password) < 6) {
        $error = "La contraseña debe tener al menos 6 caracteres.";
    } elseif ($password !== $password_confirm) {
        $error = "Las contraseñas ingresadas no coinciden.";
    } else {
        try {
            // Verificar si el correo ya existe
            $checkEmail = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
            $checkEmail->execute([':email' => $email]);
            if ($checkEmail->fetch()) {
                $error = "El correo electrónico ya se encuentra registrado.";
            } else {
                // ENCRIPTACIÓN DE CONTRASEÑA CON BCRYPT (COST 12)
                $password_encriptada = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

                $pdo->beginTransaction();

                // Insertar usuario
                $insertUser = $pdo->prepare("
                    INSERT INTO usuarios (nombre, apellidos, email, password, rol_id, telefono, estado)
                    VALUES (:nombre, :apellidos, :email, :password, :rol_id, :telefono, 'Activo')
                ");
                $insertUser->execute([
                    ':nombre' => $nombre,
                    ':apellidos' => $apellidos,
                    ':email' => $email,
                    ':password' => $password_encriptada,
                    ':rol_id' => $rol_id,
                    ':telefono' => $telefono
                ]);
                $nuevo_usuario_id = $pdo->lastInsertId();

                // Crear perfil según el tipo de usuario
                if ($rol_id == 3) { // Alumno
                    if (empty($matricula)) {
                        $matricula = "ALUM-" . date('Y') . "-" . rand(1000, 9999);
                    }
                    $stmtAlumno = $pdo->prepare("
                        INSERT INTO alumnos_perfil (usuario_id, matricula, carrera, semestre, grupo, promedio_general)
                        VALUES (:uid, :mat, :carrera, :semestre, '5to A', 9.0)
                    ");
                    $stmtAlumno->execute([
                        ':uid' => $nuevo_usuario_id,
                        ':mat' => $matricula,
                        ':carrera' => $carrera,
                        ':semestre' => $semestre
                    ]);

                    // Inscribir al alumno en materias activas para que tenga materias y calificaciones visibles
                    $materias = $pdo->query("SELECT id FROM materias LIMIT 3")->fetchAll();
                    foreach ($materias as $mat) {
                        $insc = $pdo->prepare("
                            INSERT INTO inscripciones (alumno_id, materia_id, periodo, fecha_inscripcion)
                            VALUES (:aid, :mid, '2026-2', CURDATE())
                        ");
                        $insc->execute([':aid' => $nuevo_usuario_id, ':mid' => $mat['id']]);
                        $insc_id = $pdo->lastInsertId();

                        // Generar calificación inicial
                        $calif = $pdo->prepare("
                            INSERT INTO calificaciones (inscripcion_id, alumno_id, materia_id, parcial_1, parcial_2, parcial_3, calificacion_final, estatus, observaciones)
                            VALUES (:iid, :aid, :mid, 9.5, 9.0, 9.5, 9.33, 'Aprobado', 'Inscripción automática completada')
                        ");
                        $calif->execute([':iid' => $insc_id, ':aid' => $nuevo_usuario_id, ':mid' => $mat['id']]);
                    }
                } elseif ($rol_id == 4) { // Ponente
                    $stmtPonente = $pdo->prepare("
                        INSERT INTO ponentes_perfil (usuario_id, especialidad, cedula, biografia)
                        VALUES (:uid, :esp, :ced, :bio)
                    ");
                    $stmtPonente->execute([
                        ':uid' => $nuevo_usuario_id,
                        ':esp' => $especialidad,
                        ':ced' => 'CED-' . rand(1000000, 9999999),
                        ':bio' => 'Docente especialista en tecnologías web avanzadas.'
                    ]);
                } elseif ($rol_id == 2) { // Director
                    $stmtDirector = $pdo->prepare("
                        INSERT INTO directores_perfil (usuario_id, departamento, oficina)
                        VALUES (:uid, :dep, :of)
                    ");
                    $stmtDirector->execute([
                        ':uid' => $nuevo_usuario_id,
                        ':dep' => $departamento,
                        ':of' => 'Edificio Central - Despacho ' . rand(101, 305)
                    ]);
                }

                $pdo->commit();
                header("Location: login.php?registro=exitoso");
                exit;
            }
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = "Error al crear la cuenta: " . $e->getMessage();
        }
    }
}

include_once "includes/header.php";
?>

<div class="auth-wrapper" style="padding-top:1.5rem;padding-bottom:2.5rem;">
    <div class="auth-card" style="max-width: 650px;">
        <div class="auth-header" style="margin-bottom:1.5rem;">
            <div style="font-size:2.5rem;margin-bottom:0.3rem;">📝</div>
            <h2>Registro de Nuevo Usuario</h2>
            <p>Crea tu cuenta seleccionando tu tipo de usuario (Rol)</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="alert alert-danger">
                <span>⚠️</span>
                <span><?php echo htmlspecialchars($error); ?></span>
            </div>
        <?php endif; ?>

        <form action="registro.php" method="POST" id="formRegistro">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label for="nombre" class="form-label">Nombre(s): *</label>
                    <input type="text" id="nombre" name="nombre" class="form-control" placeholder="Ej. Juan Carlos" required value="<?php echo htmlspecialchars($_POST['nombre'] ?? ''); ?>">
                </div>

                <div class="form-group">
                    <label for="apellidos" class="form-label">Apellidos: *</label>
                    <input type="text" id="apellidos" name="apellidos" class="form-control" placeholder="Ej. Pérez Gómez" required value="<?php echo htmlspecialchars($_POST['apellidos'] ?? ''); ?>">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label for="email" class="form-label">Correo Institucional: *</label>
                    <input type="email" id="email" name="email" class="form-control" placeholder="usuario@cursos.edu" required value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>">
                </div>

                <div class="form-group">
                    <label for="telefono" class="form-label">Teléfono:</label>
                    <input type="tel" id="telefono" name="telefono" class="form-control" placeholder="443-000-0000" value="<?php echo htmlspecialchars($_POST['telefono'] ?? ''); ?>">
                </div>
            </div>

            <div class="form-group">
                <label for="rol_id" class="form-label">Tipo de Usuario (Rol): *</label>
                <select id="rol_id" name="rol_id" class="form-control" onchange="mostrarCamposRol(this.value)" style="font-weight:600;">
                    <?php foreach ($roles_disponibles as $r): ?>
                        <option value="<?php echo $r['id']; ?>" <?php echo (isset($_POST['rol_id']) && $_POST['rol_id'] == $r['id']) || (!isset($_POST['rol_id']) && $r['id'] == 3) ? 'selected' : ''; ?>>
                            <?php 
                            $icono = '👤';
                            if ($r['nombre'] == 'SuperAdmin') $icono = '🛡️';
                            elseif ($r['nombre'] == 'Director') $icono = '🏛️';
                            elseif ($r['nombre'] == 'Alumno') $icono = '👨‍🎓';
                            elseif ($r['nombre'] == 'Ponente') $icono = '🎤';
                            echo "{$icono} {$r['nombre']} - {$r['descripcion']}";
                            ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- Campos específicos para ALUMNO -->
            <div id="campos_alumno" style="background:#f0fdf4;padding:1rem;border-radius:var(--radius-sm);border:1px solid #bbf7d0;margin-bottom:1.25rem;">
                <p style="font-weight:700;font-size:0.85rem;color:#166534;margin-bottom:0.75rem;">📋 Datos Académicos del Alumno:</p>
                <div style="display:grid;grid-template-columns:2fr 1fr;gap:0.75rem;">
                    <div>
                        <label class="form-label" style="font-size:0.8rem;">Carrera:</label>
                        <input type="text" name="carrera" class="form-control" value="Ing. en Tecnologías de la Información" style="font-size:0.85rem;">
                    </div>
                    <div>
                        <label class="form-label" style="font-size:0.8rem;">Semestre:</label>
                        <select name="semestre" class="form-control" style="font-size:0.85rem;">
                            <option value="1">1° Semestre</option>
                            <option value="3">3° Semestre</option>
                            <option value="5" selected>5° Semestre</option>
                            <option value="7">7° Semestre</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label for="password" class="form-label">Contraseña: *</label>
                    <input type="password" id="password" name="password" class="form-control" placeholder="Mínimo 6 caracteres" required>
                </div>

                <div class="form-group">
                    <label for="password_confirm" class="form-label">Confirmar Contraseña: *</label>
                    <input type="password" id="password_confirm" name="password_confirm" class="form-control" placeholder="Repite la contraseña" required>
                </div>
            </div>

            <div style="background:#f8fafc;padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:1.25rem;font-size:0.8rem;color:var(--text-muted);">
                🔒 <strong>Seguridad Criptográfica:</strong> La contraseña nunca se guarda en texto plano; se encripta automáticamente en el servidor con el algoritmo nativo de PHP <code>password_hash(..., PASSWORD_BCRYPT)</code>.
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;padding:0.85rem;font-size:1rem;">
                ✨ Registrar Cuenta y Encriptar Contraseña
            </button>
        </form>

        <div style="text-align:center;margin-top:1.25rem;font-size:0.9rem;color:var(--text-muted);">
            ¿Ya tienes una cuenta? <a href="login.php" style="color:var(--primary);font-weight:600;text-decoration:none;">Inicia Sesión</a>
        </div>
    </div>
</div>

<script>
function mostrarCamposRol(rolId) {
    const camposAlumno = document.getElementById('campos_alumno');
    if (camposAlumno) {
        if (rolId == '3') { // Alumno
            camposAlumno.style.display = 'block';
        } else {
            camposAlumno.style.display = 'none';
        }
    }
}
</script>

<?php include_once "includes/footer.php"; ?>
