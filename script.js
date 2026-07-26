(function () {
    const AUTH_KEY = 'libraryAuth';
    const USERS_KEY = 'libraryUsers';
    const LOGIN_PAGE = 'login.html';
    const HOME_PAGE = 'index.html';
    const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;
    const MIN_PASSWORD_LENGTH = 6;

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
        } catch (error) {
            return {};
        }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getCurrentUser() {
        try {
            const storedUser = JSON.parse(sessionStorage.getItem(AUTH_KEY));
            if (!storedUser) return null;

            if (storedUser.expiresAt && Date.now() > storedUser.expiresAt) {
                clearCurrentUser();
                return null;
            }

            return storedUser;
        } catch (error) {
            return null;
        }
    }

    function setCurrentUser(username) {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify({
            username,
            expiresAt: Date.now() + SESSION_DURATION_MS
        }));
    }

    function clearCurrentUser() {
        sessionStorage.removeItem(AUTH_KEY);
    }

    function showMessage(element, message, isError) {
        if (!element) return;
        element.textContent = message;
        element.style.color = isError ? '#d32f2f' : '#0b6b2d';
    }

    function generateSalt() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    async function hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        const saltBuffer = encoder.encode(salt);
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 120000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );

        return Array.from(new Uint8Array(derivedBits), (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    function getPageName() {
        return window.location.pathname.split('/').pop().toLowerCase();
    }

    async function initLoginPage() {
        const form = document.getElementById('loginForm');
        const messageElement = document.getElementById('loginMessage');
        if (!form) return;

        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const username = (usernameInput.value || '').trim();
            const password = passwordInput.value || '';
            const action = (event.submitter && event.submitter.value) || 'login';

            if (!username || !password) {
                showMessage(messageElement, 'يجب إدخال اسم المستخدم وكلمة المرور.', true);
                return;
            }

            if (password.length < MIN_PASSWORD_LENGTH) {
                showMessage(messageElement, `كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD_LENGTH} أحرف.`, true);
                return;
            }

            const normalizedUser = username.toLowerCase();
            const users = getUsers();

            if (action === 'signup') {
                if (users[normalizedUser]) {
                    showMessage(messageElement, 'هذا الحساب موجود بالفعل، جرّب اسمًا آخر.', true);
                    return;
                }

                const salt = generateSalt();
                const passwordHash = await hashPassword(password, salt);
                users[normalizedUser] = {
                    passwordHash,
                    salt,
                    createdAt: new Date().toISOString()
                };

                saveUsers(users);
                setCurrentUser(normalizedUser);
                showMessage(messageElement, 'تم إنشاء الحساب بنجاح وتم تسجيل الدخول.', false);
                window.location.href = HOME_PAGE;
                return;
            }

            const account = users[normalizedUser];
            if (!account || !account.passwordHash || !account.salt) {
                showMessage(messageElement, 'اسم المستخدم أو كلمة المرور غير صحيحة.', true);
                return;
            }

            const passwordHash = await hashPassword(password, account.salt);
            if (passwordHash !== account.passwordHash) {
                showMessage(messageElement, 'اسم المستخدم أو كلمة المرور غير صحيحة.', true);
                return;
            }

            setCurrentUser(normalizedUser);
            window.location.href = HOME_PAGE;
        });
    }

    function protectPages() {
        const currentUser = getCurrentUser();
        const pageName = getPageName();
        const isLoginPage = pageName === 'login.html' || pageName === 'login.php';

        if (!currentUser && !isLoginPage) {
            window.location.href = LOGIN_PAGE;
            return;
        }

        if (currentUser && isLoginPage) {
            window.location.href = HOME_PAGE;
            return;
        }

        const logoutLink = document.getElementById('logoutLink');
        const userBadge = document.getElementById('userBadge');

        if (logoutLink) {
            logoutLink.addEventListener('click', function (event) {
                event.preventDefault();
                clearCurrentUser();
                window.location.href = LOGIN_PAGE;
            });
        }

        if (userBadge && currentUser) {
            userBadge.textContent = 'أنت مسجل الدخول باسم: ' + currentUser.username;
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('loginForm')) {
            initLoginPage();
        } else {
            protectPages();
        }
    });
})();
