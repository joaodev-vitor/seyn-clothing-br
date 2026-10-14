/* =========================================================
   PRODUCTS.JS — Catálogo + grids + favoritos + comprar agora
   v4 — filtro de gênero + controle do hambúrguer
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
   CATÁLOGO PADRÃO
   ========================================================= */
const CATALOGO_PADRAO = [
    /* ---------- STREETWEAR ---------- */
    { id: 'sw-001', nome: 'Moletom Oversized Ártico', categoria: 'streetwear',
      descricao: 'Moletom pesado 420g, capuz duplo, corte oversized.',
      preco: 349.90, precoAntigo: 429.90,
      imagem: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80',
      badge: 'novo', tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#0a1a3a', '#111', '#7a8aa8'], estoque: true },

    { id: 'sw-002', nome: 'Calça Cargo Utility', categoria: 'streetwear',
      descricao: 'Sarja resistente, bolsos laterais, barra ajustável.',
      preco: 389.90,
      imagem: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
      badge: null, tamanhos: ['38', '40', '42', '44'],
      cores: ['#0d1a30', '#2a2a2a'], estoque: true },

    { id: 'sw-003', nome: 'Jaqueta Corta-Vento Noturna', categoria: 'streetwear',
      descricao: 'Tecido ripstop, costura selada, fecho YKK.',
      preco: 549.90, precoAntigo: 649.90,
      imagem: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=800&q=80',
      badge: 'sale', tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#050a1a', '#1a4dff'], estoque: true },

    { id: 'sw-004', nome: 'Camiseta Boxy Heavy', categoria: 'streetwear',
      descricao: 'Algodão penteado 240g, gola dupla, corte boxy.',
      preco: 189.90,
      imagem: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG', 'XG'],
      cores: ['#fff', '#050a1a', '#1a4dff'], estoque: true },

    { id: 'sw-005', nome: 'Boné Aba Curva Stone', categoria: 'streetwear',
      descricao: 'Sarja lavada, aba curva, bordado tom sobre tom.',
      preco: 129.90,
      imagem: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80',
      badge: null, tamanhos: ['Único'],
      cores: ['#0d1a30', '#2a2a2a', '#7a8aa8'], estoque: true },

    { id: 'sw-006', nome: 'Moletom Capuz Fechado Deep', categoria: 'streetwear',
      descricao: 'Moletom fechado, felpa interna, punhos canelados.',
      preco: 319.90,
      imagem: 'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#050a1a', '#1a4dff'], estoque: false },

    { id: 'sw-007', nome: 'Calça Moletom Wide', categoria: 'streetwear',
      descricao: 'Moletom peluciado, corte wide, cordão de algodão.',
      preco: 289.90,
      imagem: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80',
      badge: 'novo', tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#111', '#0a1a3a'], estoque: true },

    { id: 'sw-008', nome: 'Jaqueta Jeans Crua', categoria: 'streetwear',
      descricao: 'Denim cru 14oz, lavagem rígida, botões de metal.',
      preco: 479.90,
      imagem: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#7a8aa8'], estoque: true },

    /* ---------- ACESSÓRIOS ---------- */
    { id: 'ac-001', nome: 'Relógio Minimalista Aço', categoria: 'acessorios',
      descricao: 'Caixa fina 38mm, mostrador azul-marinho, pulseira em couro.',
      preco: 689.90, precoAntigo: 849.90,
      imagem: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80',
      badge: 'sale', tamanhos: ['Único'],
      cores: ['#0a1a3a', '#111'], estoque: true },

    { id: 'ac-002', nome: 'Cinto Couro Legítimo', categoria: 'acessorios',
      descricao: 'Couro curtido à mão, fivela em metal escovado.',
      preco: 249.90,
      imagem: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G'],
      cores: ['#1a1008', '#111'], estoque: true },

    { id: 'ac-003', nome: 'Óculos Sol Polarizado', categoria: 'acessorios',
      descricao: 'Armação acetato, lentes polarizadas UV400.',
      preco: 429.90,
      imagem: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&q=80',
      badge: 'novo', tamanhos: ['Único'],
      cores: ['#0a0a0a', '#4a3520'], estoque: true },

    { id: 'ac-004', nome: 'Corrente Prata Fina', categoria: 'acessorios',
      descricao: 'Prata 925, elo cubano 3mm, fecho reforçado.',
      preco: 379.90,
      imagem: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80',
      badge: null, tamanhos: ['Único'],
      cores: ['#c0c0c0'], estoque: true },

    { id: 'ac-005', nome: 'Carteira Slim Couro', categoria: 'acessorios',
      descricao: 'Couro vegetal, porta-cartões e nota, perfil fino.',
      preco: 199.90,
      imagem: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
      badge: null, tamanhos: ['Único'],
      cores: ['#1a1008', '#111'], estoque: true },

    { id: 'ac-006', nome: 'Relógio Cronógrafo Esporte', categoria: 'acessorios',
      descricao: 'Aço inox, movimento suíço, resistente 100m.',
      preco: 1290.00,
      imagem: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80',
      badge: 'novo', tamanhos: ['Único'],
      cores: ['#111', '#7a8aa8'], estoque: true },

    /* ---------- OLD MONEY ---------- */
    { id: 'om-001', nome: 'Blazer Alfaiataria Marinho', categoria: 'old-money',
      descricao: 'Lã fria italiana, corte estruturado, forro Bemberg.',
      preco: 1490.00,
      imagem: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#0a1a3a', '#1a1008'], estoque: true },

    { id: 'om-002', nome: 'Camisa Oxford Branca', categoria: 'old-money',
      descricao: 'Algodão oxford premium, gola button-down.',
      preco: 349.90,
      imagem: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
      imagemAlt: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#fff', '#a8c0e0'], estoque: true },

    { id: 'om-003', nome: 'Calça Chino Bege', categoria: 'old-money',
      descricao: 'Sarja gabardine, corte reto clássico.',
      preco: 449.90, precoAntigo: 549.90,
      imagem: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
      badge: 'sale', tamanhos: ['38', '40', '42', '44'],
      cores: ['#c9b28f', '#0a1a3a'], estoque: true },

    { id: 'om-004', nome: 'Mocassim Couro Marrom', categoria: 'old-money',
      descricao: 'Couro italiano, solado costurado, forro em couro.',
      preco: 890.00,
      imagem: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80',
      badge: null, tamanhos: ['39', '40', '41', '42', '43'],
      cores: ['#3d2818', '#111'], estoque: true },

    { id: 'om-005', nome: 'Suéter Cashmere Cinza', categoria: 'old-money',
      descricao: 'Cashmere 100%, gola redonda, caimento suave.',
      preco: 890.00,
      imagem: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
      badge: 'novo', tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#8a8a8a', '#0a1a3a'], estoque: true },

    { id: 'om-006', nome: 'Blazer Xadrez Príncipe de Gales', categoria: 'old-money',
      descricao: 'Lã inglesa, xadrez tradicional, corte bespoke.',
      preco: 1890.00,
      imagem: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#3a3a3a'], estoque: true },

    { id: 'om-007', nome: 'Polo Piquet Azul Marinho', categoria: 'old-money',
      descricao: 'Piquet de algodão egípcio, bordado discreto.',
      preco: 289.90,
      imagem: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&q=80',
      badge: null, tamanhos: ['P', 'M', 'G', 'GG'],
      cores: ['#0a1a3a', '#fff'], estoque: true }
];


/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */
function normalizarProduto(p) {
    return {
        id:              p.id || ('tmp-' + Math.random().toString(36).slice(2)),
        nome:            p.nome || 'Sem nome',
        categoria:       p.categoria || '',
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
        // NOVO: Campo de gênero (padrão "unissex" se não existir)
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
   🛒 COMPRAR AGORA — adiciona ao carrinho e vai pro checkout
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
   VARIÁVEL GLOBAL DO FILTRO DE GÊNERO (NOVO)
   ========================================================= */
let filtroGeneroAtual = 'todos';


/* =========================================================
   CONTROLE DO HAMBÚRGUER (NOVO)
   ========================================================= */
function atualizarMenuHamburguer(genero) {
    const btnMenu = document.querySelector('.header .menu-button');
    if (!btnMenu) return;

    // Se for feminino ou masculino, mostra o hambúrguer
    if (genero === 'feminino' || genero === 'masculino') {
        btnMenu.classList.add('visivel');
    } 
    // Se for "todos", esconde o hambúrguer
    else {
        btnMenu.classList.remove('visivel');
    }
}


/* =========================================================
   FUNÇÃO DE FILTRAR GÊNERO (NOVO)
   ========================================================= */
function filtrarGenero(genero) {
    filtroGeneroAtual = genero;

    // Atualiza a classe 'active' nos botões na tela
    document.querySelectorAll('.btn-gender').forEach(btn => {
        btn.classList.remove('active');
        // Verifica se o botão clicado é o atual
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${genero}'`)) {
            btn.classList.add('active');
        }
    });

    // Chama a função que atualiza o hambúrguer
    atualizarMenuHamburguer(genero);

    // Re-renderiza todos os grids de produtos
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

        // NOVO: Aplica o filtro de gênero
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


/* =========================================================
   ❤️ TOGGLE FAVORITO — card de produto
   ========================================================= */
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

    // NOVO: Aplica o filtro de gênero antes de ordenar
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
   EXPÕE
   ========================================================= */
window.CATALOGO_PADRAO      = CATALOGO_PADRAO;
window.obterProdutos        = obterProdutos;
window.normalizarProduto    = normalizarProduto;
window.formatarPreco        = formatarPreco;
window.calcularDesconto     = calcularDesconto;
window.gerarCardHTML        = gerarCardHTML;
window.renderizarProdutos   = renderizarProdutos;
window.inicializarProdutos  = inicializarProdutos;
window.aplicarOrdenacao     = aplicarOrdenacao;
window.selecionarTamanho    = selecionarTamanho;
window.toggleWish           = toggleWish;
window.comprarAgora         = comprarAgora;
window.filtrarGenero        = filtrarGenero; // NOVO

window.FAV_KEY              = FAV_KEY;
window.lerFavoritos         = lerFavoritos;
window.salvarFavoritos      = salvarFavoritos;
window.ehFavorito           = ehFavorito;
window.toggleFavorito       = toggleFavorito;
window.atualizarBadgeFavoritos = atualizarBadgeFavoritos;