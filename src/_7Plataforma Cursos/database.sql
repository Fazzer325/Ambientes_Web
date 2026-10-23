-- ====================================================================
-- SISTEMA DE CURSOS Y AMBIENTES WEB - BASE DE DATOS
-- Diseñada para múltiples tipos de usuario: SuperAdmin, Director, Alumno, Ponente
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `plataforma_cursos` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `plataforma_cursos`;

-- Deshabilitar claves foráneas para recreación segura
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `calificaciones`;
DROP TABLE IF EXISTS `inscripciones`;
DROP TABLE IF EXISTS `materias`;
DROP TABLE IF EXISTS `directores_perfil`;
DROP TABLE IF EXISTS `ponentes_perfil`;
DROP TABLE IF EXISTS `alumnos_perfil`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `roles`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. TABLA: ROLES DE USUARIO
CREATE TABLE `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(50) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NOT NULL,
    `nivel_acceso` INT NOT NULL DEFAULT 1,
    `color_badge` VARCHAR(20) DEFAULT 'primary'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `nivel_acceso`, `color_badge`) VALUES
(1, 'SuperAdmin', 'Administrador total de la plataforma y bases de datos', 100, '#e63946'),
(2, 'Director', 'Director académico con supervisión de planes y docentes', 80, '#457b9d'),
(3, 'Alumno', 'Estudiante inscrito en cursos, consulta calificaciones y materias', 10, '#2a9d8f'),
(4, 'Ponente', 'Docente o expositor responsable de materias y evaluaciones', 50, '#f4a261');

-- 2. TABLA: USUARIOS (Contraseñas con HASH BCRYPT de 60 caracteres)
CREATE TABLE `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL COMMENT 'Hash seguro generado con password_hash BCRYPT',
    `rol_id` INT NOT NULL,
    `telefono` VARCHAR(20) DEFAULT NULL,
    `avatar` VARCHAR(255) DEFAULT 'default_avatar.png',
    `estado` ENUM('Activo', 'Inactivo', 'Pendiente') DEFAULT 'Activo',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuarios de prueba iniciales (Clave predeterminada según rol)
-- SuperAdmin : Admin123*
-- Director   : Director123*
-- Alumno     : Alumno123*
-- Ponente    : Ponente123*
INSERT INTO `usuarios` (`id`, `nombre`, `apellidos`, `email`, `password`, `rol_id`, `telefono`, `estado`) VALUES
(1, 'Carlos', 'Valenzuela Mendoza', 'superadmin@cursos.edu', '$2y$12$5TNUVRP61RjkZ8km4qtFzuMosHSBfLHJ9CsyZvczL.uK12N86mCjW', 1, '443-100-2001', 'Activo'),
(2, 'Dra. Patricia', 'Morales Silva', 'director@cursos.edu', '$2y$12$1s0ykYpx.fESjcOsduunKecraEplZ0gu27mvKICIY2QDUdmHSR5HW', 2, '443-200-3002', 'Activo'),
(3, 'Cristopher Leonardo', 'Ramos Ramírez', 'alumno@cursos.edu', '$2y$12$rc4RiuKvP6yJOzEOzaxr7OPjEWRe8Hk//pWC.sPOfGp0jv9rXIjmS', 3, '443-555-4003', 'Activo'),
(4, 'Ing. Roberto', 'Hernández Castro', 'ponente@cursos.edu', '$2y$12$Ld7Rvwt1W9Fys87gbl/rg.1i8ShzwtNTaZFS/v9MUFL7LN6uh0E1O', 4, '443-777-5004', 'Activo');

-- 3. TABLA: PERFIL EXTENDIDO DEL ALUMNO
CREATE TABLE `alumnos_perfil` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL UNIQUE,
    `matricula` VARCHAR(30) NOT NULL UNIQUE,
    `carrera` VARCHAR(120) NOT NULL,
    `semestre` INT NOT NULL DEFAULT 5,
    `grupo` VARCHAR(10) DEFAULT 'A',
    `promedio_general` DECIMAL(4,2) DEFAULT 9.40,
    CONSTRAINT `fk_alumno_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `alumnos_perfil` (`usuario_id`, `matricula`, `carrera`, `semestre`, `grupo`, `promedio_general`) VALUES
(3, 'ALUM-2024-5089', 'Ingeniería en Tecnologías de la Información', 5, '5to A', 9.45);

-- 4. TABLA: PERFIL DEL PONENTE / DOCENTE
CREATE TABLE `ponentes_perfil` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL UNIQUE,
    `especialidad` VARCHAR(120) NOT NULL,
    `cedula` VARCHAR(50) NOT NULL,
    `biografia` TEXT,
    CONSTRAINT `fk_ponente_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ponentes_perfil` (`usuario_id`, `especialidad`, `cedula`, `biografia`) VALUES
(4, 'Desarrollo Web FullStack & Ciberseguridad', 'CED-PROF-8947231', 'Ingeniero de Software con más de 10 años en arquitectura web distribuida y entornos PHP empresariales.');

-- 5. TABLA: PERFIL DEL DIRECTOR
CREATE TABLE `directores_perfil` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL UNIQUE,
    `departamento` VARCHAR(120) NOT NULL,
    `oficina` VARCHAR(50) NOT NULL,
    CONSTRAINT `fk_director_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `directores_perfil` (`usuario_id`, `departamento`, `oficina`) VALUES
(2, 'División de Ingenierías y Ciencias Computacionales', 'Edificio A - Dirección 201');

-- 6. TABLA: MATERIAS / CURSOS
CREATE TABLE `materias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT,
    `creditos` INT NOT NULL DEFAULT 8,
    `horas_semanales` INT NOT NULL DEFAULT 5,
    `ponente_id` INT DEFAULT NULL,
    `aula` VARCHAR(50) DEFAULT 'Lab Web 3',
    `color` VARCHAR(20) DEFAULT '#3a86ff',
    CONSTRAINT `fk_materia_ponente` FOREIGN KEY (`ponente_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `materias` (`id`, `codigo`, `nombre`, `descripcion`, `creditos`, `horas_semanales`, `ponente_id`, `aula`, `color`) VALUES
(1, 'AW-501', 'Ambientes Web', 'Desarrollo de sistemas dinámicos con PHP, MySQL, autenticación y sesiones.', 8, 5, 4, 'Lab Cómputo 1', '#2563eb'),
(2, 'BDA-502', 'Bases de Datos Avanzadas', 'Optimización, procedimientos almacenados, normalización e integridad referencial.', 8, 5, 4, 'Lab Cómputo 2', '#059669'),
(3, 'CRIP-503', 'Ciberseguridad y Encriptación', 'Criptografía, hashing seguro BCRYPT, salting y seguridad en aplicaciones web.', 6, 4, 4, 'Aula 204', '#7c3aed'),
(4, 'IA-504', 'Inteligencia Artificial', 'Modelos predictivos, redes neuronales y automatización inteligente.', 8, 5, 4, 'Lab Robótica', '#db2777'),
(5, 'ASW-505', 'Arquitectura de Software', 'Patrones de diseño MVC, microservicios y escalabilidad de sistemas empresariales.', 6, 4, 4, 'Aula 205', '#d97706');

-- 7. TABLA: INSCRIPCIONES
CREATE TABLE `inscripciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `alumno_id` INT NOT NULL,
    `materia_id` INT NOT NULL,
    `periodo` VARCHAR(30) NOT NULL DEFAULT '2026-2',
    `fecha_inscripcion` DATE NOT NULL,
    CONSTRAINT `fk_inscrip_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_inscrip_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_alumno_materia_periodo` (`alumno_id`, `materia_id`, `periodo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `inscripciones` (`id`, `alumno_id`, `materia_id`, `periodo`, `fecha_inscripcion`) VALUES
(1, 3, 1, '2026-2', '2026-08-15'),
(2, 3, 2, '2026-2', '2026-08-15'),
(3, 3, 3, '2026-2', '2026-08-15'),
(4, 3, 4, '2026-2', '2026-08-15'),
(5, 3, 5, '2026-2', '2026-08-15');

-- 8. TABLA: CALIFICACIONES DETALLADAS
CREATE TABLE `calificaciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `inscripcion_id` INT NOT NULL UNIQUE,
    `alumno_id` INT NOT NULL,
    `materia_id` INT NOT NULL,
    `parcial_1` DECIMAL(4,2) DEFAULT NULL,
    `parcial_2` DECIMAL(4,2) DEFAULT NULL,
    `parcial_3` DECIMAL(4,2) DEFAULT NULL,
    `calificacion_final` DECIMAL(4,2) DEFAULT NULL,
    `estatus` ENUM('Aprobado', 'Reprobado', 'En Curso') DEFAULT 'En Curso',
    `observaciones` VARCHAR(255) DEFAULT 'Desempeño destacado',
    CONSTRAINT `fk_calif_inscripcion` FOREIGN KEY (`inscripcion_id`) REFERENCES `inscripciones` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_calif_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_calif_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `calificaciones` (`inscripcion_id`, `alumno_id`, `materia_id`, `parcial_1`, `parcial_2`, `parcial_3`, `calificacion_final`, `estatus`, `observaciones`) VALUES
(1, 3, 1, 9.80, 9.50, 9.90, 9.73, 'Aprobado', 'Excelente dominio de PHP, arquitectura modular y MySQL.'),
(2, 3, 2, 9.50, 9.20, 9.60, 9.43, 'Aprobado', 'Diseño de esquemas y normalización sobresaliente.'),
(3, 3, 3, 10.00, 9.70, 9.80, 9.83, 'Aprobado', 'Comprensión impecable de hashing BCRYPT y sesiones seguras.'),
(4, 3, 4, 9.00, 9.10, 8.90, 9.00, 'Aprobado', 'Buen progreso en modelos de inferencia.'),
(5, 3, 5, 9.30, 9.40, 9.20, 9.30, 'Aprobado', 'Gran aplicación de patrones de diseño de software.');
