// ==========================================
// AUTENTICACIÓN CON SUPABASE AUTH
// ==========================================
// Reemplaza el viejo sistema de usuarios en localStorage.
// Usa supabaseClient.auth (signUp, signInWithPassword, signOut,
// getSession, onAuthStateChange) definido en js/supabaseClient.js.
//
// El registro público tiene "Confirm email" activado en Supabase,
// así que después de signUp() el usuario NO queda logueado hasta
// que confirma el email desde el link que le llega por correo.

(function () {
  // Sesión actual en memoria (se mantiene sincronizada por onAuthStateChange)
  let currentSession = null;
  // Evita que se dispare initApp() más de una vez por sesión
  let appInitialized = false;
  let recoveryMode = false;

  // ------------------------------------------
  // Helpers de UI (auth screen <-> app shell)
  // ------------------------------------------

  function setBodyMode(mode) {
    document.body.classList.toggle('auth-mode', mode === 'auth');
    document.body.classList.toggle('app-mode', mode === 'app');
    document.documentElement.classList.toggle('auth-mode', mode === 'auth');
    document.documentElement.classList.toggle('app-mode', mode === 'app');

    document.body.style.overflow = mode === 'auth' ? 'hidden' : 'auto';
    document.body.style.overflowY = mode === 'auth' ? 'hidden' : 'auto';
    document.documentElement.style.overflow = mode === 'auth' ? 'hidden' : 'auto';
    document.documentElement.style.overflowY = mode === 'auth' ? 'hidden' : 'auto';
  }

  function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const appShell = document.getElementById('app-shell');

    setBodyMode('auth');
    if (authScreen) authScreen.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
  }

  function showAppShell(session) {
    const authScreen = document.getElementById('auth-screen');
    const appShell = document.getElementById('app-shell');
    const userLabel = document.getElementById('hdr-user');

    setBodyMode('app');
    if (authScreen) authScreen.style.display = 'none';
    if (appShell) appShell.style.display = 'flex';

    if (userLabel && session && session.user) {
      const nombre = session.user.user_metadata && session.user.user_metadata.full_name
        ? session.user.user_metadata.full_name
        : session.user.email;
      userLabel.textContent = `Hola, ${nombre}`;
    }
  }

  function clearLoginError() {
    const error = document.getElementById('login-error');
    const regError = document.getElementById('register-error');
    const forgotError = document.getElementById('forgot-error');
    const resetError = document.getElementById('reset-error');
    if (error) {
      error.textContent = '';
      error.style.color = '';
    }
    if (regError) {
      regError.textContent = '';
      regError.style.color = '';
    }
    if (forgotError) forgotError.textContent = '';
    if (resetError) resetError.textContent = '';
  }

  function setLoginError(message) {
    const error = document.getElementById('login-error');
    if (error) {
      error.style.color = '';
      error.textContent = message;
    }
  }

  function setRegisterError(message) {
    const error = document.getElementById('register-error');
    if (error) {
      error.style.color = '';
      error.textContent = message;
    }
  }

  function setForgotError(message) {
    const error = document.getElementById('forgot-error');
    if (error) error.textContent = message;
  }

  function setResetError(message) {
    const error = document.getElementById('reset-error');
    if (error) error.textContent = message;
  }

  // Mensaje informativo (no de error) en verde, reutilizando los mismos divs
  function setLoginInfo(message) {
    const error = document.getElementById('login-error');
    if (error) {
      error.style.color = 'var(--green-dark)';
      error.textContent = message;
    }
  }

  function setRegisterInfo(message) {
    const error = document.getElementById('register-error');
    if (error) {
      error.style.color = 'var(--green-dark)';
      error.textContent = message;
    }
  }

  function setButtonLoading(btn, loading, textoNormal) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Un momento...' : textoNormal;
  }

  window.togglePassword = function (id, button) {
    const input = document.getElementById(id);
    if (!input || !button) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.textContent = visible ? '◉' : '◌';
    button.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    button.title = visible ? 'Mostrar contraseña' : 'Ocultar contraseña';
  };

  // Traduce los mensajes de error más comunes de Supabase Auth al español
  function traducirError(mensaje) {
    const m = String(mensaje || '').toLowerCase();
    if (m.includes('email not confirmed')) {
      return 'Todavía no confirmaste tu email. Revisá tu casilla de correo (y la carpeta de spam) y tocá el link de confirmación antes de ingresar.';
    }
    if (m.includes('invalid login credentials')) {
      return 'Email o contraseña incorrectos.';
    }
    if (m.includes('user already registered') || m.includes('already registered')) {
      return 'Ese email ya tiene una cuenta creada. Iniciá sesión en su lugar.';
    }
    if (m.includes('password should be at least')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (m.includes('unable to validate email address') || m.includes('invalid email')) {
      return 'Ese email no es válido.';
    }
    if (m.includes('rate limit') || m.includes('for security purposes')) {
      return 'Demasiados intentos. Esperá un momento antes de volver a intentar.';
    }
    return mensaje || 'Ocurrió un error inesperado. Probá de nuevo.';
  }

  function tokenEmitidoEnElFuturo(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Number(payload.iat) > Math.floor(Date.now() / 1000) + 60;
    } catch (e) {
      return true;
    }
  }

  async function iniciarConSesion(session) {
    if (!session || tokenEmitidoEnElFuturo(session.access_token)) {
      await supabaseClient.auth.signOut({ scope: 'local' });
      currentSession = null;
      appInitialized = false;
      showAuthScreen();
      setLoginError('La sesión no es válida. Verificá la fecha y hora del dispositivo e iniciá sesión nuevamente.');
      return false;
    }

    // getSession() ya se encarga de renovar la sesión cuando el refresh
    // token sigue siendo válido. Evitamos refreshSession() acá para no
    // disparar renovaciones duplicadas durante SIGNED_IN.
    currentSession = session;
    showAppShell(currentSession);
    await arrancarApp();
    return true;
  }

  // ------------------------------------------
  // Arranque: sesión existente + listener de cambios de auth
  // ------------------------------------------

  async function initializeAuth() {
    clearLoginError();
    showAuthScreen();

    const recoveryLink = window.location.hash.includes('type=recovery');

    // Registrar el listener antes de consultar la sesión para interceptar
    // el enlace de recuperación y no arrancar la aplicación normal.
    supabaseClient.auth.onAuthStateChange((event, session) => {
      currentSession = session;

      if (event === 'PASSWORD_RECOVERY' && session) {
        recoveryMode = true;
        showAuthScreen();
        window.showAuthTab('reset');
        return;
      }

      if (event === 'SIGNED_IN' && session && !recoveryMode) {
        clearLoginError();
        iniciarConSesion(session).catch((e) => {
          console.error('Error iniciando la aplicación:', e);
          appInitialized = false;
          showAuthScreen();
          setLoginError('No se pudo cargar la aplicación. Intentá iniciar sesión nuevamente.');
        });
      }

      if (event === 'SIGNED_OUT') {
        appInitialized = false;
        if (!recoveryMode) showAuthScreen();
      }
    });

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error('Error obteniendo la sesión:', error.message);
      await supabaseClient.auth.signOut({ scope: 'local' });
      currentSession = null;
      appInitialized = false;
      showAuthScreen();
      setLoginError('Tu sesión venció. Iniciá sesión nuevamente.');
      return;
    }

    if (data && data.session && recoveryLink) {
      recoveryMode = true;
      currentSession = data.session;
      showAuthScreen();
      window.showAuthTab('reset');
      return;
    }

    if (data && data.session) {
      try {
        await iniciarConSesion(data.session);
      } catch (e) {
        console.error('Error iniciando la aplicación:', e);
        appInitialized = false;
        await supabaseClient.auth.signOut({ scope: 'local' });
        showAuthScreen();
        setLoginError('No se pudo validar la sesión. Iniciá sesión nuevamente.');
      }
    }

  }

  async function arrancarApp() {
    if (appInitialized) return;
    appInitialized = true;
    if (typeof window.initApp === 'function') {
      // initApp() ahora es async: carga pacientes/turnos/config desde
      // Supabase antes de pintar la app.
      await window.initApp();
    }
  }

  // ------------------------------------------
  // Tabs (login / crear cuenta)
  // ------------------------------------------

  window.showAuthTab = function (mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-form');
    const authCard = document.querySelector('.auth-card');
    const forgotCard = document.getElementById('forgot-card');
    const resetCard = document.getElementById('reset-card');
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');

    if (!loginForm || !registerForm || !forgotForm || !resetForm || !authCard || !forgotCard || !resetCard || !loginTab || !registerTab) return;

    const isLogin = mode === 'login';
    loginForm.classList.toggle('hidden-form', !isLogin);
    registerForm.classList.toggle('hidden-form', isLogin);
    forgotForm.classList.toggle('hidden-form', mode !== 'forgot');
    resetForm.classList.toggle('hidden-form', mode !== 'reset');
    authCard.classList.toggle('hidden-form', mode === 'forgot' || mode === 'reset');
    forgotCard.classList.toggle('hidden-form', mode !== 'forgot');
    resetCard.classList.toggle('hidden-form', mode !== 'reset');
    loginTab.classList.toggle('active', isLogin);
    registerTab.classList.toggle('active', !isLogin);
    clearLoginError();
  };

  window.sendPasswordReset = async function () {
    const email = String(document.getElementById('forgot-user')?.value || '').trim().toLowerCase();
    const btn = document.querySelector('#forgot-form button[type="submit"]');
    clearLoginError();
    if (!email) {
      setForgotError('Ingresá el email de tu cuenta.');
      return;
    }

    setButtonLoading(btn, true, 'Enviar enlace');
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    setButtonLoading(btn, false, 'Enviar enlace');

    if (error) {
      setForgotError(traducirError(error.message));
      return;
    }

    window.showAuthTab('login');
    setLoginInfo('Si el email está registrado, recibirás un enlace para crear una nueva contraseña.');
  };

  window.updatePassword = async function () {
    const password = String(document.getElementById('reset-pass')?.value || '');
    const confirmation = String(document.getElementById('reset-pass-confirm')?.value || '');
    const btn = document.querySelector('#reset-form button[type="submit"]');

    clearLoginError();
    if (password.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }

    setButtonLoading(btn, true, 'Guardar nueva contraseña');
    const { error } = await supabaseClient.auth.updateUser({ password });
    setButtonLoading(btn, false, 'Guardar nueva contraseña');

    if (error) {
      setResetError(traducirError(error.message));
      return;
    }

    recoveryMode = false;
    await supabaseClient.auth.signOut({ scope: 'local' });
    document.getElementById('reset-form')?.reset();
    window.showAuthTab('login');
    setLoginInfo('Contraseña actualizada. Ya podés iniciar sesión.');
  };

  // ------------------------------------------
  // Login
  // ------------------------------------------

  window.login = async function () {
    const email = String(document.getElementById('login-user')?.value || '').trim().toLowerCase();
    const password = String(document.getElementById('login-pass')?.value || '');
    const btn = document.querySelector('#login-form button[type="submit"]');

    clearLoginError();

    if (!email || !password) {
      setLoginError('Completá email y contraseña.');
      return;
    }

    setButtonLoading(btn, true, 'Ingresar');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    setButtonLoading(btn, false, 'Ingresar');

    if (error) {
      setLoginError(traducirError(error.message));
      return;
    }

    // Si el login fue exitoso, onAuthStateChange (evento SIGNED_IN)
    // se encarga de mostrar la app. No hace falta duplicar lógica acá.
    currentSession = data.session;
  };

  // ------------------------------------------
  // Registro
  // ------------------------------------------

  window.register = async function () {
    const name = String(document.getElementById('register-name')?.value || '').trim();
    const email = String(document.getElementById('register-user')?.value || '').trim().toLowerCase();
    const password = String(document.getElementById('register-pass')?.value || '');
    const btn = document.querySelector('#register-form button[type="submit"]');

    clearLoginError();

    if (!name || !email || !password) {
      setRegisterError('Completá todos los campos para crear tu cuenta.');
      return;
    }

    if (password.length < 6) {
      setRegisterError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setButtonLoading(btn, true, 'Crear cuenta');

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    setButtonLoading(btn, false, 'Crear cuenta');

    if (error) {
      setRegisterError(traducirError(error.message));
      return;
    }

    // Supabase, para no filtrar qué emails ya existen, responde OK
    // (sin error) incluso si el email ya está registrado, pero en ese
    // caso el usuario devuelto no tiene "identities" nuevas.
    const emailYaRegistrado = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if (emailYaRegistrado) {
      setRegisterError('Ese email ya tiene una cuenta creada. Iniciá sesión en su lugar.');
      return;
    }

    // Con "Confirm email" activado, signUp NO devuelve sesión: hay que
    // confirmar el email antes de poder ingresar.
    if (!data.session) {
      const registerForm = document.getElementById('register-form');
      if (registerForm) registerForm.reset();
      window.showAuthTab('login');
      setLoginInfo(`Te enviamos un email a ${email} para confirmar tu cuenta. Abrí el link y después iniciá sesión acá.`);
      return;
    }

    // (Caso raro: confirmación de email desactivada) ya queda logueado.
    currentSession = data.session;
  };

  // ------------------------------------------
  // Logout
  // ------------------------------------------

  window.logout = async function () {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error.message);
    }
    // onAuthStateChange (evento SIGNED_OUT) muestra la pantalla de auth.
    currentSession = null;

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    window.showAuthTab('login');
    clearLoginError();
  };

  // ------------------------------------------
  // Utilidades expuestas para el resto de la app
  // ------------------------------------------

  // Sincrónico, basado en la última sesión conocida en memoria.
  // Útil para chequeos rápidos de UI; para lógica crítica preferir
  // supabaseClient.auth.getSession() (async).
  window.isAuthenticated = function () {
    return Boolean(currentSession);
  };

  // Devuelve el usuario logueado actual (o null), por si otros módulos
  // necesitan el user_id sin volver a llamar a Supabase.
  window.getCurrentUser = function () {
    return currentSession ? currentSession.user : null;
  };

  document.addEventListener('DOMContentLoaded', initializeAuth);
})();
