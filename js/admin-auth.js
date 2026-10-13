/* =========================================================
   ADMIN-AUTH.JS — Login via Firebase Auth + TOTP (Google Auth)
   v6 — corrigido QR Code (qrcodejs)
   ========================================================= */

'use strict';

const ADMIN_EMAIL = 'seyn.clothing@gmail.com';


document.addEventListener('DOMContentLoaded', function () {

    var overlay = document.getElementById('adminLogin');
    var form    = document.getElementById('adminLoginForm');
    var input   = document.getElementById('adminSenha');

    if (!overlay) {
        console.error('[admin] ❌ #adminLogin não encontrado');
        return;
    }

    console.log('[admin] Iniciando auth — admin esperado:', ADMIN_EMAIL);

    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .then(function () {

            auth.onAuthStateChanged(function (user) {

                console.log('[admin] onAuthStateChanged →', user ? user.email : 'null');

                if (!user) {
                    mostrarLogin(overlay, input);
                    return;
                }

                if (user.email !== ADMIN_EMAIL) {
                    console.warn('[admin] ❌ Email não autorizado:', user.email);
                    auth.signOut().then(function () { mostrarLogin(overlay, input); });
                    return;
                }

                /* ✅ Admin correto — agora verifica TOTP */
                verificarTOTP(user).then(function (ok) {
                    if (ok) {
                        console.log('[admin] ✅ Admin + TOTP OK');
                        esconderLogin(overlay);
                        aguardarFirebaseEIniciar();
                        setTimeout(function () { reiniciarListenersAutenticado(); }, 1500);
                    } else {
                        console.warn('[admin] ❌ TOTP falhou — deslogando');
                        auth.signOut();
                    }
                });
            });
        })
        .catch(function (e) {
            console.error('[admin] ❌ Erro persistência:', e);
        });

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            tentarLogin();
        });
    }
});


/* =========================================================
   🔐 TOTP — VERIFICAÇÃO EM DUAS ETAPAS (GRÁTIS)
   ========================================================= */

async function verificarTOTP(user) {

    return new Promise(async function (resolve) {

        try {

            /* Lê o secret do Firestore */
            var doc = await db.collection('admin_security').doc('totp').get();
            var secret = doc.exists ? doc.data().secret : null;

            /* Se não tem secret → primeira vez, mostra setup */
            if (!secret) {
                console.log('[TOTP] Primeira vez — mostrando setup');
                mostrarSetupTOTP(user, resolve);
                return;
            }

            /* Se tem → pede o código */
            console.log('[TOTP] Pedindo código');
            mostrarVerificacaoTOTP(secret, resolve);

        } catch (e) {
            console.error('[TOTP] Erro:', e);
            resolve(false);
        }
    });
}


/* ---------------------------------------------------------
   SETUP — primeira vez (gera QR Code)
   --------------------------------------------------------- */
function mostrarSetupTOTP(user, resolve) {

    /* Gera um secret novo */
    var secret = new OTPAuth.Secret({ size: 20 });
    var totp = new OTPAuth.TOTP({
        issuer: 'Seyn clothing',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
    });

    var uri = totp.toString();
    var secretBase32 = secret.base32;

    /* Cria o modal */
    var modal = document.createElement('div');
    modal.id = 'totpModal';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(4,6,11,.9); backdrop-filter: blur(20px);
        padding: 20px; font-family: 'Inter', sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: #0a0f19; border: 1px solid rgba(127,176,255,.28); border-radius: 12px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 30px 80px rgba(0,0,0,.6);">
            <h2 style="font-family: 'Playfair Display', serif; font-style: italic; color: #f5f7ff; margin: 0 0 12px; font-size: 1.6rem;">Ativar verificação em duas etapas</h2>
            <p style="color: #a4b2ca; font-size: .9rem; line-height: 1.6; margin: 0 0 24px;">
                Escaneie o QR Code abaixo com o <strong style="color:#f5f7ff;">Google Authenticator</strong> (ou Authy, Microsoft Authenticator).
                Depois digite o código de 6 dígitos que aparecer no app.
            </p>

            <div style="text-align: center; margin-bottom: 20px;">
                <div id="totpQR" style="display: inline-block; background: #fff; padding: 12px; border-radius: 8px;"></div>
            </div>

            <div style="background: rgba(127,176,255,.06); border: 1px dashed rgba(127,176,255,.28); border-radius: 6px; padding: 12px; margin-bottom: 20px;">
                <p style="color: #7fb0ff; font-size: .68rem; letter-spacing: .24em; text-transform: uppercase; font-weight: 600; margin: 0 0 6px;">Ou digite manualmente:</p>
                <code style="color: #f5f7ff; font-size: .78rem; word-break: break-all;">${secretBase32}</code>
            </div>

            <label style="display: block; color: #7fb0ff; font-size: .72rem; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; margin-bottom: 8px;">Código do app</label>
            <input type="text" id="totpCodigoSetup" placeholder="000000" maxlength="6" autocomplete="off"
                   style="width: 100%; padding: 14px 16px; background: #04060b; border: 1px solid rgba(127,176,255,.28); color: #f5f7ff; font-size: 1.4rem; letter-spacing: .3em; text-align: center; border-radius: 6px; outline: none; margin-bottom: 20px;">

            <div style="display: flex; gap: 10px;">
                <button type="button" id="totpCancelar"
                        style="flex: 1; padding: 14px; background: transparent; border: 1px solid rgba(127,176,255,.28); color: #a4b2ca; font-weight: 600; cursor: pointer; border-radius: 6px;">
                    Cancelar
                </button>
                <button type="button" id="totpConfirmar"
                        style="flex: 2; padding: 14px; background: #1a4dff; border: none; color: #fff; font-weight: 700; cursor: pointer; border-radius: 6px;">
                    Ativar
                </button>
            </div>

            <p id="totpErro" style="color: #ef4444; font-size: .8rem; text-align: center; margin: 12px 0 0; display: none;"></p>
        </div>
    `;

    document.body.appendChild(modal);

    /* ✅ Gera o QR Code (lib qrcodejs) */
   var qrContainer = document.getElementById('totpQR');
qrContainer.innerHTML = '';

var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(uri);

var qrImg = document.createElement('img');
qrImg.src = qrUrl;
qrImg.width = 200;
qrImg.height = 200;
qrImg.alt = 'QR Code TOTP';
qrImg.style.display = 'block';

qrImg.onload = function() {
    console.log('[TOTP] ✅ QR Code gerado via API');
};

qrImg.onerror = function() {
    console.error('[TOTP] ❌ Falha ao carregar QR da API');
    qrContainer.innerHTML = '<p style="color:#ef4444;font-size:.8rem;padding:20px;">Erro ao carregar QR. Use o código manual abaixo.</p>';
};

qrContainer.appendChild(qrImg);

    /* Foca no input */
    setTimeout(function () {
        document.getElementById('totpCodigoSetup').focus();
    }, 300);

    /* Botão cancelar */
    document.getElementById('totpCancelar').addEventListener('click', function () {
        modal.remove();
        resolve(false);
    });

    /* Botão confirmar */
    document.getElementById('totpConfirmar').addEventListener('click', async function () {

        var codigo = document.getElementById('totpCodigoSetup').value.trim();
        var erroEl = document.getElementById('totpErro');

        if (codigo.length !== 6) {
            erroEl.textContent = 'Digite os 6 dígitos do app.';
            erroEl.style.display = 'block';
            return;
        }

        /* Valida o código */
        var valido = totp.validate({ token: codigo, window: 1 }) !== null;

        if (!valido) {
            erroEl.textContent = 'Código incorreto. Verifique o horário do celular.';
            erroEl.style.display = 'block';
            document.getElementById('totpCodigoSetup').value = '';
            document.getElementById('totpCodigoSetup').focus();
            return;
        }

        /* Salva o secret no Firestore */
        try {
            await db.collection('admin_security').doc('totp').set({
                secret: secretBase32,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                email: user.email
            });

            console.log('[TOTP] ✅ Secret salvo');
            modal.remove();
            resolve(true);

        } catch (e) {
            console.error('[TOTP] Erro ao salvar:', e);
            erroEl.textContent = 'Erro ao salvar. Tente novamente.';
            erroEl.style.display = 'block';
        }
    });

    /* Enter no input confirma */
    document.getElementById('totpCodigoSetup').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            document.getElementById('totpConfirmar').click();
        }
    });
}


/* ---------------------------------------------------------
   VERIFICAÇÃO — nas próximas vezes (pede código)
   --------------------------------------------------------- */
function mostrarVerificacaoTOTP(secretBase32, resolve) {

    var totp = new OTPAuth.TOTP({
        issuer: 'Seyn clothing',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretBase32)
    });

    /* Cria modal */
    var modal = document.createElement('div');
    modal.id = 'totpVerifyModal';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(4,6,11,.9); backdrop-filter: blur(20px);
        padding: 20px; font-family: 'Inter', sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: #0a0f19; border: 1px solid rgba(127,176,255,.28); border-radius: 12px; padding: 32px; max-width: 420px; width: 100%; box-shadow: 0 30px 80px rgba(0,0,0,.6);">
            <h2 style="font-family: 'Playfair Display', serif; font-style: italic; color: #f5f7ff; margin: 0 0 12px; font-size: 1.5rem;">Verificação em duas etapas</h2>
            <p style="color: #a4b2ca; font-size: .9rem; line-height: 1.6; margin: 0 0 24px;">
                Abra o <strong style="color:#f5f7ff;">Google Authenticator</strong> e digite o código de 6 dígitos da conta <strong style="color:#7fb0ff;">Seyn clothing</strong>.
            </p>

            <input type="text" id="totpCodigoVerif" placeholder="000000" maxlength="6" autocomplete="off"
                   style="width: 100%; padding: 16px; background: #04060b; border: 1px solid rgba(127,176,255,.28); color: #f5f7ff; font-size: 1.6rem; letter-spacing: .3em; text-align: center; border-radius: 6px; outline: none; margin-bottom: 20px;">

            <button type="button" id="totpVerificar"
                    style="width: 100%; padding: 14px; background: #1a4dff; border: none; color: #fff; font-weight: 700; cursor: pointer; border-radius: 6px;">
                Verificar
            </button>

            <p id="totpErroVerif" style="color: #ef4444; font-size: .8rem; text-align: center; margin: 12px 0 0; display: none;"></p>

            <button type="button" id="totpSair"
                    style="width: 100%; margin-top: 12px; padding: 12px; background: transparent; border: none; color: #5d6b83; font-size: .75rem; cursor: pointer;">
                Sair
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(function () {
        document.getElementById('totpCodigoVerif').focus();
    }, 300);

    document.getElementById('totpSair').addEventListener('click', function () {
        modal.remove();
        resolve(false);
    });

    document.getElementById('totpVerificar').addEventListener('click', function () {

        var codigo = document.getElementById('totpCodigoVerif').value.trim();
        var erroEl = document.getElementById('totpErroVerif');

        if (codigo.length !== 6) {
            erroEl.textContent = 'Digite os 6 dígitos.';
            erroEl.style.display = 'block';
            return;
        }

        var valido = totp.validate({ token: codigo, window: 1 }) !== null;

        if (valido) {
            console.log('[TOTP] ✅ Código correto');
            modal.remove();
            resolve(true);
        } else {
            erroEl.textContent = 'Código incorreto. Tente novamente.';
            erroEl.style.display = 'block';
            document.getElementById('totpCodigoVerif').value = '';
            document.getElementById('totpCodigoVerif').focus();
        }
    });

    document.getElementById('totpCodigoVerif').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            document.getElementById('totpVerificar').click();
        }
    });
}


/* ---------------------------------------------------------
   AGUARDA FIREBASE-READY E CARREGA DADOS INICIAIS
   --------------------------------------------------------- */
function aguardarFirebaseEIniciar() {

    var iniciarDados = function () {

        console.log('[admin] firebase pronto — carregando dados iniciais');

        if (typeof carregarPedidosRemotos === 'function') {
            carregarPedidosRemotos()
                .then(function () {
                    if (typeof renderizarDashboard === 'function') renderizarDashboard();
                    if (typeof renderizarPedidos === 'function') renderizarPedidos();
                    if (typeof renderizarClientes === 'function') renderizarClientes();
                    if (typeof renderizarRelatorios === 'function') renderizarRelatorios();
                })
                .catch(function (e) {
                    console.error('[admin] ❌ Erro carregar pedidos:', e);
                });
        }

        if (typeof carregarReembolsosUmaVez === 'function') {
            carregarReembolsosUmaVez();
        }
    };

    if (window.__firebasePronto) {
        iniciarDados();
    } else {
        window.addEventListener('firebase-ready', iniciarDados, { once: true });
    }
}


/* ---------------------------------------------------------
   RECRIA LISTENERS JÁ AUTENTICADO
   --------------------------------------------------------- */
function reiniciarListenersAutenticado() {

    console.log('[admin] 🔥 Recriando listeners autenticado...');

    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL) return;

    if (typeof escutarPedidosRealtime === 'function') {
        try { escutarPedidosRealtime(); } catch (e) {}
    }

    if (typeof escutarReembolsosRealtime === 'function') {
        try { escutarReembolsosRealtime(); } catch (e) {}
    }

    if (typeof carregarReembolsosUmaVez === 'function') {
        carregarReembolsosUmaVez().catch(function (e) {});
    }
}


/* ---------------------------------------------------------
   MOSTRAR / ESCONDER LOGIN
   --------------------------------------------------------- */
function mostrarLogin(overlay, input) {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    document.body.classList.add('admin-locked');
    if (input) setTimeout(function () { input.focus(); }, 200);
}

function esconderLogin(overlay) {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(function () { overlay.style.display = 'none'; }, 300);
    document.body.classList.remove('admin-locked');
}


/* ---------------------------------------------------------
   LOGIN
   --------------------------------------------------------- */
function tentarLogin() {

    var input = document.getElementById('adminSenha');
    var erro  = document.getElementById('adminLoginErro');
    var box   = document.querySelector('.admin-login-box');

    if (!input) return;

    var senha = input.value.trim();
    if (!senha) { if (erro) erro.textContent = 'Digite a senha.'; return; }

    if (erro) erro.textContent = 'Verificando...';

    auth.signInWithEmailAndPassword(ADMIN_EMAIL, senha)
        .then(function (cred) {
            console.log('[admin] ✅ Login OK:', cred.user.email);
            if (erro) erro.textContent = '';
        })
        .catch(function (e) {
            console.error('[admin] ❌ Erro login:', e.code, e.message);

            if (erro) {
                if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                    erro.textContent = 'Senha incorreta.';
                } else if (e.code === 'auth/user-not-found') {
                    erro.textContent = 'Usuário não encontrado.';
                } else if (e.code === 'auth/too-many-requests') {
                    erro.textContent = 'Muitas tentativas. Aguarde.';
                } else {
                    erro.textContent = 'Erro: ' + e.code;
                }
            }

            if (box) {
                box.classList.add('shake');
                setTimeout(function () { box.classList.remove('shake'); }, 500);
            }

            if (input) { input.value = ''; input.focus(); }
        });
}


/* ---------------------------------------------------------
   LOGOUT
   --------------------------------------------------------- */
function fazerLogout() {
    if (!confirm('Deseja sair da área administrativa?')) return;
    auth.signOut().then(function () { window.location.href = 'index.html'; });
}


/* ---------------------------------------------------------
   MOSTRAR / ESCONDER SENHA
   --------------------------------------------------------- */
function alternarSenha() {
    var input = document.getElementById('adminSenha');
    var btn   = document.getElementById('adminToggleSenha');
    if (!input || !btn) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('active');
    } else {
        input.type = 'password';
        btn.classList.remove('active');
    }
}


/* ---------------------------------------------------------
   EXPÕE
   --------------------------------------------------------- */
window.tentarLogin                = tentarLogin;
window.fazerLogout                = fazerLogout;
window.alternarSenha              = alternarSenha;
window.reiniciarListenersAutenticado = reiniciarListenersAutenticado;