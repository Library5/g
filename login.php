<?php
session_start();

$usersFile = __DIR__ . '/users.json';
if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode(new stdClass()));
}

$users = json_decode(file_get_contents($usersFile), true);
if (!is_array($users)) {
    $users = [];
}

$message = '';

function saveUsers(array $users, string $path): void
{
    file_put_contents($path, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($action === 'signup') {
        if ($username === '' || $password === '') {
            $message = 'ارجو تعبئة اسم المستخدم وكلمة السر.';
        } elseif (isset($users[$username])) {
            $message = 'المستخدم موجود بالفعل. اختر اسمًا آخر.';
        } else {
            $users[$username] = password_hash($password, PASSWORD_DEFAULT);
            saveUsers($users, $usersFile);
            $message = 'تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.';
        }
    } elseif ($action === 'login') {
        if ($username === '' || $password === '') {
            $message = 'ادخل اسم المستخدم وكلمة السر.';
        } elseif (!isset($users[$username]) || !password_verify($password, $users[$username])) {
            $message = 'اسم المستخدم أو كلمة السر غير صحيحة.';
        } else {
            $_SESSION['username'] = $username;
            header('Location: ' . $_SERVER['PHP_SELF']);
            exit;
        }
    } elseif ($action === 'logout') {
        session_destroy();
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }
}

$loggedIn = isset($_SESSION['username']);
?>
<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <title>نظام الدخول</title>
    <style>
        body { font-family: Tahoma, Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
        .container { max-width: 420px; margin: 60px auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 0 14px rgba(0,0,0,0.08); }
        h1 { margin-top: 0; font-size: 24px; text-align: center; }
        .message { margin-bottom: 16px; color: #d32f2f; }
        form { display: grid; gap: 12px; }
        label { display: block; font-weight: bold; margin-bottom: 4px; }
        input[type="text"], input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
        button { padding: 12px; border: none; border-radius: 8px; background: #1976d2; color: #fff; cursor: pointer; font-size: 16px; }
        button:hover { background: #115293; }
        .actions { display: flex; justify-content: space-between; gap: 10px; }
        .logout { text-align: center; margin-top: 16px; }
        .logout button { width: 100%; background: #d32f2f; }
    </style>
</head>
<body>
<div class="container">
    <h1>نظام تسجيل الدخول</h1>
    <?php if ($message !== ''): ?>
        <div class="message"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endif; ?>

    <?php if ($loggedIn): ?>
        <p>أهلاً بك، <?= htmlspecialchars($_SESSION['username'], ENT_QUOTES, 'UTF-8') ?>.</p>
        <form method="post">
            <input type="hidden" name="action" value="logout">
            <button type="submit">تسجيل الخروج</button>
        </form>
    <?php else: ?>
        <form method="post">
            <label for="username">اسم المستخدم</label>
            <input type="text" id="username" name="username" autocomplete="username">
            <label for="password">كلمة السر</label>
            <input type="password" id="password" name="password" autocomplete="current-password">
            <div class="actions">
                <button type="submit" name="action" value="login">تسجيل الدخول</button>
                <button type="submit" name="action" value="signup">إنشاء حساب</button>
            </div>
        </form>
    <?php endif; ?>
</div>
</body>
</html>