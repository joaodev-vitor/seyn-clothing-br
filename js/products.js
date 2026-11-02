/* =========================================================
   PRODUCTS.JS — Catálogo + grids + favoritos + comprar agora
   v7 — Adaptado para MARCAS (Admin -> Site)
   ========================================================= */

'use strict';

/* =========================================================
   SISTEMA DE FAVORITOS
   ========================================================= */
const FAV_KEY = 'artefatos_favoritos';

function lerFavoritos() {
    try {
        var raw = localStorage.getItem(FAV_KEY);
        if (!raw) {
            var antigo = localStorage.getItem('miqjo_favoritos');
            if (antigo) {
                localStorage.setItem(FAV_KEY, antigo);
                raw = antigo;
            }
        }
        var lista = JSON.parse(raw || '[]');
        return Array.isArray(lista) ? lista : [];
    } catch (e) {
        console.warn('[favoritos] Erro ao ler:', e);
        return [];
    }
}

function salvarFavoritos(lista) {
    try {
        localStorage.setItem(FAV_KEY, JSON.stringify(lista || []));
        window.dispatchEvent(new Event('favoritosUpdated'));
        atualizarBadgeFavoritos();
    } catch (e) {
        console.warn('[favoritos] Erro ao salvar:', e);
    }
}

function ehFavorito(id) {
    if (!id) return false;
    return lerFavoritos().indexOf(id) !== -1;
}

function toggleFavorito(id) {
    if (!id) return false;
    var lista = lerFavoritos();
    var idx = lista.indexOf(id);
    var adicionou;

    if (idx === -1) {
        lista.push(id);
        adicionou = true;
    } else {
        lista.splice(idx, 1);
        adicionou = false;
    }

    salvarFavoritos(lista);
    return adicionou;
}

function atualizarBadgeFavoritos() {
    var total = lerFavoritos().length;
    document.querySelectorAll('[data-fav-count]').forEach(function (el) {
        el.textContent = total;
        el.style.display = total > 0 ? '' : 'none';
    });
    var badgeConta = document.getElementById('contaBadgeFavoritos');
    if (badgeConta) badgeConta.textContent = total;
}


/* =========================================================
   CATÁLOGO PADRÃO (FALLBACK SE O FIREBASE ESTIVER VAZIO)
   ========================================================= */
const CATALOGO_PADRAO = [
    { id: 'sw-001', nome: 'Moletom Oversized Ártico', categoria: 'Seynclothing',
      descricao: 'Moletom pesado 420g, capuz duplo, corte oversized.',
      preco: 349.90, precoAntigo: 429.90,
      imagem: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80',
      badge: 'novo', tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#0a1a3a', '#111', '#7a8aa8'], estoque: true },
    { id: 'om-001', nome: 'Blazer Alfaiataria Marinho', categoria: 'Seynclothing',
      descricao: 'Lã fria italiana, corte estruturado, forro Bemberg.',
      preco: 1490.00,
      imagem: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#0a1a3a', '#1a1008'], estoque: true }
];


/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */
function normalizarProduto(p) {
    return {
        id:              p.id || ('tmp-' + Math.random().toString(36).slice(2)),
        nome:            p.nome || 'Sem nome',
        categoria:       p.categoria || 'Seynclothing', // Agora é a MARCA
        descricao:       p.descricao || '',
        preco:           Number(p.preco) || 0,
        precoAntigo:     p.precoAntigo ? Number(p.precoAntigo) : null,
        imagem:          p.imagem || '',
        imagemAlt:       p.imagemAlt || '',
        badge:           p.badge || null,
        tamanhos:        Array.isArray(p.tamanhos) && p.tamanhos.length ? p.tamanhos : ['Único'],
        cores:           Array.isArray(p.cores) ? p.cores : [],
        estoque:         p.estoque !== false,
        quantidade:      typeof p.quantidade === 'number' ? p.quantidade : 0,
        estoqueTamanhos: p.estoqueTamanhos || {},
        genero:          (p.genero || 'unissex').toLowerCase()
    };
}


/* =========================================================
   LEITURA
   ========================================================= */
function obterProdutos() {
    if (Array.isArray(window.__catalogo) && window.__catalogo.length > 0) {
        return window.__catalogo.map(normalizarProduto);
    }

    let custom = [];
    try {
        const salvos = localStorage.getItem('artefatos_produtos');
        if (salvos) custom = JSON.parse(salvos) || [];
    } catch (e) {
        console.warn('[products] Falha ao ler localStorage:', e);
    }

    return [...CATALOGO_PADRAO, ...custom].map(normalizarProduto);
}


/* =========================================================
   FORMATAÇÃO
   ========================================================= */
function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function calcularDesconto(precoAntigo, preco) {
    if (!precoAntigo || precoAntigo <= preco) return null;
    return Math.round((1 - preco / precoAntigo) * 100);
}


/* =========================================================
   🛒 COMPRAR AGORA
   ========================================================= */
function comprarAgora(id, quantidade) {
    quantidade = Math.max(1, parseInt(quantidade, 10) || 1);

    if (!id) {
        console.warn('[comprarAgora] ID ausente');
        return;
    }

    if (typeof lerCarrinho !== 'function' || typeof salvarCarrinho !== 'function') {
        if (window.toast) window.toast('Erro: carrinho indisponível', 'error');
        return;
    }

    var produtos = obterProdutos();
    var produto = produtos.find(function (p) { return p.id === id; });

    if (!produto) {
        if (window.toast) window.toast('Produto não encontrado', 'error');
        return;
    }

    if (produto.estoque === false) {
        if (window.toast) window.toast('Produto esgotado', 'warn');
        return;
    }

    var carrinho = lerCarrinho();
    var existente = carrinho.find(function (i) { return i.id === id; });

    if (existente) {
        existente.quantidade += quantidade;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            imagem: produto.imagem,
            categoria: produto.categoria,
            quantidade: quantidade
        });
    }

    salvarCarrinho(carrinho);

    if (typeof atualizarContador === 'function') atualizarContador();

    window.location.href = 'finalizar.html';
}


/* =========================================================
   CARD
   ========================================================= */
function gerarCardHTML(p) {
    const desconto = calcularDesconto(p.precoAntigo, p.preco);
    const favoritado = ehFavorito(p.id);
    const esgotado = p.estoque === false;

    let badges = '';
    if (p.badge === 'novo') badges += '<span class="product-badge product-badge--new">Novo</span>';
    if (p.badge === 'sale' || desconto) badges += `<span class="product-badge product-badge--sale">-${desconto || 0}%</span>`;
    if (esgotado) badges += '<span class="product-badge product-badge--out">Esgotado</span>';

    const coresHTML = (p.cores && p.cores.length)
        ? `<div class="product-colors">
             ${p.cores.map((c, i) => `<span class="product-color${i === 0 ? ' active' : ''}" style="background:${c}"></span>`).join('')}
           </div>`
        : '';

    const tamanhosHTML = (p.tamanhos && p.tamanhos.length)
        ? `<div class="product-sizes">
             ${p.tamanhos.map(t => `<button class="product-size" type="button" onclick="selecionarTamanho(event, this)">${t}</button>`).join('')}
           </div>`
        : '';

    const precoHTML = `
        <div class="product-price">
            <strong>${formatarPreco(p.preco)}</strong>
            ${p.precoAntigo ? `<s>${formatarPreco(p.precoAntigo)}</s>` : ''}
            ${desconto ? `<em>-${desconto}%</em>` : ''}
        </div>
    `;

    return `
        <article class="product-card" data-id="${p.id}" data-categoria="${p.categoria}">
            <div class="product-media">
                <img class="product-img product-img--main" src="${p.imagem}" alt="${p.nome}" loading="lazy"
                     onerror="this.style.background='#0b1120';this.style.opacity=.4">
                ${p.imagemAlt
                    ? `<img class="product-img product-img--alt" src="${p.imagemAlt}"
                           alt="${p.nome} — vista alternativa" loading="lazy"
                           onerror="this.style.display='none'">`
                    : ''}
                ${badges ? `<div class="product-badges">${badges}</div>` : ''}
                <button class="product-wish${favoritado ? ' active' : ''}"
                        type="button"
                        data-fav-id="${p.id}"
                        onclick="toggleWish(event, this)"
                        aria-label="${favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 20.5l-7.5-7.2a4.7 4.7 0 0 1 6.6-6.7l.9.9.9-.9a4.7 4.7 0 0 1 6.6 6.7z"/>
                    </svg>
                </button>
                <div class="product-actions">
                    <button class="product-quick-add"
                            type="button"
                            onclick="event.preventDefault(); adicionarAoCarrinho('${p.id}')"
                            ${esgotado ? 'disabled' : ''}>
                        ${esgotado ? 'Esgotado' : `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M5 7h14l-1.2 12.5a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 7z"/>
                                <path d="M9 7V5.5A3 3 0 0 1 15 5.5V7"/>
                            </svg>
                            Adicionar`}
                    </button>
                    <button class="product-buy-now"
                            type="button"
                            onclick="event.preventDefault(); comprarAgora('${p.id}')"
                            ${esgotado ? 'disabled' : ''}>
                        ${esgotado ? '—' : `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M5 12h14M13 6l6 6-6 6"/>
                            </svg>
                            Comprar`}
                    </button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-cat">${p.categoria}</span>
                <h3 class="product-name">
                    <a href="produto.html?id=${p.id}">${p.nome}</a>
                </h3>
                <p class="product-desc">${p.descricao}</p>
                ${precoHTML}
                ${coresHTML}
                ${tamanhosHTML}
            </div>
        </article>
    `;
}


/* =========================================================
   RENDER
   ========================================================= */
function renderizarProdutos(lista, gridId = 'products-grid') {
    const grid = document.getElementById(gridId);
    if (!grid) return [];

    if (!lista) lista = obterProdutos();

    grid.innerHTML = lista.length === 0 ? '' : lista.map(gerarCardHTML).join('');

    const vazio = document.getElementById('no-products');
    if (vazio) vazio.style.display = lista.length === 0 ? 'flex' : 'none';

    document.querySelectorAll('[data-count-produtos]').forEach(el => {
        el.textContent = String(lista.length).padStart(2, '0');
    });
    document.querySelectorAll('[data-count-produtos-plural]').forEach(el => {
        el.textContent = lista.length === 1 ? '1 peça' : `${lista.length} peças`;
    });

    const cc = document.getElementById('categoryCount');
    if (cc) cc.textContent = String(lista.length).padStart(2, '0');

    const rc = document.getElementById('categoryResultCount');
    if (rc) rc.textContent = lista.length === 1 ? '1 peça' : lista.length + ' peças';

    return lista;
}


/* =========================================================
   FILTRO DE GÊNERO
   ========================================================= */
let filtroGeneroAtual = 'todos';


function filtrarGenero(genero) {
    if (filtroGeneroAtual === genero) {
        genero = 'todos';
    }

    filtroGeneroAtual = genero;

    document.querySelectorAll('.btn-gender').forEach(function (btn) {
        btn.classList.remove('active');
        var onclick = btn.getAttribute('onclick') || '';
        if (onclick.indexOf("'" + genero + "'") !== -1) {
            btn.classList.add('active');
        }
    });

    document.body.classList.remove('tema-feminino', 'tema-masculino');
    if (genero === 'feminino') {
        document.body.classList.add('tema-feminino');
    } else if (genero === 'masculino') {
        document.body.classList.add('tema-masculino');
    }

    const btnMenu = document.querySelector('.header .menu-button');
    if (btnMenu) {
        if (genero === 'feminino' || genero === 'masculino') {
            btnMenu.classList.add('visivel');
            document.body.classList.add('tem-filtro');
        } else {
            btnMenu.classList.remove('visivel');
            document.body.classList.remove('tem-filtro');
        }
    }

    const nav = document.querySelector('.header .nav');
    if (nav) nav.classList.remove('open');

    inicializarProdutos();
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
function inicializarProdutos() {
    if (document.body.classList.contains('search-page')) return;

    atualizarBadgeFavoritos();

    const grids = document.querySelectorAll('[id^="products-grid"]');
    if (grids.length === 0) return;

    grids.forEach(grid => {
        const categoria = (grid.dataset.categoria || '').trim();
        const limite    = parseInt(grid.dataset.limit || '0', 10);
        const ordem     = grid.dataset.ordem || 'padrao';

        let lista = obterProdutos();

        if (filtroGeneroAtual !== 'todos') {
            lista = lista.filter(p => p.genero === filtroGeneroAtual);
        }

        if (categoria) {
            lista = lista.filter(p => p.categoria.toLowerCase() === categoria.toLowerCase());
        }

        if (ordem === 'preco-asc')       lista = [...lista].sort((a, b) => a.preco - b.preco);
        else if (ordem === 'preco-desc') lista = [...lista].sort((a, b) => b.preco - a.preco);
        else if (ordem === 'nome')       lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome));

        if (limite > 0) lista = lista.slice(0, limite);

        renderizarProdutos(lista, grid.id);
    });
}


/* =========================================================
   INTERAÇÕES DO CARD
   ========================================================= */
function selecionarTamanho(event, botao) {
    event.preventDefault();
    botao.parentElement.querySelectorAll('.product-size').forEach(b => b.classList.remove('active'));
    botao.classList.add('active');
}

function toggleWish(event, botao) {
    event.preventDefault();
    event.stopPropagation();

    var id = botao.dataset.favId;

    if (!id) {
        var card = botao.closest('.product-card');
        if (card) id = card.dataset.id;
    }

    if (!id) {
        console.warn('[favoritos] Botão sem id de produto');
        return;
    }

    var adicionou = toggleFavorito(id);

    botao.classList.toggle('active', adicionou);
    botao.setAttribute('aria-label', adicionou
        ? 'Remover dos favoritos'
        : 'Adicionar aos favoritos');

    var msg = adicionou
        ? 'Adicionado aos favoritos ♥'
        : 'Removido dos favoritos';

    if (typeof window.toast === 'function') {
        window.toast(msg, adicionou ? 'success' : 'info');
    }
}


/* =========================================================
   ORDENAÇÃO
   ========================================================= */
function aplicarOrdenacao(valor) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const categoria = grid.dataset.categoria || '';
    let lista = obterProdutos();

    if (filtroGeneroAtual !== 'todos') {
        lista = lista.filter(p => p.genero === filtroGeneroAtual);
    }

    if (categoria) {
        lista = lista.filter(p => p.categoria.toLowerCase() === categoria.toLowerCase());
    }

    switch (valor) {
        case 'price-asc':  lista.sort((a, b) => a.preco - b.preco); break;
        case 'price-desc': lista.sort((a, b) => b.preco - a.preco); break;
        case 'name':       lista.sort((a, b) => a.nome.localeCompare(b.nome)); break;
    }

    renderizarProdutos(lista);
}


/* =========================================================
   EXECUÇÃO
   ========================================================= */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarProdutos);
} else {
    inicializarProdutos();
}

window.addEventListener('firebase-ready', () => {
    console.log('[products] firebase-ready — re-renderizando grids');
    inicializarProdutos();
});

if (window.__firebasePronto) {
    inicializarProdutos();
}

document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('sortSelect');
    if (select) {
        select.addEventListener('change', (e) => aplicarOrdenacao(e.target.value));
    }
});


/* =========================================================
   EXPÕE GLOBALMENTE
   ========================================================= */
window.CATALOGO_PADRAO          = CATALOGO_PADRAO;
window.obterProdutos            = obterProdutos;
window.normalizarProduto        = normalizarProduto;
window.formatarPreco            = formatarPreco;
window.calcularDesconto         = calcularDesconto;
window.gerarCardHTML            = gerarCardHTML;
window.renderizarProdutos       = renderizarProdutos;
window.inicializarProdutos      = inicializarProdutos;
window.aplicarOrdenacao         = aplicarOrdenacao;
window.selecionarTamanho        = selecionarTamanho;
window.toggleWish               = toggleWish;
window.comprarAgora             = comprarAgora;
window.filtrarGenero            = filtrarGenero;

window.FAV_KEY                  = FAV_KEY;
window.lerFavoritos             = lerFavoritos;
window.salvarFavoritos          = salvarFavoritos;
window.ehFavorito               = ehFavorito;
window.toggleFavorito           = toggleFavorito;
window.atualizarBadgeFavoritos  = atualizarBadgeFavoritos;