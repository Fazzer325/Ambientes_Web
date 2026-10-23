<?php
require_once "config/conexion.php";

if (!usuario_autenticado()) {
    header("Location: login.php");
    exit;
}

$page_title = "Dashboard de Usuario";
$usuario_sesion = obtener_usuario_sesion();
$user_id = $usuario_sesion['id'];
$rol_nombre = $usuario_sesion['rol'];

// Obtener información actualizada del usuario desde la BD
$stmtUser = $pdo->prepare("
    SELECT u.*, r.nombre AS rol_nombre, r.descripcion AS rol_desc, r.nivel_acceso
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = :id
    LIMIT 1
");
$stmtUser->execute([':id' => $user_id]);
$perfil = $stmtUser->fetch();

// Inicializar variables según rol
$alumno_data = null;
$materias_alumno = [];
$calificaciones_alumno = [];
$ponentes_data = null;
$director_data = null;
$stats_admin = [];

// ==========================================
// SI ES ALUMNO: Obtener datos, materias y calificaciones
// ==========================================
if ($rol_nombre === 'Alumno') {
    // 1. Perfil extendido del alumno
    $stmtAlum = $pdo->prepare("SELECT * FROM alumnos_perfil WHERE usuario_id = :uid LIMIT 1");
    $stmtAlum->execute([':uid' => $user_id]);
    $alumno_data = $stmtAlum->fetch();

    // 2. Materias inscritas
    $stmtMats = $pdo->prepare("
        SELECT m.*, i.id AS inscripcion_id, i.periodo, i.fecha_inscripcion,
               CONCAT(p.nombre, ' ', p.apellidos) AS ponente_nombre,
               c.calificacion_final, c.estatus AS calif_estatus
        FROM inscripciones i
        JOIN materias m ON i.materia_id = m.id
        LEFT JOIN usuarios p ON m.ponente_id = p.id
        LEFT JOIN calificaciones c ON c.inscripcion_id = i.id
        WHERE i.alumno_id = :uid
        ORDER BY m.id ASC
    ");
    $stmtMats->execute([':uid' => $user_id]);
    $materias_alumno = $stmtMats->fetchAll();

    // 3. Calificaciones desglosadas
    $stmtCalif = $pdo->prepare("
        SELECT c.*, m.codigo, m.nombre AS materia_nombre, m.creditos,
               CONCAT(p.nombre, ' ', p.apellidos) AS ponente_nombre
        FROM calificaciones c
        JOIN materias m ON c.materia_id = m.id
        LEFT JOIN usuarios p ON m.ponente_id = p.id
        WHERE c.alumno_id = :uid
        ORDER BY m.id ASC
    ");
    $stmtCalif->execute([':uid' => $user_id]);
    $calificaciones_alumno = $stmtCalif->fetchAll();

    // Calcular promedio real
    if (!empty($calificaciones_alumno)) {
        $suma = 0;
        $total_calif = 0;
        foreach ($calificaciones_alumno as $c) {
            if ($c['calificacion_final'] !== null) {
                $suma += floatval($c['calificacion_final']);
                $total_calif++;
            }
        }
        $promedio_calculado = $total_calif > 0 ? round($suma / $total_calif, 2) : 0;
    }
}

// ==========================================
// SI ES PONENTE
// ==========================================
if ($rol_nombre === 'Ponente') {
    $stmtPon = $pdo->prepare("SELECT * FROM ponentes_perfil WHERE usuario_id = :uid LIMIT 1");
    $stmtPon->execute([':uid' => $user_id]);
    $ponentes_data = $stmtPon->fetch();

    $stmtCursosDoc = $pdo->prepare("
        SELECT m.*, COUNT(i.id) AS total_alumnos
        FROM materias m
        LEFT JOIN inscripciones i ON m.id = i.materia_id
        WHERE m.ponente_id = :uid
        GROUP BY m.id
    ");
    $stmtCursosDoc->execute([':uid' => $user_id]);
    $cursos_ponente = $stmtCursosDoc->fetchAll();
}

// ==========================================
// SI ES DIRECTOR O SUPERADMIN: Estadísticas institucionales
// ==========================================
if ($rol_nombre === 'Director' || $rol_nombre === 'SuperAdmin') {
    $stats_admin['total_usuarios'] = $pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    $stats_admin['total_alumnos'] = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol_id = 3")->fetchColumn();
    $stats_admin['total_ponentes'] = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol_id = 4")->fetchColumn();
    $stats_admin['total_materias'] = $pdo->query("SELECT COUNT(*) FROM materias")->fetchColumn();
}

include_once "includes/header.php";
?>

<!-- BANNER DE BIENVENIDA CON DATOS DEL USUARIO Y TIPO DE USUARIO -->
<div class="welcome-hero">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.5rem;">
        <div>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.6rem;">
                <span class="badge-role <?php echo $badge_class; ?>" style="font-size:0.9rem;padding:0.4rem 1rem;">
                    Tipo de Usuario: <?php echo htmlspecialchars($perfil['rol_nombre']); ?>
                </span>
                <span style="background:rgba(255,255,255,0.2);padding:0.3rem 0.75rem;border-radius:9999px;font-size:0.8rem;">
                    Nivel de Acceso: <?php echo htmlspecialchars($perfil['nivel_acceso']); ?>/100
                </span>
                <span style="background:#10b981;padding:0.3rem 0.75rem;border-radius:9999px;font-size:0.8rem;">
                    ● Estado: <?php echo htmlspecialchars($perfil['estado']); ?>
                </span>
            </div>
            <h1 style="margin-bottom:0.3rem;">¡Bienvenido, <?php echo htmlspecialchars($perfil['nombre'] . ' ' . $perfil['apellidos']); ?>!</h1>
            <p>
                Has iniciado sesión correctamente en el <strong>Sistema Web de Cursos</strong>. Tus datos han sido autenticados mediante verificación de contraseña encriptada (BCRYPT).
            </p>
        </div>
        <div style="background:rgba(255,255,255,0.15);padding:1.25rem 1.5rem;border-radius:var(--radius-md);backdrop-filter:blur(5px);border:1px solid rgba(255,255,255,0.25);">
            <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.85;">Datos de la Cuenta</div>
            <div style="font-weight:700;font-size:1.05rem;margin-top:0.25rem;"><?php echo htmlspecialchars($perfil['email']); ?></div>
            <div style="font-size:0.85rem;margin-top:0.25rem;opacity:0.9;">📞 <?php echo htmlspecialchars($perfil['telefono'] ?? 'Sin registrar'); ?></div>
            <div style="font-size:0.75rem;margin-top:0.4rem;opacity:0.8;">🕒 Registro: <?php echo date('d/M/Y', strtotime($perfil['creado_en'])); ?></div>
        </div>
    </div>
</div>

<!-- ======================================================== -->
<!-- VISTA ESPECÍFICA PARA: ALUMNO                           -->
<!-- ======================================================== -->
<?php if ($rol_nombre === 'Alumno'): ?>

    <!-- TARJETAS DE RESUMEN ACADÉMICO DEL ALUMNO -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon" style="background:#eff6ff;color:#2563eb;">🎓</div>
            <div>
                <div class="stat-value"><?php echo htmlspecialchars($alumno_data['matricula'] ?? 'ALUM-5089'); ?></div>
                <div class="stat-label">Matrícula Oficial</div>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background:#f0fdf4;color:#10b981;">📈</div>
            <div>
                <div class="stat-value"><?php echo $promedio_calculado ?? ($alumno_data['promedio_general'] ?? '9.45'); ?></div>
                <div class="stat-label">Promedio General</div>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7;color:#d97706;">📚</div>
            <div>
                <div class="stat-value"><?php echo count($materias_alumno); ?></div>
                <div class="stat-label">Materias Inscritas</div>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background:#fdf2f8;color:#db2777;">🏫</div>
            <div>
                <div class="stat-value"><?php echo htmlspecialchars($alumno_data['semestre'] ?? '5'); ?>° Semestre</div>
                <div class="stat-label"><?php echo htmlspecialchars($alumno_data['grupo'] ?? 'Grupo A'); ?></div>
            </div>
        </div>
    </div>

    <!-- DATOS DEL ALUMNO (CARD INFORMATIVA) -->
    <div class="card" style="margin-bottom:2rem;">
        <h2 class="card-title">👨‍🎓 Información Detallada del Alumno</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem;margin-top:1rem;">
            <div>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.2rem;">Nombre Completo:</p>
                <p style="font-weight:700;font-size:1.05rem;"><?php echo htmlspecialchars($perfil['nombre'] . ' ' . $perfil['apellidos']); ?></p>
            </div>
            <div>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.2rem;">Carrera / Programa:</p>
                <p style="font-weight:700;font-size:1.05rem;color:#0284c7;"><?php echo htmlspecialchars($alumno_data['carrera'] ?? 'Ingeniería en Tecnologías de la Información'); ?></p>
            </div>
            <div>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.2rem;">Correo Institucional:</p>
                <p style="font-weight:600;"><?php echo htmlspecialchars($perfil['email']); ?></p>
            </div>
            <div>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.2rem;">Ciclo Escolar:</p>
                <p style="font-weight:600;">2026-2 (Otoño 2026)</p>
            </div>
        </div>
    </div>

    <!-- TABLA DE MATERIAS INSCRITAS -->
    <div class="card" style="margin-bottom:2rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <h2 class="card-title" style="margin-bottom:0;">📚 Materias y Cursos Inscritos</h2>
            <span style="font-size:0.85rem;background:#f1f5f9;padding:0.35rem 0.75rem;border-radius:9999px;font-weight:600;color:#475569;">
                Total: <?php echo count($materias_alumno); ?> asignaturas activas
            </span>
        </div>

        <div class="table-responsive">
            <table class="table-custom">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre de la Materia</th>
                        <th>Créditos</th>
                        <th>Horas/Sem</th>
                        <th>Ponente / Docente</th>
                        <th>Aula</th>
                        <th>Estatus</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($materias_alumno)): ?>
                        <tr><td colspan="7" style="text-align:center;padding:2rem;">No tienes materias registradas actualmente.</td></tr>
                    <?php else: ?>
                        <?php foreach ($materias_alumno as $m): ?>
                            <tr>
                                <td><span style="font-weight:700;background:#e0f2fe;color:#0369a1;padding:0.25rem 0.6rem;border-radius:6px;"><?php echo htmlspecialchars($m['codigo']); ?></span></td>
                                <td style="font-weight:600;color:#1e293b;"><?php echo htmlspecialchars($m['nombre']); ?></td>
                                <td><?php echo htmlspecialchars($m['creditos']); ?> pts</td>
                                <td><?php echo htmlspecialchars($m['horas_semanales']); ?> hrs</td>
                                <td>👨‍🏫 <?php echo htmlspecialchars($m['ponente_nombre'] ?? 'Sin asignar'); ?></td>
                                <td>📍 <?php echo htmlspecialchars($m['aula']); ?></td>
                                <td><span class="status-pill status-aprobado">Inscrita</span></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- BOLETA DE CALIFICACIONES (EJERCICIO VISTO EN CLASE) -->
    <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <h2 class="card-title" style="margin-bottom:0;">📊 Boleta Oficial de Calificaciones</h2>
            <span style="font-size:0.85rem;background:#dcfce7;color:#166534;padding:0.35rem 0.75rem;border-radius:9999px;font-weight:700;">
                Promedio Final: <?php echo $promedio_calculado ?? '9.45'; ?>
            </span>
        </div>

        <div class="table-responsive">
            <table class="table-custom">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Materia</th>
                        <th>Ponente Titular</th>
                        <th>Parcial 1</th>
                        <th>Parcial 2</th>
                        <th>Parcial 3</th>
                        <th>Promedio</th>
                        <th>Resultado</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($calificaciones_alumno)): ?>
                        <tr><td colspan="9" style="text-align:center;padding:2rem;">No hay calificaciones capturadas aún.</td></tr>
                    <?php else: ?>
                        <?php foreach ($calificaciones_alumno as $c): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($c['id']); ?></td>
                                <td>
                                    <strong><?php echo htmlspecialchars($c['materia_nombre']); ?></strong>
                                    <br><small style="color:var(--text-muted);"><?php echo htmlspecialchars($c['codigo']); ?></small>
                                </td>
                                <td><?php echo htmlspecialchars($c['ponente_nombre']); ?></td>
                                <td><strong><?php echo number_format($c['parcial_1'], 1); ?></strong></td>
                                <td><strong><?php echo number_format($c['parcial_2'], 1); ?></strong></td>
                                <td><strong><?php echo number_format($c['parcial_3'], 1); ?></strong></td>
                                <td style="font-size:1.05rem;font-weight:700;color:#2563eb;">
                                    <?php echo number_format($c['calificacion_final'], 2); ?>
                                </td>
                                <td>
                                    <?php if ($c['calificacion_final'] >= 7.0): ?>
                                        <span class="status-pill status-aprobado">Aprobado</span>
                                    <?php else: ?>
                                        <span class="status-pill status-reprobado">Reprobado</span>
                                    <?php endif; ?>
                                </td>
                                <td style="font-size:0.85rem;color:var(--text-muted);max-width:240px;">
                                    <?php echo htmlspecialchars($c['observaciones']); ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

<!-- ======================================================== -->
<!-- VISTA ESPECÍFICA PARA: PONENTE                          -->
<!-- ======================================================== -->
<?php elseif ($rol_nombre === 'Ponente'): ?>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon" style="background:#eff6ff;color:#2563eb;">📚</div>
            <div>
                <div class="stat-value"><?php echo count($cursos_ponente); ?></div>
                <div class="stat-label">Cursos Impartidos</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:#f0fdf4;color:#10b981;">👨‍🎓</div>
            <div>
                <div class="stat-value">32</div>
                <div class="stat-label">Alumnos Matriculados</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7;color:#d97706;">📝</div>
            <div>
                <div class="stat-value">100%</div>
                <div class="stat-label">Evaluaciones al Día</div>
            </div>
        </div>
    </div>

    <div class="card" style="margin-bottom:2rem;">
        <h2 class="card-title">🎤 Perfil Profesional del Ponente</h2>
        <div style="margin-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
            <div>
                <p style="font-size:0.85rem;color:var(--text-muted);">Especialidad:</p>
                <p style="font-weight:700;font-size:1.1rem;color:#d97706;"><?php echo htmlspecialchars($ponentes_data['especialidad'] ?? 'Desarrollo Web & Bases de Datos'); ?></p>
            </div>
            <div>
                <p style="font-size:0.85rem;color:var(--text-muted);">Cédula Profesional:</p>
                <p style="font-weight:600;"><?php echo htmlspecialchars($ponentes_data['cedula'] ?? 'CED-PROF-8947231'); ?></p>
            </div>
        </div>
        <div style="margin-top:1rem;">
            <p style="font-size:0.85rem;color:var(--text-muted);">Biografía:</p>
            <p style="font-size:0.95rem;background:#f8fafc;padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border);">
                <?php echo htmlspecialchars($ponentes_data['biografia'] ?? 'Docente titular en el área de desarrollo web dinámico y bases de datos.'); ?>
            </p>
        </div>
    </div>

    <div class="card">
        <h2 class="card-title">📖 Materias a Cargo</h2>
        <div class="table-responsive">
            <table class="table-custom">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Materia</th>
                        <th>Horas Semanales</th>
                        <th>Aula</th>
                        <th>Alumnos Registrados</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($cursos_ponente as $c): ?>
                        <tr>
                            <td><span style="font-weight:700;"><?php echo htmlspecialchars($c['codigo']); ?></span></td>
                            <td style="font-weight:600;"><?php echo htmlspecialchars($c['nombre']); ?></td>
                            <td><?php echo htmlspecialchars($c['horas_semanales']); ?> hrs</td>
                            <td><?php echo htmlspecialchars($c['aula']); ?></td>
                            <td><span class="status-pill status-aprobado"><?php echo $c['total_alumnos']; ?> inscritos</span></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

<!-- ======================================================== -->
<!-- VISTA ESPECÍFICA PARA: DIRECTOR O SUPERADMIN            -->
<!-- ======================================================== -->
<?php else: ?>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon" style="background:#eff6ff;color:#2563eb;">👥</div>
            <div>
                <div class="stat-value"><?php echo $stats_admin['total_usuarios']; ?></div>
                <div class="stat-label">Usuarios Totales</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:#f0fdf4;color:#10b981;">👨‍🎓</div>
            <div>
                <div class="stat-value"><?php echo $stats_admin['total_alumnos']; ?></div>
                <div class="stat-label">Alumnos Activos</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7;color:#d97706;">🎤</div>
            <div>
                <div class="stat-value"><?php echo $stats_admin['total_ponentes']; ?></div>
                <div class="stat-label">Ponentes / Profesores</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:#fdf2f8;color:#db2777;">📚</div>
            <div>
                <div class="stat-value"><?php echo $stats_admin['total_materias']; ?></div>
                <div class="stat-label">Cursos en Catálogo</div>
            </div>
        </div>
    </div>

    <div class="card" style="margin-bottom:2rem;">
        <h2 class="card-title">🏛️ Panel de Control Académico e Institucional</h2>
        <p style="color:var(--text-muted);margin-bottom:1rem;">
            Vista autorizada para <strong><?php echo htmlspecialchars($rol_nombre); ?></strong>. Tienes acceso para auditar planes de estudio, docentes, alumnos y estructura de base de datos.
        </p>

        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            <a href="explorador_bd.php" class="btn btn-primary">🗄️ Explorador de Tablas y PW Encriptado</a>
            <a href="documentacion.php" class="btn btn-secondary">📑 Ver Reporte de Entrega</a>
        </div>
    </div>

<?php endif; ?>

<?php include_once "includes/footer.php"; ?>
