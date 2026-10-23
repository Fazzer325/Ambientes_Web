// Helper JavaScript para la plataforma EduPlatform Cursos

// Alternar visibilidad de contraseña
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🔒 Ocultar';
    } else {
        input.type = 'password';
        btn.textContent = '👁️ Mostrar';
    }
}

// Alternador de pestañas en paneles de administración
function switchAdminTab(tabId) {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    const tabPanes = document.querySelectorAll('.admin-tab-pane');

    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.style.display = 'block';
        } else {
            pane.style.display = 'none';
        }
    });
}
