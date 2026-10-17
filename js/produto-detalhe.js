'use strict';

let produtoAtual = null;
let quantidadeAtual = 1;
let corSelecionadaAtual = null;
let tamanhoSelecionadoAtual = null;

document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('productLayout')) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('detailNome').textContent = 'Produto não encontrado';
        return;
    }
    tentarRenderizar(id, 25);
});

function tentarRenderizar(id, tentativasRestantes) {
    const produtos = (typeof obterProdutos === 'function') ? obterProdutos() : [];
    const p = produtos.find(function (x) { return x.id === id; });
    if (p) {
        produtoAtual = p;
        renderizarProduto(p);
        carregarRelacionados(p);
        return;
    }
    if (tentativasRestantes > 0) {
        setTimeout(function () { tentarRenderizar(id, tentativasRestantes - 1); }, 200);
    } else {
        document.getElementById('detailNome').textContent = 'Produto não encontrado';
    }
}

function renderizarProduto(p) {
    const catEl = document.getElementById('breadcrumbCategoria');
    if (catEl) {
        catEl.textContent = capitalizar(p.categoria);
        catEl.href = (p.categoria === 'old-money') ? 'old-money.html' : p.categoria + '.html';
    }
    const bcProd = document.getElementById('breadcrumbProduto');
    if (bcProd) bcProd.textContent = p.nome;
    document.title = p.nome + ' — Seynclothing';
    setText('detailCategoria', capitalizar(p.categoria));
    setText('detailNome', p.nome);
    setText('detailPreco', formatarPreco(p.preco));
    setText('detailDescricao', p.descricao);
    setText('accordionDescricao', p.descricao);

    const precoAntigoEl = document.getElementById('detailPrecoAntigo');
    if (precoAntigoEl) {
        if (p.precoAntigo) {
            precoAntigoEl.textContent = formatarPreco(p.precoAntigo);
            precoAntigoEl.style.display = '';
        } else {
            precoAntigoEl.style.display = 'none';
        }
    }
    const descontoEl = document.getElementById('detailDesconto');
    const desconto = (typeof calcularDesconto === 'function') ? calcularDesconto(p.precoAntigo, p.preco) : null;
    if (descontoEl) {
        if (desconto) {
            descontoEl.textContent = '-' + desconto + '%';
            descontoEl.style.display = '';
        } else {
            descontoEl.style.display = 'none';
        }
    }
    renderizarGaleria(p);
    ajustarGridGaleria();
    renderizarCores(p);
    renderizarTamanhos(p);

    const btnWish = document.getElementById('btnWish');
    if (btnWish && typeof ehFavorito === 'function') {
        btnWish.classList.toggle('active', ehFavorito(p.id));
    }
    if (p.estoque === false) {
        const btnAdd = document.getElementById('btnAddCart');
        const btnBuy = document.getElementById('btnBuyNow');
        [btnAdd, btnBuy].forEach(function (b) {
            if (!b) return;
            b.disabled = true;
            b.textContent = 'Esgotado';
        });
    }
}

function renderizarGaleria(p) {
    const imgs = [p.imagem, p.imagemAlt].filter(Boolean);
    const thumbsWrap = document.getElementById('galleryThumbs');
    const mainImg = document.getElementById('galleryImage');
    if (!imgs.length || !mainImg) return;
    mainImg.src = imgs[0];
    mainImg.alt = p.nome;
    if (thumbsWrap) {
        if (imgs.length <= 1) {
            thumbsWrap.style.display = 'none';
        } else {
            thumbsWrap.style.display = '';
            thumbsWrap.innerHTML = imgs.map(function (img, i) {
                return '<button type="button" class="gallery-thumb' + (i === 0 ? ' active' : '') + '" onclick="trocarImagemGaleria(this, \'' + img + '\')"><img src="' + img + '" alt="' + p.nome + '"></button>';
            }).join('');
        }
    }
}

function trocarImagemGaleria(thumb, src) {
    document.querySelectorAll('.gallery-thumb').forEach(function (t) { t.classList.remove('active'); });
    thumb.classList.add('active');
    const mainImg = document.getElementById('galleryImage');
    if (!mainImg) return;
    mainImg.style.opacity = '0';
    setTimeout(function () { mainImg.src = src; mainImg.style.opacity = '1'; }, 150);
}

function renderizarCores(p) {
    const field = document.getElementById('detailFieldCores');
    const wrap = document.getElementById('detailCores');
    if (!field || !wrap) return;
    if (!p.cores || !p.cores.length) { field.style.display = 'none'; return; }
    field.style.display = '';
    wrap.innerHTML = p.cores.map(function (cor, i) {
        return '<button type="button" class="detail-color' + (i === 0 ? ' active' : '') + '" style="background:' + cor + '" data-cor="' + cor + '" onclick="selecionarCor(this)"></button>';
    }).join('');
    corSelecionadaAtual = p.cores[0];
    setText('corSelecionada', formatarCor(p.cores[0]));
}

function selecionarCor(btn) {
    document.querySelectorAll('.detail-color').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    corSelecionadaAtual = btn.dataset.cor;
    setText('corSelecionada', formatarCor(corSelecionadaAtual));
}

function renderizarTamanhos(p) {
    const field = document.getElementById('detailFieldTamanhos');
    const wrap = document.getElementById('detailTamanhos');
    if (!field || !wrap) return;
    if (!p.tamanhos || !p.tamanhos.length) { field.style.display = 'none'; return; }
    field.style.display = '';
    wrap.innerHTML = p.tamanhos.map(function (t) {
        return '<button type="button" class="detail-size" onclick="selecionarTamanhoProduto(this)">' + t + '</button>';
    }).join('');
}

function selecionarTamanhoProduto(btn) {
    document.querySelectorAll('.detail-size').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    tamanhoSelecionadoAtual = btn.textContent.trim();
    setText('tamanhoSelecionado', tamanhoSelecionadoAtual);
}

function alterarQtd(delta) {
    quantidadeAtual = Math.max(1, quantidadeAtual + delta);
    setText('qtdProduto', quantidadeAtual);
}

function adicionarProdutoCarrinho() {
    if (!produtoAtual) return;
    if (precisaTamanho() && !tamanhoSelecionadoAtual) { window.toast('Escolha um tamanho', 'warn'); return; }
    for (let i = 0; i < quantidadeAtual; i++) adicionarAoCarrinho(produtoAtual.id);
}

function comprarAgoraProduto() {
    if (!produtoAtual) return;
    if (precisaTamanho() && !tamanhoSelecionadoAtual) { window.toast('Escolha um tamanho', 'warn'); return; }
    if (typeof comprarAgora === 'function') comprarAgora(produtoAtual.id, quantidadeAtual);
}

function toggleWishProduto(btn) {
    if (!produtoAtual) return;
    const adicionou = toggleFavorito(produtoAtual.id);
    btn.classList.toggle('active', adicionou);
    window.toast(adicionou ? 'Adicionado aos favoritos' : 'Removido dos favoritos', adicionou ? 'success' : 'info');
}

function precisaTamanho() {
    return produtoAtual && produtoAtual.tamanhos && produtoAtual.tamanhos.length > 1;
}

function abrirZoom() {
    const mainImg = document.getElementById('galleryImage');
    const overlay = document.getElementById('zoomOverlay');
    const zoomImg = document.getElementById('zoomImage');
    if (!mainImg || !overlay || !zoomImg || !mainImg.src) return;
    zoomImg.src = mainImg.src;
    zoomImg.alt = mainImg.alt;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function fecharZoom() {
    const overlay = document.getElementById('zoomOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharZoom(); });

function abrirGuiaTamanhos() {
    alert('Tabela de tamanhos:\n\nP  — 88 a 96 cm\nM  — 96 a 104 cm\nG  — 104 a 112 cm\nGG — 112 a 120 cm');
}

function carregarRelacionados(p) {
    const grid = document.getElementById('relatedGrid');
    if (!grid) return;
    const todos = (typeof obterProdutos === 'function') ? obterProdutos() : [];
    const lista = todos.filter(function (x) { return x.id !== p.id && x.categoria === p.categoria; }).slice(0, 4);
    if (typeof renderizarProdutos === 'function') renderizarProdutos(lista, 'relatedGrid');
    const link = document.getElementById('linkVerTudoCategoria');
    if (link) {
        link.href = (p.categoria === 'old-money') ? 'old-money.html' : p.categoria + '.html';
        link.textContent = 'Ver tudo de ' + capitalizar(p.categoria);
    }
}

function setText(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function capitalizar(str) {
    if (!str) return '';
    return str.split('-').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ');
}

window.alterarQtd = alterarQtd;
window.selecionarCor = selecionarCor;
window.selecionarTamanhoProduto = selecionarTamanhoProduto;
window.trocarImagemGaleria = trocarImagemGaleria;
window.adicionarProdutoCarrinho = adicionarProdutoCarrinho;
window.comprarAgoraProduto = comprarAgoraProduto;
window.toggleWishProduto = toggleWishProduto;
window.abrirZoom = abrirZoom;
window.fecharZoom = fecharZoom;
window.abrirGuiaTamanhos = abrirGuiaTamanhos;

/* ---------------------------------------------------------
   AJUSTE DE GRID — quando não tem thumbs
   --------------------------------------------------------- */
function ajustarGridGaleria() {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;
    const thumbs = document.getElementById('galleryThumbs');
    const temThumbs = thumbs && thumbs.style.display !== 'none' && thumbs.children.length > 0;
    gallery.classList.toggle('sem-thumbs', !temThumbs);
}

function formatarCor(cor) {
    if (!cor) return '';
    return cor.startsWith('#') ? 'Selecionada' : cor;
}

window.ajustarGridGaleria = ajustarGridGaleria;
window.formatarCor = formatarCor;
