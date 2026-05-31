document.addEventListener('DOMContentLoaded', () => {
    const authKey = 'planogram_logged_in';
    const loginError = document.getElementById('login-error');
    
    // Redirect if already logged in
    if (localStorage.getItem(authKey) === 'true') {
        window.location.href = 'stores.html';
        return;
    }

    const checkLogin = () => {
        const user = document.getElementById('login-username').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value.trim();
        
        if (loginError) loginError.style.display = 'none';

        const validUser = user === 'admin';
        const validPass = pass.toLowerCase() === 'admin123';

        if (validUser && validPass) {
            localStorage.setItem(authKey, 'true');
            window.location.href = 'stores.html';
        } else {
            if (loginError) loginError.style.display = 'block';
        }
    };

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', checkLogin);
    }

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    [usernameInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    checkLogin();
                }
            });
        }
    });
});
