/* =========================================================
   SCRIPT.JS — Funções globais do site
   Header, menu mobile, busca, reveal on scroll
   ========================================================= */

'use strict';


/* ---------------------------------------------------------
   TOAST GLOBAL (usado por todas as páginas) — com ícones
   --------------------------------------------------------- */
window.toast = function (msg, tipo) {

    tipo = tipo || 'info';

    var stack = document.getElementById('toastStack');

    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toastStack';
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
    }

    var icons = {
        success: '<path d="M20 6L9 17l-5-5"/>',
        error:   '<path d="M18 6L6 18M6 6l12 12"/>',
        warn:    '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
        info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
    };

    var icon = icons[tipo] || icons.info;

    var el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            icon +
        '</svg>' +
        '<span>' + msg + '</span>';

    stack.appendChild(el);

    setTimeout(function () {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(function () { el.remove(); }, 300);
    }, 3000);
};


/* ---------------------------------------------------------
   HEADER COMPACTADO AO ROLAR
   --------------------------------------------------------- */
const header = document.getElementById('header');

if (header) {

    window.addEventListener('scroll', () => {

        if (window.scrollY > 40) header.classList.add('scrolled');
        else header.classList.remove('scrolled');

    }, { passive: true });
}


/* ---------------------------------------------------------
   MENU MOBILE
   --------------------------------------------------------- */
function abrirMenu() {

    const nav = document.getElementById('nav');
    if (!nav) return;

    nav.classList.add('open');
    document.body.style.overflow = 'hidden';
}


function fecharMenu() {

    const nav = document.getElementById('nav');
    if (!nav) return;

    nav.classList.remove('open');
    document.body.style.overflow = '';
}


/* ---------------------------------------------------------
   BUSCA
   --------------------------------------------------------- */
function abrirBusca() {

    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}


function fecharBusca() {

    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;

    overlay.classList.remove('open');
    document.body.style.overflow = '';
}


function pesquisarProduto() {

    const input = document.getElementById('searchInput');
    if (!input) return;

    const termo = input.value.trim();

    if (!termo) {
        input.focus();
        return;
    }

    window.location.href = `busca.html?q=${encodeURIComponent(termo)}`;
}


/* ---------------------------------------------------------
   SUBMIT NO INPUT DE BUSCA (ENTER)
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('searchInput');

    if (searchInput) {

        searchInput.addEventListener('keydown', (e) => {

            if (e.key === 'Enter') {
                e.preventDefault();
                pesquisarProduto();
            }
        });
    }
});


/* ---------------------------------------------------------
   FECHAR COM ESC
   --------------------------------------------------------- */
document.addEventListener('keydown', (e) => {

    if (e.key === 'Escape') {
        fecharBusca();
        fecharMenu();
    }
});


/* ---------------------------------------------------------
   FECHAR BUSCA CLICANDO FORA DO BOX
   --------------------------------------------------------- */
document.addEventListener('click', (e) => {

    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    if (!overlay.classList.contains('open')) return;

    if (e.target === overlay) fecharBusca();
});


/* ---------------------------------------------------------
   REVEAL ON SCROLL
   --------------------------------------------------------- */
if ('IntersectionObserver' in window) {

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });

    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-mask')
        .forEach(el => observer.observe(el));
}


/* ---------------------------------------------------------
   EXPÕE GLOBALMENTE
   --------------------------------------------------------- */
window.abrirMenu = abrirMenu;
window.fecharMenu = fecharMenu;
window.abrirBusca = abrirBusca;
window.fecharBusca = fecharBusca;
window.pesquisarProduto = pesquisarProduto;


/* =========================================================
   CONTA NO HEADER — nome + dropdown
   ========================================================= */
(function () {

    if (!window.auth) return;

    auth.onAuthStateChanged(function (user) {

        var wrap     = document.querySelector('.conta-wrap');
        var btn      = document.getElementById('contaHeaderBtn') ||
                       document.querySelector('.conta-button');

        var nomeEl   = document.getElementById('contaNomeHeader');
        var fullEl   = document.getElementById('contaNomeFull');
        var emailEl  = document.getElementById('contaEmailHeader');
        var avatarEl = document.getElementById('contaAvatarHeader');

        if (!btn) return;

        if (user) {

            if (wrap) wrap.classList.add('logado');
            btn.classList.add('logado');
            btn.href = 'minha-conta.html';

            var nome = user.displayName ||
                       (user.email ? user.email.split('@')[0] : 'Cliente');

            if (nomeEl)   nomeEl.textContent = nome.split(' ')[0];
            if (fullEl)   fullEl.textContent = nome;
            if (emailEl)  emailEl.textContent = user.email || '';
            if (avatarEl) avatarEl.textContent = nome.charAt(0).toUpperCase();

        } else {

            if (wrap) wrap.classList.remove('logado');
            btn.classList.remove('logado');
            btn.href = 'login.html';

            if (nomeEl)  nomeEl.textContent = '';
        }
    });

    /* Abre/fecha dropdown */
    document.addEventListener('click', function (e) {

        var wrap = document.querySelector('.conta-wrap');
        if (!wrap) return;

        var btn = wrap.querySelector('.conta-button');

        if (btn && btn.contains(e.target)) {
            if (wrap.classList.contains('logado')) {
                e.preventDefault();
                wrap.classList.toggle('aberto');
            }
            return;
        }

        if (!wrap.contains(e.target)) wrap.classList.remove('aberto');
    });

    /* Fecha com ESC */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.conta-wrap.aberto')
                .forEach(function (w) { w.classList.remove('aberto'); });
        }
    });

})();



/* =========================================================
   TEMA CLARO / ESCURO
   ========================================================= */
(function () {

    var TEMA_KEY = 'artefatos-tema';

    /* Aplica o tema salvo o mais rápido possível */
    var temaSalvo = localStorage.getItem(TEMA_KEY) || 'escuro';
    document.documentElement.setAttribute('data-tema', temaSalvo);

    /* Injeta o botão quando o DOM tiver pronto */
    document.addEventListener('DOMContentLoaded', function () {

        var acoes = document.querySelector('.header-actions');
        if (!acoes) return;

        /* Evita duplicar */
        if (acoes.querySelector('.theme-button')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-button';
        btn.setAttribute('aria-label', 'Alternar tema claro / escuro');
        btn.setAttribute('title', 'Alternar tema');

        btn.innerHTML =
            '<svg class="icone-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                '<circle cx="12" cy="12" r="4"/>' +
                '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>' +
            '</svg>' +
            '<svg class="icone-lua" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' +
            '</svg>';

        /* Insere como primeiro item do header-actions */
        acoes.insertBefore(btn, acoes.firstChild);

        /* Alterna ao clicar */
        btn.addEventListener('click', function () {

            var atual = document.documentElement.getAttribute('data-tema') || 'escuro';
            var novo = atual === 'escuro' ? 'claro' : 'escuro';

            document.documentElement.setAttribute('data-tema', novo);
            localStorage.setItem(TEMA_KEY, novo);
        });

    });

})();

/* Move o hamburger pro canto esquerdo do header (desktop) */
document.addEventListener('DOMContentLoaded', function() {
    function moverHamburger() {
        var btn = document.querySelector('.header .menu-button');
        var header = document.querySelector('.header');
        if (!btn || !header) return;

        if (window.innerWidth > 1080) {
            btn.style.cssText = 'position: fixed !important; left: 20px !important; top: 50% !important; transform: translateY(-50%) !important; z-index: 250 !important; display: grid !important;';
            header.style.paddingLeft = '80px';
        } else {
            btn.style.cssText = '';
            header.style.paddingLeft = '';
        }
    }

    moverHamburger();
    window.addEventListener('resize', moverHamburger);
});


/* =========================================================
   🔥 INJETAR MARCAS NO MENU HAMBURGUER (VERIFICAÇÃO DUPLA) 🔥
   ========================================================= */
async function carregarMarcasNoMenu() {
    const nav = document.querySelector('.header .nav');
    if (!nav) return;

    // Evita duplicar se a função rodar mais de uma vez
    if (document.getElementById('menu-titulo-marcas')) return;

    // Tenta pegar a instância do banco (window.db ou apenas db)
    const database = window.db || (typeof db !== 'undefined' ? db : null);

    if (!database) {
        console.warn('[Marcas] Firebase ainda não carregou. Tentando de novo em 1 segundo...');
        setTimeout(carregarMarcasNoMenu, 1000); // Tenta de novo daqui a pouco
        return;
    }

    try {
        const snap = await database.collection('marcas').get();
        
        if (!snap.empty) {
            // Cria a lista de marcas para ordenar alfabeticamente
            const marcas = snap.docs.map(doc => doc.data().nome);
            marcas.sort((a, b) => a.localeCompare(b));

            // Cria o título "MARCAS"
            const title = document.createElement('span');
            title.id = 'menu-titulo-marcas';
            title.textContent = 'MARCAS';
            title.style.cssText = 'font-family:var(--ff-sans); font-size:.68rem; font-weight:600; letter-spacing:.34em; color:var(--blue-3); width:100%; margin-top: 32px; margin-bottom: 12px; display:block; border-top: 1px solid var(--line-1); padding-top: 24px;';
            nav.appendChild(title);

            // Adiciona cada marca
            marcas.forEach(nomeMarca => {
                const link = document.createElement('a');
                link.href = `busca.html?q=${encodeURIComponent(nomeMarca)}`; 
                link.textContent = nomeMarca;
                link.style.cssText = 'font-size: 1.2rem !important; padding: 12px 0 !important; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.9; border-bottom: none !important;'; 
                
                link.onmouseenter = () => link.style.color = 'var(--blue-3)';
                link.onmouseleave = () => link.style.color = 'var(--paper-0)';

                nav.appendChild(link);
            });
            console.log('[Marcas] ✅ Marcas carregadas no menu!');
        } else {
            console.warn('[Marcas] ⚠️ A coleção "marcas" está vazia no Firebase.');
        }
    } catch (error) {
        console.error('[Marcas] ❌ Erro ao carregar no menu:', error);
    }
}

// Tenta rodar assim que a página abre
document.addEventListener('DOMContentLoaded', carregarMarcasNoMenu);

/* =========================================================
   RENDERIZAR CARDS DE MARCAS NA HOME
   ========================================================= */
async function renderizarCardsMarcas() {
    const grid = document.getElementById('marcas-grid');
    if (!grid) return;

    const database = window.db || (typeof db !== 'undefined' ? db : null);
    if (!database) {
        setTimeout(renderizarCardsMarcas, 1000);
        return;
    }

    try {
        const snap = await database.collection('marcas').get();
        
        if (snap.empty) {
            grid.innerHTML = '<p style="color:var(--paper-2); text-align:center; grid-column:1/-1;">Nenhuma marca cadastrada ainda.</p>';
            return;
        }

        // Transforma em array e ordena alfabeticamente
        const marcas = snap.docs.map(doc => doc.data().nome);
        marcas.sort((a, b) => a.localeCompare(b));

        let html = '';
        
        // Cria um card para cada marca
        marcas.forEach((nomeMarca, index) => {
            // Pega as 2 primeiras letras da marca para o "logo" gigante de fundo
            const sigla = nomeMarca.substring(0, 2).toUpperCase();
            // Cria um número (01, 02, 03...)
            const numero = String(index + 1).padStart(2, '0');

            html += `
                <div onclick="window.location.href='busca.html?q=${encodeURIComponent(nomeMarca)}'" class="category-card" style="cursor:pointer; background: linear-gradient(180deg, transparent 42%, rgba(4, 6, 11, .92) 100%), radial-gradient(650px 550px at 50% 20%, rgba(26, 77, 255, .25), transparent 65%), linear-gradient(160deg, #0a1730 0%, #05070f 100%); border-color: rgba(127, 176, 255, .15);">
                    <div class="category-hero-mark" style="opacity: 0.1; font-size: 12rem; bottom: -20px; right: -10px; z-index: 0;">${sigla}</div>
                    <div class="category-content" style="z-index: 2;">
                        <span>${numero}</span>
                        <h3>${nomeMarca}</h3>
                        <p>Explore os produtos e lançamentos exclusivos da marca ${nomeMarca}.</p>
                        <strong>Ver produtos</strong>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    } catch (error) {
        console.error('[Marcas] Erro ao renderizar cards:', error);
        grid.innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Erro ao carregar as marcas.</p>';
    }
}

document.addEventListener('DOMContentLoaded', renderizarCardsMarcas);