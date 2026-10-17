'use strict';

const adminState = {
    section: 'dashboard',
    filterCategory: '',
    filterStock: '',
    searchTerm: '',
    ordersStatus: '',
    editingId: null,
    pedidoAtual: null,
    reembolsoAtual: null
};

let ultimoPedidoCount = 0;
let primeiroSnapshot = true;
let unsubscribePedidos = null;

let ultimoReembolsoCount = 0;
let primeiroSnapshotReembolso = true;
let unsubscribeReembolsos = null;

/* Guard pra não iniciar 2x */
window.__adminIniciado = false;


/* =========================================================
   SISTEMA DE ESTOQUE POR TAMANHO
   ========================================================= */

function temGrade(produto) {
    if (!produto.tamanhos || produto.tamanhos.length === 0) return false;
    if (produto.tamanhos.length === 1 && produto.tamanhos[0] === 'Único') return false;
    return true;
}

function getEstoqueTamanhos(produto) {
    if (!produto.estoqueTamanhos) produto.estoqueTamanhos = {};
    return produto.estoqueTamanhos;
}

function getQtdTamanho(produto, tamanho) {
    var est = getEstoqueTamanhos(produto);
    return typeof est[tamanho] === 'number' ? est[tamanho] : 0;
}

function getTotalEstoque(produto) {
    if (temGrade(produto)) {
        var total = 0;
        var est = getEstoqueTamanhos(produto);
        for (var t in est) total += est[t] || 0;
        return total;
    }
    var qtd = produto.quantidade;
    if (typeof qtd === 'number') return qtd;
    if (produto.estoque === false) return 0;
    return 0;
}

function estaDisponivel(produto) { return getTotalEstoque(produto) > 0; }

function nivelEstoque(total) {
    if (total === 0) return 'zero';
    if (total <= 5) return 'baixo';
    return 'ok';
}


/* =========================================================
   INIT — 🔥 NÃO INICIA SOZINHO
   Só registra os handlers. O admin-auth.js chama iniciarPainel()
   depois que o login for confirmado.
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {

    var url = new URLSearchParams(window.location.search);
    var section = url.get('section') || 'dashboard';
    trocarSecao(section, true);

    document.getElementById('formProduto')?.addEventListener('submit', salvarProduto);

    var search = document.getElementById('productSearch');
    if (search) {
        search.addEventListener('input', function (e) {
            adminState.searchTerm = e.target.value.trim().toLowerCase();
            renderizarProdutosTabela();
        });
    }

    var filterCat = document.getElementById('filterCategoria');
    if (filterCat) {
        filterCat.addEventListener('change', function (e) {
            adminState.filterCategory = e.target.value;
            renderizarProdutosTabela();
        });
    }

    var filterEst = document.getElementById('filterEstoque');
    if (filterEst) {
        filterEst.addEventListener('change', function (e) {
            adminState.filterStock = e.target.value;
            renderizarProdutosTabela();
        });
    }

    /* 🔥 Só inicia se JÁ estiver logado E firebase pronto */
    var tentarAutoIniciar = function () {

        if (!window.__firebasePronto) return;
        if (!auth.currentUser) return;
        if (auth.currentUser.email !== 'seyn.clothing@gmail.com') return;
        if (window.__adminIniciado) return;

        console.log('[admin] Auto-start (sessão já ativa)');
        iniciarPainel();
    };

    if (window.__firebasePronto) {
        tentarAutoIniciar();
    } else {
        window.addEventListener('firebase-ready', tentarAutoIniciar);
    }

    /* Também escuta auth — se logar depois, inicia */
    if (window.auth) {
        auth.onAuthStateChanged(function (user) {
            if (user && user.email === 'seyn.clothing@gmail.com') {
                tentarAutoIniciar();
            }
        });
    }
});


async function iniciarPainel() {

    if (window.__adminIniciado) {
        console.log('[admin] Já iniciado — ignorando');
        return;
    }

    if (!auth.currentUser || auth.currentUser.email !== 'seyn.clothing@gmail.com') {
        console.warn('[admin] iniciarPainel chamado sem admin logado — abortando');
        return;
    }

    window.__adminIniciado = true;
    console.log('[admin] 🚀 Painel iniciado');

    try {
        if (typeof carregarPedidosRemotos === 'function') {
            await carregarPedidosRemotos();
        }
    } catch (e) {
        console.warn('[admin] Erro pedidos:', e);
    }

    await carregarReembolsosUmaVez();

    renderizarTudo();

    escutarPedidosRealtime();
    escutarReembolsosRealtime();
}

function renderizarTudo() {
    renderizarDashboard();
    renderizarProdutosTabela();
    renderizarPedidos();
    renderizarEstoque();
    renderizarClientes();
    renderizarRelatorios();
    carregarConfig();
    carregarAvaliacoesAdmin();
    renderizarReembolsos();
}


/* =========================================================
   🔔 ESCUTA DE PEDIDOS EM TEMPO REAL
   ========================================================= */
function escutarPedidosRealtime() {

    if (!window.db) return;

    if (unsubscribePedidos) {
        try { unsubscribePedidos(); } catch (e) {}
        unsubscribePedidos = null;
    }

    function processarSnapshot(snapshot) {

        window.__pedidos = snapshot.docs.map(function (doc) {
            var d = doc.data();
            return {
                id: doc.id,
                numero: d.numero,
                data: d.data && d.data.toDate ? d.data.toDate() : (d.data || null),
                itens: d.itens || [],
                total: d.total || 0,
                subtotal: d.subtotal || 0,
                cliente: d.cliente || {},
                frete: d.frete,
                pagamento: d.pagamento,
                status: d.status || 'processando',
                reembolso: d.reembolso || null
            };
        });

        window.__pedidos.sort(function (a, b) {
            var da = a.data ? new Date(a.data) : new Date(0);
            var db = b.data ? new Date(b.data) : new Date(0);
            return db - da;
        });

        var total = window.__pedidos.length;

        if (!primeiroSnapshot && total > ultimoPedidoCount) {
            var novos = total - ultimoPedidoCount;
            var maisNovo = window.__pedidos[0];
            toast(
                '🔔 ' + (novos === 1
                    ? 'Novo pedido #' + (maisNovo.numero || '—') + ' de ' + ((maisNovo.cliente && maisNovo.cliente.nome) || 'cliente')
                    : novos + ' novos pedidos'),
                'success'
            );
            tocarSomNotificacao();
        }

        ultimoPedidoCount = total;
        primeiroSnapshot = false;

        renderizarDashboard();
        renderizarPedidos();
        renderizarClientes();
        renderizarRelatorios();
        atualizarNotificacoes(total);
    }

    try {
        unsubscribePedidos = db.collection('orders')
            .orderBy('data', 'desc')
            .onSnapshot(processarSnapshot, function (err) {
                console.warn('[admin] orderBy pedidos falhou:', err.code || err);
                try {
                    if (unsubscribePedidos) unsubscribePedidos();
                    unsubscribePedidos = db.collection('orders').onSnapshot(processarSnapshot);
                } catch (e2) {}
            });
    } catch (e) {
        try {
            unsubscribePedidos = db.collection('orders').onSnapshot(processarSnapshot);
        } catch (e2) {}
    }
}


/* =========================================================
   💸 REEMBOLSOS — CARREGAR UMA VEZ
   ========================================================= */
async function carregarReembolsosUmaVez() {

    console.log('[admin] 📋 Carregando reembolsos...');

    if (!window.db) {
        console.error('[admin] ❌ db indisponível');
        return;
    }

    if (!auth.currentUser) {
        console.warn('[admin] ⚠️ Sem auth — abortando carga de reembolsos');
        return;
    }

    try {

        var snap = await db.collection('refunds').get();

        console.log('[admin] ✅ Refunds encontrados:', snap.size);

        window.__reembolsos = snap.docs.map(function (doc) {
            var d = doc.data();
            d.id = doc.id;
            d.data = d.data && d.data.toDate ? d.data.toDate() : (d.data || null);
            return d;
        });

        window.__reembolsos.sort(function (a, b) {
            var da = a.data ? new Date(a.data) : new Date(0);
            var db = b.data ? new Date(b.data) : new Date(0);
            return db - da;
        });

        var pendentes = window.__reembolsos.filter(function (r) { return r.status === 'pendente'; }).length;

        setText('navBadgeReembolsos', pendentes);
        atualizarBannerReembolsos(pendentes);
        renderizarReembolsos();

    } catch (e) {
        console.error('[admin] ❌ Erro reembolsos:', e.code, e.message);
    }
}


/* =========================================================
   💸 REEMBOLSOS — TEMPO REAL
   ========================================================= */
function escutarReembolsosRealtime() {

    console.log('[admin] 🔴 Listener reembolsos...');

    if (!window.db) return;

    if (!auth.currentUser) {
        console.warn('[admin] ⚠️ Sem auth — abortando listener reembolsos');
        return;
    }

    if (unsubscribeReembolsos) {
        try { unsubscribeReembolsos(); } catch (e) {}
        unsubscribeReembolsos = null;
    }

    function processar(snapshot) {

        window.__reembolsos = snapshot.docs.map(function (doc) {
            var d = doc.data();
            d.id = doc.id;
            d.data = d.data && d.data.toDate ? d.data.toDate() : (d.data || null);
            return d;
        });

        window.__reembolsos.sort(function (a, b) {
            var da = a.data ? new Date(a.data) : new Date(0);
            var db = b.data ? new Date(b.data) : new Date(0);
            return db - da;
        });

        var total = window.__reembolsos.length;
        var pendentes = window.__reembolsos.filter(function (r) { return r.status === 'pendente'; }).length;

        if (!primeiroSnapshotReembolso && total > ultimoReembolsoCount) {
            var novos = total - ultimoReembolsoCount;
            var maisNovo = window.__reembolsos[0];
            toast(
                '💸 ' + (novos === 1
                    ? 'Novo reembolso · Pedido #' + (maisNovo.orderNumero || '—') +
                      ' · ' + ((maisNovo.cliente && maisNovo.cliente.nome) || 'cliente')
                    : novos + ' novos reembolsos'),
                'warn'
            );
            tocarSomNotificacao();
        }

        ultimoReembolsoCount = total;
        primeiroSnapshotReembolso = false;

        setText('navBadgeReembolsos', pendentes);
        atualizarBannerReembolsos(pendentes);
        renderizarReembolsos();
    }

    try {
        unsubscribeReembolsos = db.collection('refunds')
            .orderBy('data', 'desc')
            .onSnapshot(processar, function (err) {
                console.warn('[admin] orderBy reembolsos falhou:', err.code || err);
                try {
                    if (unsubscribeReembolsos) unsubscribeReembolsos();
                    unsubscribeReembolsos = db.collection('refunds').onSnapshot(processar, function (err2) {
                        console.error('[admin] Listener fallback falhou:', err2.code);
                    });
                } catch (e2) {}
            });
    } catch (e) {
        try {
            unsubscribeReembolsos = db.collection('refunds').onSnapshot(processar);
        } catch (e2) {}
    }
}


function atualizarBannerReembolsos(pendentes) {
    var banner = document.getElementById('alertaReembolsos');
    var txt = document.getElementById('alertaReembolsosTexto');
    if (!banner) return;
    if (pendentes > 0) {
        banner.style.display = 'flex';
        if (txt) {
            txt.textContent = pendentes === 1
                ? '1 reembolso pendente'
                : pendentes + ' reembolsos pendentes';
        }
    } else {
        banner.style.display = 'none';
    }
}


/* =========================================================
   TABELA DE REEMBOLSOS
   ========================================================= */
function renderizarReembolsos() {

    var tbody = document.getElementById('reembolsosTable');
    if (!tbody) return;

    var lista = window.__reembolsos || [];

    var total = lista.length;
    var pendentes = lista.filter(function (r) { return r.status === 'pendente'; }).length;
    var totalValor = lista.reduce(function (s, r) {
        return s + (r.status !== 'negado' ? (r.valor || 0) : 0);
    }, 0);

    setText('kpiTotalReembolsos', total);
    setText('kpiReembolsosPendentes', pendentes);
    setText('kpiValorReembolsos', moeda(totalValor));

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:60px;color:#6b7685;">Nenhum reembolso solicitado.</td></tr>';
        return;
    }

    var html = '';

    for (var i = 0; i < lista.length; i++) {
        var r = lista[i];

        var dataStr = r.data
            ? new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '—';

        var badgeCls = {
            'pendente': 'badge-warn',
            'aprovado': 'badge-info',
            'pago':     'badge-success',
            'negado':   'badge-danger'
        }[r.status] || 'badge-muted';

        var labelStatus = {
            'pendente': 'Pendente',
            'aprovado': 'Aprovado',
            'pago':     'Pago',
            'negado':   'Negado'
        }[r.status] || r.status;

        var clienteNome = (r.cliente && r.cliente.nome) || '—';
        var clienteEmail = (r.cliente && r.cliente.email) || '';
        var inicial = clienteNome.charAt(0).toUpperCase();

        var origem = r.origem === 'cancelamento' || r.automatico
            ? ' <span class="badge badge-warn" style="margin-left:4px;">AUTO</span>'
            : '';

        var naoPago = r.pedidoPago === false
            ? ' <span class="badge badge-muted" style="margin-left:4px;">NÃO PAGO</span>'
            : '';

        var motivo = r.motivo
            ? escapeHtmlAdmin(r.motivo) + origem + naoPago
            : '<em style="color:#4a5566;">não informado</em>' + naoPago;

        html += '<tr>';
        html += '<td><strong>#' + (r.orderNumero || '—') + '</strong></td>';
        html += '<td>' +
            '<div class="cell-user">' +
                '<span class="avatar-sm">' + inicial + '</span>' +
                '<div>' +
                    '<strong>' + clienteNome + '</strong>' +
                    '<small>' + clienteEmail + '</small>' +
                '</div>' +
            '</div>' +
        '</td>';
        html += '<td><strong>' + moeda(r.valor || 0) + '</strong></td>';
        html += '<td style="max-width:220px;">' + motivo + '</td>';
        html += '<td><span class="badge ' + badgeCls + '">' + labelStatus + '</span></td>';
        html += '<td><small>' + dataStr + '</small></td>';
        html += '<td class="col-actions">' +
            '<button class="icon-btn-sm" onclick="abrirModalReembolso(\'' + r.id + '\')" title="Ver / Editar">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
                    '<circle cx="12" cy="12" r="3"/>' +
                '</svg>' +
            '</button>' +
        '</td>';
        html += '</tr>';
    }

    tbody.innerHTML = html;
}


/* =========================================================
   MODAL REEMBOLSO
   ========================================================= */
function abrirModalReembolso(refundId) {

    var r = (window.__reembolsos || []).find(function (x) { return x.id === refundId; });
    if (!r) { toast('Reembolso não encontrado', 'error'); return; }

    adminState.reembolsoAtual = r;

    var modal = document.getElementById('modalReembolso');
    if (!modal) return;

    setText('reembolsoModalNumero', '#' + (r.orderNumero || '0000'));
    setText('reembolsoModalData', r.data
        ? new Date(r.data).toLocaleString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : '—');

    var cli = r.cliente || {};
    document.getElementById('reembolsoModalCliente').innerHTML =
        infoItem('Nome', cli.nome) +
        infoItem('E-mail', cli.email) +
        infoItem('Telefone', cli.telefone);

    var motivoEl = document.getElementById('reembolsoModalMotivo');
    if (motivoEl) {
        var motivoTxt = r.motivo ? escapeHtmlAdmin(r.motivo) : '—';
        var detalhesTxt = r.detalhes ? escapeHtmlAdmin(r.detalhes) : '';
        var origemTxt = r.origem === 'cancelamento' || r.automatico
            ? '<span class="badge badge-warn" style="margin-left:8px;">Gerado automaticamente</span>'
            : '';
        var naoPagoTxt = r.pedidoPago === false
            ? '<span class="badge badge-muted" style="margin-left:8px;">Cliente ainda não pagou</span>'
            : '';

        motivoEl.innerHTML =
            '<div style="padding:16px;background:var(--surface-0);border:1px solid var(--border);border-radius:8px;">' +
                '<strong style="display:block;font-size:14px;color:var(--text-1);margin-bottom:6px;">' + motivoTxt + origemTxt + naoPagoTxt + '</strong>' +
                (detalhesTxt ? '<p style="font-size:13px;color:var(--text-2);line-height:1.6;margin:0;">' + detalhesTxt + '</p>' : '') +
            '</div>';
    }

    var itens = r.itens || [];
    var itensEl = document.getElementById('reembolsoModalItens');

    if (itens.length === 0) {
        itensEl.innerHTML = '<p style="color:#6b7685;font-size:13px;">Nenhum item registrado.</p>';
    } else {
        itensEl.innerHTML = itens.map(function (item) {
            return '<div class="order-item">' +
                '<img src="' + (item.imagem || '') + '" alt="">' +
                '<div>' +
                    '<strong>' + (item.nome || 'Produto') + '</strong>' +
                    '<small>' + (item.quantidade || 1) + 'x · ' + moeda(item.preco || 0) + '</small>' +
                '</div>' +
                '<strong>' + moeda((item.preco || 0) * (item.quantidade || 1)) + '</strong>' +
            '</div>';
        }).join('');
    }

    document.getElementById('reembolsoModalTotais').innerHTML =
        '<div class="order-total-row order-total-final">' +
            '<span>Valor do reembolso</span>' +
            '<strong>' + moeda(r.valor || 0) + '</strong>' +
        '</div>';

    var sel = document.getElementById('reembolsoModalStatus');
    if (sel) sel.value = r.status || 'pendente';

    var obs = document.getElementById('reembolsoModalObs');
    if (obs) obs.value = r.observacao || '';

    modal.classList.add('open');
}


function fecharModalReembolso() {
    var modal = document.getElementById('modalReembolso');
    if (modal) modal.classList.remove('open');
    adminState.reembolsoAtual = null;
}


async function salvarStatusReembolso() {

    var r = adminState.reembolsoAtual;
    if (!r) return;

    var novoStatus = getValue('reembolsoModalStatus');
    var obs = getValue('reembolsoModalObs');

    try {

        await db.collection('refunds').doc(r.id).update({
            status: novoStatus,
            observacao: obs || '',
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (r.orderId) {
            await db.collection('orders').doc(r.orderId).update({
                'reembolso.status': novoStatus,
                'reembolso.observacao': obs || ''
            });
        }

        toast('Status atualizado', 'success');

        /* 🔥 Dispara e-mail pro cliente com o novo status */
        if (typeof enviarEmailReembolso === 'function') {
            enviarEmailReembolso(r, novoStatus, obs)
                .then(function (res) {
                    console.log('[admin] E-mail reembolso:', res);
                })
                .catch(function (e) {
                    console.warn('[admin] Erro e-mail reembolso:', e);
                });
        }

        fecharModalReembolso();

    } catch (e) {
        console.error(e);
        toast('Erro ao atualizar', 'error');
    }
}


async function excluirReembolso() {

    var r = adminState.reembolsoAtual;
    if (!r) return;

    if (!confirm('Excluir esta solicitação de reembolso?')) return;

    try {
        await db.collection('refunds').doc(r.id).delete();
        toast('Reembolso excluído', 'success');
        fecharModalReembolso();
    } catch (e) {
        console.error(e);
        toast('Erro ao excluir', 'error');
    }
}


/* =========================================================
   NOTIFICAÇÕES (dropdown do topo)
   ========================================================= */
function atualizarNotificacoes(total) {

    setText('navBadgePedidos', total);

    var notifList = document.querySelector('.notif-list');
    var notifHead = document.querySelector('.dropdown-head span');
    var notifDot = document.querySelector('.notif-dot');

    if (!notifList) return;

    var pedidos = (window.__pedidos || []).slice(0, 5);
    var reembolsos = (window.__reembolsos || []).filter(function (r) {
        return r.status === 'pendente';
    }).slice(0, 3);

    var notifs = [];

    reembolsos.forEach(function (r) {
        notifs.push({
            tipo: 'refund',
            data: r.data,
            numero: r.orderNumero,
            nome: (r.cliente && r.cliente.nome) || '—',
            valor: r.valor || 0
        });
    });

    pedidos.forEach(function (p) {
        notifs.push({
            tipo: 'order',
            data: p.data,
            numero: p.numero,
            nome: (p.cliente && p.cliente.nome) || '—',
            valor: p.total || 0
        });
    });

    notifs.sort(function (a, b) {
        return new Date(b.data || 0) - new Date(a.data || 0);
    });

    notifs = notifs.slice(0, 6);

    if (notifs.length === 0) {
        notifList.innerHTML =
            '<li class="notif-item">' +
                '<span class="notif-icon info">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h14v18l-7-4-7 4V3z"/></svg>' +
                '</span>' +
                '<div><strong>Sem notificações</strong><small>Aguardando pedidos</small></div>' +
            '</li>';
        if (notifDot) notifDot.style.display = 'none';
        if (notifHead) notifHead.textContent = 'Tudo em ordem';
        return;
    }

    notifList.innerHTML = notifs.map(function (n) {

        if (n.tipo === 'refund') {
            return '<li class="notif-item unread" onclick="trocarSecao(\'reembolsos\')" style="cursor:pointer;">' +
                '<span class="notif-icon warn">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>' +
                    '</svg>' +
                '</span>' +
                '<div>' +
                    '<strong>💸 Reembolso #' + (n.numero || '—') + '</strong>' +
                    '<small>' + n.nome + ' · ' + moeda(n.valor) + '</small>' +
                    '<em>' + (n.data ? new Date(n.data).toLocaleDateString('pt-BR') : '') + '</em>' +
                '</div>' +
            '</li>';
        }

        return '<li class="notif-item" onclick="trocarSecao(\'pedidos\')" style="cursor:pointer;">' +
            '<span class="notif-icon info">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<path d="M5 3h14v18l-7-4-7 4V3z"/>' +
                '</svg>' +
            '</span>' +
            '<div>' +
                '<strong>Pedido #' + (n.numero || '—') + '</strong>' +
                '<small>' + n.nome + ' · ' + moeda(n.valor) + '</small>' +
                '<em>' + (n.data ? new Date(n.data).toLocaleDateString('pt-BR') : '') + '</em>' +
            '</div>' +
        '</li>';
    }).join('');

    var naoLidos = reembolsos.length + (window.__pedidos || []).filter(function (p) {
        return p.status === 'aguardando_pagamento' || p.status === 'pago';
    }).length;

    if (notifHead) {
        notifHead.textContent = naoLidos > 0
            ? naoLidos + ' ' + (naoLidos === 1 ? 'novo' : 'novos')
            : 'Tudo em ordem';
    }

    if (notifDot) {
        notifDot.style.display = naoLidos > 0 ? '' : 'none';
    }
}


function tocarSomNotificacao() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.15].forEach(function (delay, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = i === 0 ? 880 : 1100;
            var t = ctx.currentTime + delay;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    } catch (e) {}
}


/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
function trocarSecao(nome, silent) {

    adminState.section = nome;

    document.querySelectorAll('.page').forEach(function (p) {
        p.classList.toggle('active', p.dataset.section === nome);
    });

    document.querySelectorAll('.nav-item').forEach(function (b) {
        b.classList.toggle('active', b.dataset.section === nome);
    });

    var titulos = {
        dashboard: 'Dashboard',
        pedidos: 'Pedidos',
        produtos: 'Produtos',
        estoque: 'Estoque',
        clientes: 'Clientes',
        avaliacoes: 'Avaliações',
        reembolsos: 'Reembolsos',
        relatorios: 'Relatórios',
        config: 'Configurações'
    };

    var titulo = titulos[nome] || 'Painel';
    if (document.getElementById('pageTitle')) document.getElementById('pageTitle').textContent = titulo;
    if (document.getElementById('breadcrumbCurrent')) document.getElementById('breadcrumbCurrent').textContent = titulo;

    if (window.innerWidth < 1024) fecharSidebar();

    if (nome === 'avaliacoes') carregarAvaliacoesAdmin();

    if (nome === 'reembolsos' && window.__adminIniciado) {
        carregarReembolsosUmaVez();
    }
}

function alternarSidebar() {
    var s = document.getElementById('sidebar');
    var b = document.getElementById('sidebarBackdrop');
    if (s) s.classList.toggle('open');
    if (b) b.classList.toggle('active');
}

function fecharSidebar() {
    var s = document.getElementById('sidebar');
    var b = document.getElementById('sidebarBackdrop');
    if (s) s.classList.remove('open');
    if (b) b.classList.remove('active');
}

function alternarSidebarRecolhida() {
    var s = document.getElementById('sidebar');
    if (s) s.classList.toggle('collapsed');
}

function alternarDropdown(id) {
    var menu = document.getElementById(id);
    if (!menu) return;
    var aberto = menu.classList.contains('open');
    document.querySelectorAll('.dropdown-menu.open').forEach(function (m) {
        m.classList.remove('open');
    });
    if (!aberto) menu.classList.add('open');
}

function abrirBuscaGlobal() {
    document.getElementById('sidebarSearch')?.focus();
}

function obterPedidos() { return window.__pedidos || []; }
function obterProdutosAdmin() { return window.__catalogo || []; }


/* =========================================================
   DASHBOARD
   ========================================================= */
function renderizarDashboard() {

    var pedidos = obterPedidos();
    var produtos = obterProdutosAdmin();

    var faturamento = 0;
    for (var i = 0; i < pedidos.length; i++) {
        if (pedidos[i].status !== 'cancelado') faturamento += pedidos[i].total || 0;
    }

    var totalPedidos = pedidos.length;
    var ticket = totalPedidos > 0 ? faturamento / totalPedidos : 0;

    var ativos = 0;
    var itensTotal = 0;
    var baixo = 0;

    for (i = 0; i < produtos.length; i++) {
        var t = getTotalEstoque(produtos[i]);
        if (t > 0) ativos++;
        itensTotal += t;
        if (t > 0 && t <= 5) baixo++;
    }

    setText('kpiFaturamento', moeda(faturamento));
    setText('kpiPedidos', totalPedidos);
    setText('kpiTicket', moeda(ticket));
    setText('kpiProdutos', ativos);
    setText('kpiItensEstoque', itensTotal);
    setText('kpiBaixoEstoque', baixo);
    setText('navBadgePedidos', totalPedidos);

    renderizarPedidosRecentes();
    renderizarAtividade();
    desenharGraficoVendas();
}


function desenharGraficoVendas() {

    var svg    = document.querySelector('.chart-svg');
    var linha  = svg ? svg.querySelector('.chart-line') : null;
    var area   = svg ? svg.querySelector('.chart-area') : null;
    var axisX  = document.querySelector('.chart-axis-x');

    if (!linha || !area) return;

    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var dias = [];
    for (var i = 6; i >= 0; i--) {
        var d = new Date(hoje);
        d.setDate(d.getDate() - i);
        dias.push({ data: d, total: 0 });
    }

    var pedidos = obterPedidos();
    pedidos.forEach(function (p) {

        if (p.status === 'cancelado') return;
        if (!p.data) return;

        var d = new Date(p.data);
        d.setHours(0, 0, 0, 0);
        var t = d.getTime();

        for (var j = 0; j < dias.length; j++) {
            if (dias[j].data.getTime() === t) {
                dias[j].total += p.total || 0;
                break;
            }
        }
    });

    var max = 0;
    for (i = 0; i < dias.length; i++) {
        if (dias[i].total > max) max = dias[i].total;
    }
    if (max === 0) max = 1;

    var W = 800;
    var H = 240;
    var yTop = 40;
    var yBottom = 200;
    var alturaUtil = yBottom - yTop;

    var pontos = dias.map(function (d, idx) {
        var x = (idx / (dias.length - 1)) * W;
        var y = yBottom - ((d.total / max) * alturaUtil);
        return { x: x, y: y, total: d.total };
    });

    var pathLinha = '';
    pontos.forEach(function (p, idx) {
        pathLinha += (idx === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ';
    });

    var pathArea = pathLinha + 'L' + W + ' ' + H + ' L0 ' + H + ' Z';

    linha.setAttribute('d', pathLinha.trim());
    area.setAttribute('d', pathArea);

    linha.style.animation = 'none';
    void linha.offsetWidth;
    linha.style.animation = '';

    if (axisX) {
        var labels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        axisX.innerHTML = dias.map(function (d) {
            return '<span>' + labels[d.data.getDay()] + '</span>';
        }).join('');
    }
}


function renderizarPedidosRecentes() {

    var tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;

    var pedidos = obterPedidos().slice(0, 5);

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7685;">Nenhum pedido ainda.</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < pedidos.length; i++) {
        var p = pedidos[i];
        html += '<tr>';
        html += '<td><strong>#' + (p.numero || '—') + '</strong></td>';
        html += '<td>' + (p.cliente && p.cliente.nome ? p.cliente.nome : '—') + '</td>';
        html += '<td>' + (p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '—') + '</td>';
        html += '<td><strong>' + moeda(p.total || 0) + '</strong></td>';
        html += '<td>' + capitalizar(p.pagamento || '—') + '</td>';
        html += '<td>' + badgeStatusPedido(p.status) + '</td>';
        html += '<td><button class="icon-btn-sm" onclick="abrirModalPedido(\'' + p.id + '\')" title="Ver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function renderizarAtividade() {

    var ul = document.getElementById('activityList');
    if (!ul) return;

    var pedidos = obterPedidos().slice(0, 6);

    if (pedidos.length === 0) {
        ul.innerHTML = '<li class="activity-item"><span class="activity-dot muted"></span><div class="activity-content"><strong>Nenhuma atividade</strong><small>Aguardando pedidos</small></div></li>';
        return;
    }

    var html = '';
    for (var i = 0; i < pedidos.length; i++) {
        var p = pedidos[i];
        var dot = 'accent';
        if (p.status === 'pago' || p.status === 'preparando' || p.status === 'enviado' || p.status === 'entregue') dot = 'success';
        else if (p.status === 'cancelado') dot = 'warn';

        html += '<li class="activity-item">' +
            '<span class="activity-dot ' + dot + '"></span>' +
            '<div class="activity-content">' +
                '<strong>Pedido #' + (p.numero || '—') + '</strong>' +
                '<small>' + (p.cliente && p.cliente.nome ? p.cliente.nome : '—') + ' · ' + moeda(p.total || 0) + '</small>' +
            '</div>' +
            '<em>' + (p.data ? new Date(p.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '') + '</em>' +
        '</li>';
    }
    ul.innerHTML = html;
}


/* =========================================================
   PEDIDOS
   ========================================================= */
function renderizarPedidos() {

    var tbody = document.getElementById('ordersTableFull');
    if (!tbody) return;

    var pedidos = obterPedidos();

    if (adminState.ordersStatus) {
        pedidos = pedidos.filter(function (p) { return p.status === adminState.ordersStatus; });
    }

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7685;">Nenhum pedido ainda.</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < pedidos.length; i++) {
        var p = pedidos[i];
        html += '<tr>';
        html += '<td><strong>#' + (p.numero || '—') + '</strong></td>';
        html += '<td>' + (p.cliente && p.cliente.nome ? p.cliente.nome : '—') + '<br><small style="color:#6b7685;">' + ((p.cliente && p.cliente.email) || '') + '</small></td>';
        html += '<td>' + (p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '—') + '</td>';
        html += '<td><strong>' + moeda(p.total || 0) + '</strong></td>';
        html += '<td>' + capitalizar(p.pagamento || '—') + '</td>';
        html += '<td>' + badgeStatusPedido(p.status) + '</td>';
        html += '<td class="col-actions">';
        html += '<button class="icon-btn-sm" onclick="abrirModalPedido(\'' + p.id + '\')" title="Ver / Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
        html += '</td></tr>';
    }
    tbody.innerHTML = html;
}


function badgeStatusPedido(status) {

    var map = {
        'aguardando_pagamento': { label: 'Aguardando', cls: 'badge-warn' },
        'processando':          { label: 'Processando', cls: 'badge-info' },
        'pago':                 { label: 'Pago', cls: 'badge-success' },
        'preparando':           { label: 'Preparando', cls: 'badge-info' },
        'enviado':              { label: 'Em rota', cls: 'badge-info' },
        'entregue':             { label: 'Entregue', cls: 'badge-success' },
        'cancelado':            { label: 'Cancelado', cls: 'badge-danger' }
    };

    var info = map[status] || { label: status || '—', cls: 'badge-muted' };
    return '<span class="badge ' + info.cls + '">' + info.label + '</span>';
}


function abrirModalPedido(id) {

    var pedido = null;
    var pedidos = obterPedidos();

    for (var i = 0; i < pedidos.length; i++) {
        if (pedidos[i].id === id) { pedido = pedidos[i]; break; }
    }

    if (!pedido) { toast('Pedido não encontrado', 'error'); return; }

    adminState.pedidoAtual = pedido;

    var modal = document.getElementById('modalPedido');
    if (!modal) return;

    setText('pedidoModalNumero', '#' + (pedido.numero || '0000'));
    setText('pedidoModalData', pedido.data
        ? new Date(pedido.data).toLocaleString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : '—');

    var cliente = pedido.cliente || {};
    document.getElementById('pedidoModalCliente').innerHTML =
        infoItem('Nome', cliente.nome) +
        infoItem('E-mail', cliente.email) +
        infoItem('Telefone', cliente.telefone);

    var end = cliente.endereco || {};
    document.getElementById('pedidoModalEndereco').innerHTML =
        infoItem('CEP', end.cep) +
        infoItem('Endereço', (end.rua || '') + (end.numero ? ', ' + end.numero : '')) +
        infoItem('Complemento', end.complemento) +
        infoItem('Bairro', end.bairro) +
        infoItem('Cidade', (end.cidade || '') + (end.estado ? '/' + end.estado : ''));

    var itens = pedido.itens || [];
    var itensEl = document.getElementById('pedidoModalItens');

    if (itens.length === 0) {
        itensEl.innerHTML = '<p style="color:#6b7685;font-size:13px;">Nenhum item.</p>';
    } else {
        itensEl.innerHTML = itens.map(function (item) {
            return '<div class="order-item">' +
                '<img src="' + (item.imagem || '') + '" alt="">' +
                '<div>' +
                    '<strong>' + (item.nome || 'Produto') + '</strong>' +
                    '<small>' + (item.quantidade || 1) + 'x · ' + moeda(item.preco || 0) + '</small>' +
                '</div>' +
                '<strong>' + moeda((item.preco || 0) * (item.quantidade || 1)) + '</strong>' +
            '</div>';
        }).join('');
    }

    var subtotal = pedido.subtotal || itens.reduce(function (s, i) {
        return s + (i.preco || 0) * (i.quantidade || 1);
    }, 0);

    var frete = 24.90;
    if (pedido.frete === 'gratis') frete = 0;
    else if (pedido.frete === 'sedex') frete = 39.90;

    document.getElementById('pedidoModalTotais').innerHTML =
        '<div class="order-total-row"><span>Subtotal</span><strong>' + moeda(subtotal) + '</strong></div>' +
        '<div class="order-total-row"><span>Frete</span><strong>' + (frete === 0 ? 'Grátis' : moeda(frete)) + '</strong></div>' +
        '<div class="order-total-row order-total-final"><span>Total</span><strong>' + moeda(pedido.total || 0) + '</strong></div>';

    var sel = document.getElementById('pedidoModalStatus');
    if (sel) sel.value = pedido.status || 'processando';

    modal.classList.add('open');
}


function infoItem(label, valor) {
    if (!valor) return '';
    return '<div><span>' + label + '</span><strong>' + valor + '</strong></div>';
}

function fecharModalPedido() {
    var modal = document.getElementById('modalPedido');
    if (modal) modal.classList.remove('open');
    adminState.pedidoAtual = null;
}

async function salvarStatusPedido() {

    var pedido = adminState.pedidoAtual;
    if (!pedido) { toast('Nenhum pedido selecionado', 'error'); return; }
    if (!pedido.id) { toast('Pedido sem ID', 'error'); return; }

    var novoStatus = getValue('pedidoModalStatus');

    try {
        await atualizarStatusPedidoFirebase(pedido.id, novoStatus);
        toast('Status atualizado', 'success');

        if (typeof enviarEmailMudancaStatus === 'function') {
            enviarEmailMudancaStatus(pedido, novoStatus).catch(function (e) {
                console.warn('[admin] Erro e-mail:', e);
            });
        }

        fecharModalPedido();
    } catch (e) {
        console.error('[admin] Erro:', e);
        toast('Erro ao atualizar', 'error');
    }
}

async function excluirPedido() {
    var pedido = adminState.pedidoAtual;
    if (!pedido) return;
    if (!confirm('Excluir o pedido #' + (pedido.numero || '—') + '?')) return;
    try {
        await excluirPedidoFirebase(pedido.id);
        toast('Pedido excluído', 'success');
        fecharModalPedido();
    } catch (e) {
        toast('Erro ao excluir', 'error');
    }
}


/* =========================================================
   PRODUTOS
   ========================================================= */
function renderizarProdutosTabela() {

    var tbody = document.getElementById('productsTable');
    if (!tbody) return;

    var lista = obterProdutosAdmin();
    var i;

    if (adminState.searchTerm) {
        var termo = adminState.searchTerm;
        lista = lista.filter(function (p) {
            return (p.nome || '').toLowerCase().indexOf(termo) !== -1
                || (p.id || '').toLowerCase().indexOf(termo) !== -1;
        });
    }

    if (adminState.filterCategory) {
        var f1 = [];
        for (i = 0; i < lista.length; i++) {
            if (lista[i].categoria === adminState.filterCategory) f1.push(lista[i]);
        }
        lista = f1;
    }

    if (adminState.filterStock === 'ativo') {
        var f2 = [];
        for (i = 0; i < lista.length; i++) {
            if (estaDisponivel(lista[i])) f2.push(lista[i]);
        }
        lista = f2;
    } else if (adminState.filterStock === 'esgotado') {
        var f3 = [];
        for (i = 0; i < lista.length; i++) {
            if (!estaDisponivel(lista[i])) f3.push(lista[i]);
        }
        lista = f3;
    } else if (adminState.filterStock === 'baixo') {
        var f4 = [];
        for (i = 0; i < lista.length; i++) {
            var t = getTotalEstoque(lista[i]);
            if (t > 0 && t <= 5) f4.push(lista[i]);
        }
        lista = f4;
    }

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7685;">Nenhum produto encontrado.</td></tr>';
        atualizarFootProdutos(0);
        return;
    }

    var html = '';
    for (i = 0; i < lista.length; i++) {
        var p = lista[i];
        var total = getTotalEstoque(p);
        var nivel = nivelEstoque(total);

        var badgeStatus = '<span class="badge badge-muted">Padrão</span>';
        if (p.badge === 'novo') badgeStatus = '<span class="badge badge-info">Novo</span>';
        if (p.badge === 'sale') badgeStatus = '<span class="badge badge-danger">Promoção</span>';

        html += '<tr>';
        html += '<td class="col-check"><input type="checkbox"></td>';
        html += '<td><div class="cell-product"><img src="' + p.imagem + '" alt=""><div><strong>' + p.nome + '</strong><small>' + p.id + '</small></div></div></td>';
        html += '<td>' + capitalizar(p.categoria) + '</td>';
        html += '<td><strong>' + moeda(p.preco) + '</strong></td>';
        html += '<td><span class="qty-value ' + nivel + '">' + total + ' un.</span></td>';
        html += '<td>' + badgeStatus + '</td>';
        html += '<td class="col-actions">';
        html += '<div class="row-actions">';
        html += '<button class="icon-btn-sm" onclick="editarProduto(\'' + p.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>';
        html += '<button class="icon-btn-sm btn-remove" onclick="excluirProduto(\'' + p.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>';
        html += '</div></td></tr>';
    }

    tbody.innerHTML = html;
    atualizarFootProdutos(lista.length);
}

function atualizarFootProdutos(total) {
    var el = document.querySelector('#productsFoot .table-count');
    if (el) el.textContent = total === 1 ? '1 produto' : total + ' produtos';
}


/* =========================================================
   ESTOQUE
   ========================================================= */
function renderizarEstoque() {

    var container = document.getElementById('estoqueLista');
    if (!container) return;

    var produtos = obterProdutosAdmin();

    if (produtos.length === 0) {
        container.innerHTML = '<div class="estoque-vazio">Nenhum produto cadastrado.</div>';
        return;
    }

    var i;
    var baixoQtd = 0;
    for (i = 0; i < produtos.length; i++) {
        var t = getTotalEstoque(produtos[i]);
        if (t > 0 && t <= 5) baixoQtd++;
    }

    var html = '';

    if (baixoQtd > 0) {
        html += '<div class="estoque-aviso-total warn">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
        html += '<span><strong>' + baixoQtd + ' produto' + (baixoQtd === 1 ? '' : 's') + '</strong> com estoque baixo (5 ou menos)</span>';
        html += '</div>';
    }

    html += '<div class="estoque-page">';
    for (i = 0; i < produtos.length; i++) {
        html += renderizarEstoqueProduto(produtos[i]);
    }
    html += '</div>';

    container.innerHTML = html;
}


function renderizarEstoqueProduto(produto) {

    var total = getTotalEstoque(produto);
    var nivel = nivelEstoque(total);
    var temTamanhos = temGrade(produto);

    var html = '<div class="estoque-produto">';

    html += '<div class="estoque-produto-head">';
    html += '<img src="' + produto.imagem + '" alt="">';
    html += '<div>';
    html += '<strong>' + produto.nome + '</strong>';
    html += '<small>' + capitalizar(produto.categoria) + ' · ' + moeda(produto.preco) + '</small>';
    html += '</div>';
    html += '<span class="estoque-total ' + nivel + '">' + total + ' un. total</span>';
    html += '</div>';

    html += '<div class="estoque-tamanhos">';

    if (temTamanhos) {
        for (var j = 0; j < produto.tamanhos.length; j++) {
            var tam = produto.tamanhos[j];
            var qtd = getQtdTamanho(produto, tam);

            html += '<div class="estoque-tamanho">';
            html += '<span class="estoque-tamanho-label">' + tam + '</span>';
            html += '<div class="estoque-tamanho-controls">';
            html += '<button onclick="alterarQtdTamanho(\'' + produto.id + '\', \'' + tam + '\', -1)">−</button>';
            html += '<input type="number" class="estoque-tamanho-input" value="' + qtd + '" min="0" max="9999" onchange="definirQtdTamanho(\'' + produto.id + '\', \'' + tam + '\', this.value)">';
            html += '<button onclick="alterarQtdTamanho(\'' + produto.id + '\', \'' + tam + '\', 1)">+</button>';
            html += '</div>';
            html += '</div>';
        }
    } else {
        var qtd = total;
        html += '<div class="estoque-tamanho">';
        html += '<span class="estoque-tamanho-label">ÚNICO</span>';
        html += '<div class="estoque-tamanho-controls">';
        html += '<button onclick="alterarQtdUnico(\'' + produto.id + '\', -1)">−</button>';
        html += '<input type="number" class="estoque-tamanho-input" value="' + qtd + '" min="0" max="9999" onchange="definirQtdUnico(\'' + produto.id + '\', this.value)">';
        html += '<button onclick="alterarQtdUnico(\'' + produto.id + '\', 1)">+</button>';
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    return html;
}


/* =========================================================
   REPOR TUDO
   ========================================================= */
async function reporTudo(qtd) {

    qtd = parseInt(qtd, 10) || 10;

    var produtos = obterProdutosAdmin();
    var semEstoque = produtos.filter(function (p) { return getTotalEstoque(p) === 0; });

    if (semEstoque.length === 0) {
        toast('Todos os produtos já têm estoque', 'info');
        return;
    }

    if (!confirm('Definir ' + qtd + ' unidades em ' + semEstoque.length + ' produto(s) sem estoque?')) return;

    try {
        for (var i = 0; i < semEstoque.length; i++) {
            var p = semEstoque[i];
            if (temGrade(p)) {
                var est = {};
                p.tamanhos.forEach(function (t) { est[t] = qtd; });
                await salvarProdutoFirebase({ id: p.id, estoqueTamanhos: est, estoque: true });
            } else {
                await salvarProdutoFirebase({ id: p.id, quantidade: qtd, estoque: true });
            }
        }

        await carregarCatalogo();
        renderizarProdutosTabela();
        renderizarEstoque();
        renderizarDashboard();

        toast('Estoque reposto em ' + semEstoque.length + ' produto(s)', 'success');
    } catch (e) {
        console.error(e);
        toast('Erro ao repor estoque', 'error');
    }
}


/* =========================================================
   AÇÕES DE ESTOQUE
   ========================================================= */
async function alterarQtdTamanho(produtoId, tamanho, delta) {
    var produto = buscarProduto(produtoId);
    if (!produto) return;
    var atual = getQtdTamanho(produto, tamanho);
    var nova = atual + delta;
    if (nova < 0) nova = 0;
    if (nova > 9999) nova = 9999;
    await aplicarQtdTamanho(produtoId, tamanho, nova);
}

async function definirQtdTamanho(produtoId, tamanho, valor) {
    valor = parseInt(valor, 10);
    if (isNaN(valor) || valor < 0) valor = 0;
    if (valor > 9999) valor = 9999;
    await aplicarQtdTamanho(produtoId, tamanho, valor);
}

async function aplicarQtdTamanho(produtoId, tamanho, qtd) {
    var produto = buscarProduto(produtoId);
    if (!produto) return;

    var estoque = {};
    for (var t in getEstoqueTamanhos(produto)) {
        estoque[t] = getEstoqueTamanhos(produto)[t];
    }
    estoque[tamanho] = qtd;

    var total = 0;
    for (var k in estoque) total += estoque[k];

    try {
        await salvarProdutoFirebase({ id: produtoId, estoqueTamanhos: estoque, estoque: total > 0 });
        await carregarCatalogo();
        renderizarEstoque();
        renderizarProdutosTabela();
        renderizarDashboard();
    } catch (e) {
        console.error(e);
        toast('Erro ao atualizar', 'error');
    }
}

async function alterarQtdUnico(produtoId, delta) {
    var produto = buscarProduto(produtoId);
    if (!produto) return;
    var atual = getTotalEstoque(produto);
    var nova = atual + delta;
    if (nova < 0) nova = 0;
    await definirQtdUnico(produtoId, nova);
}

async function definirQtdUnico(produtoId, valor) {
    valor = parseInt(valor, 10);
    if (isNaN(valor) || valor < 0) valor = 0;
    if (valor > 9999) valor = 9999;

    try {
        await salvarProdutoFirebase({ id: produtoId, quantidade: valor, estoque: valor > 0 });
        await carregarCatalogo();
        renderizarEstoque();
        renderizarProdutosTabela();
        renderizarDashboard();
    } catch (e) {
        toast('Erro ao atualizar', 'error');
    }
}

function buscarProduto(id) {
    var produtos = obterProdutosAdmin();
    for (var i = 0; i < produtos.length; i++) {
        if (produtos[i].id === id) return produtos[i];
    }
    return null;
}


/* =========================================================
   CLIENTES
   ========================================================= */
function renderizarClientes() {

    var tbody = document.getElementById('clientesTable');
    if (!tbody) return;

    var pedidos = obterPedidos();
    var map = {};

    for (var i = 0; i < pedidos.length; i++) {
        var p = pedidos[i];
        var email = p.cliente && p.cliente.email;
        if (!email) continue;
        if (!map[email]) {
            map[email] = {
                nome: p.cliente.nome || '—',
                email: email,
                telefone: p.cliente.telefone || '',
                pedidos: 0,
                total: 0,
                ultimo: p.data
            };
        }
        map[email].pedidos++;
        map[email].total += p.total || 0;
        if (p.data && (!map[email].ultimo || new Date(p.data) > new Date(map[email].ultimo))) {
            map[email].ultimo = p.data;
        }
    }

    var clientes = [];
    for (var k in map) clientes.push(map[k]);
    clientes.sort(function (a, b) { return b.total - a.total; });

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:60px;color:#6b7685;">Nenhum cliente ainda.</td></tr>';
        return;
    }

    var html = '';
    for (i = 0; i < clientes.length; i++) {
        var c = clientes[i];
        var ultimo = c.ultimo ? new Date(c.ultimo).toLocaleDateString('pt-BR') : '—';
        html += '<tr><td>' + c.nome + '<br><small style="color:#6b7685;">' + c.email + '</small></td><td>' + c.telefone + '</td><td>' + c.pedidos + '</td><td><strong>' + moeda(c.total) + '</strong></td><td>' + ultimo + '</td></tr>';
    }
    tbody.innerHTML = html;
}


/* =========================================================
   RELATÓRIOS
   ========================================================= */
function renderizarRelatorios() {
    var pedidos = obterPedidos();
    var total = 0;
    for (var i = 0; i < pedidos.length; i++) {
        if (pedidos[i].status !== 'cancelado') total += pedidos[i].total || 0;
    }
    setText('relatorioTotalPedidos', pedidos.length);
    setText('relatorioTotalFaturado', moeda(total));
}


/* =========================================================
   AVALIAÇÕES
   ========================================================= */
window.__avaliacoesAdmin = [];

async function carregarAvaliacoesAdmin() {

    var tbody = document.getElementById('avaliacoesTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#6b7685;">Carregando...</td></tr>';

    try {
        var snap = await db.collection('reviews').get();

        window.__avaliacoesAdmin = snap.docs.map(function (doc) {
            var d = doc.data();
            d.id = doc.id;
            d.data = d.data && d.data.toDate ? d.data.toDate() : (d.data || null);
            return d;
        });

        window.__avaliacoesAdmin.sort(function (a, b) {
            return new Date(b.data) - new Date(a.data);
        });

        renderizarAvaliacoes();

    } catch (e) {
        console.error('[admin] Erro avaliações:', e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Erro ao carregar.</td></tr>';
    }
}


function renderizarAvaliacoes() {

    var tbody = document.getElementById('avaliacoesTable');
    if (!tbody) return;

    var todas = window.__avaliacoesAdmin || [];
    var filtroNota = getValue('filtroAvaliacoesNota');

    var lista = todas;
    if (filtroNota) {
        lista = todas.filter(function (a) { return String(a.nota) === String(filtroNota); });
    }

    var total = todas.length;
    var soma = todas.reduce(function (acc, a) { return acc + (a.nota || 0); }, 0);
    var media = total > 0 ? (soma / total) : 0;
    var cinco = todas.filter(function (a) { return a.nota === 5; }).length;

    setText('kpiTotalAvaliacoes', total);
    setText('kpiMediaAvaliacoes', total > 0 ? media.toFixed(1) : '—');
    setText('kpiCincoEstrelas', cinco);
    setText('navBadgeAvaliacoes', total);

    if (lista.length === 0) {
        var msg = total === 0 ? 'Nenhuma avaliação ainda.' : 'Nenhuma avaliação com essa nota.';
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#6b7685;">' + msg + '</td></tr>';
        var foot = document.querySelector('#avaliacoesFoot .table-count');
        if (foot) foot.textContent = '0 avaliações';
        return;
    }

    var html = '';
    for (var i = 0; i < lista.length; i++) {
        var a = lista[i];
        var produto = buscarProduto(a.produtoId);
        var nomeProduto = produto ? produto.nome : (a.produtoId || '—');

        var data = a.data
            ? new Date(a.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '—';

        var estrelas = '';
        for (var s = 1; s <= 5; s++) {
            estrelas += s <= a.nota
                ? '<span style="color:#f59e0b;">★</span>'
                : '<span style="color:#2d3748;">★</span>';
        }

        var comentario = a.comentario
            ? escapeHtmlAdmin(a.comentario).slice(0, 80) + (a.comentario.length > 80 ? '…' : '')
            : '<em style="color:#4a5566;">sem comentário</em>';

        var inicial = (a.userNome || 'C').charAt(0).toUpperCase();

        html += '<tr>';
        html += '<td><div class="cell-user"><span class="avatar-sm">' + inicial + '</span><div><strong>' + escapeHtmlAdmin(nomeProduto) + '</strong><small>' + (a.produtoId || '') + '</small></div></div></td>';
        html += '<td><div><strong>' + escapeHtmlAdmin(a.userNome || 'Cliente') + '</strong><br><small style="color:#6b7685;">' + escapeHtmlAdmin(a.userEmail || '') + '</small></div></td>';
        html += '<td><span style="font-size:1rem;letter-spacing:2px;">' + estrelas + '</span><br><small style="color:#6b7685;">' + (a.nota || 0) + '/5</small></td>';
        html += '<td style="max-width:320px;">' + comentario + '</td>';
        html += '<td><small>' + data + '</small></td>';
        html += '<td class="col-actions"><button class="icon-btn-sm btn-remove" onclick="excluirAvaliacaoAdmin(\'' + a.id + '\')" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button></td>';
        html += '</tr>';
    }

    tbody.innerHTML = html;

    var foot = document.querySelector('#avaliacoesFoot .table-count');
    if (foot) foot.textContent = lista.length === 1 ? '1 avaliação' : lista.length + ' avaliações';
}


async function excluirAvaliacaoAdmin(id) {
    if (!confirm('Excluir esta avaliação?')) return;
    try {
        await db.collection('reviews').doc(id).delete();
        window.__avaliacoesAdmin = (window.__avaliacoesAdmin || []).filter(function (a) { return a.id !== id; });
        renderizarAvaliacoes();
        toast('Avaliação excluída', 'success');
    } catch (e) {
        console.error(e);
        toast('Erro ao excluir', 'error');
    }
}


function escapeHtmlAdmin(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* =========================================================
   CONFIG — ✅ AJUSTADO (default com espaço + sanitização ao salvar)
   ========================================================= */
function carregarConfig() {
    var cfg = window.__config || {};
    setValue('configPixChave', cfg.pixChave || '');
    setValue('configPixNome', cfg.pixNome || 'SEYN CLOTHING');      
    setValue('configPixCidade', cfg.pixCidade || 'SAO PAULO');
}

/* Limpa texto pra ficar compatível com BR Code (sem acento, sem ç) */
function limparTextoBrCode(str) {
    return String(str || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  
        .replace(/ç/gi, 'c')                                
        .replace(/Ç/g, 'C')
        .replace(/[^A-Za-z0-9 ]/g, '')                     
        .replace(/\s+/g, ' ')                               
        .trim();
}

async function salvarConfiguracoes() {

    var chaveBruta = String(getValue('configPixChave') || '').trim();
    var nomeBruto  = String(getValue('configPixNome')  || '').trim();
    var cidadeBruta = String(getValue('configPixCidade') || '').trim();

    var chaveLimpa = chaveBruta;
    if (/[\.\-\/]/.test(chaveBruta)) {
        chaveLimpa = chaveBruta.replace(/\D/g, '');
    }

    var cfg = {
        pixChave: chaveLimpa,
        pixNome: limparTextoBrCode(nomeBruto).slice(0, 25),
        pixCidade: limparTextoBrCode(cidadeBruta).slice(0, 15)
    };

    if (cfg.pixNome !== nomeBruto || cfg.pixCidade !== cidadeBruta || cfg.pixChave !== chaveBruta) {
        console.log('[admin] ⚠️ Valores foram sanitizados:');
        console.log('  Nome:', nomeBruto, '→', cfg.pixNome);
        console.log('  Cidade:', cidadeBruta, '→', cfg.pixCidade);
        console.log('  Chave:', chaveBruta, '→', cfg.pixChave);
    }

    try {
        await salvarConfigFirebase(cfg);

        window.__config = Object.assign({}, window.__config || {}, cfg);

        setValue('configPixChave', cfg.pixChave);
        setValue('configPixNome', cfg.pixNome);
        setValue('configPixCidade', cfg.pixCidade);

        toast('Configurações salvas', 'success');
    } catch (e) {
        console.error('[admin] Erro ao salvar config:', e);
        toast('Erro ao salvar', 'error');
    }
}


/* =========================================================
   MODAL PRODUTO
   ========================================================= */
function abrirModalProduto(produto) {

    var modal = document.getElementById('modalProduto');
    var form = document.getElementById('formProduto');
    if (!modal || !form) return;

    form.reset();
    adminState.editingId = null;

    setText('modalProdutoTitle', produto ? 'Editar produto' : 'Novo produto');

    if (produto) {
        adminState.editingId = produto.id;
        setValue('produtoId', produto.id);
        setValue('fNome', produto.nome);
        setValue('fCategoria', produto.categoria);
        setValue('fGenero', produto.genero || 'unissex'); /* ✅ GÊNERO CARREGADO AQUI */
        setValue('fBadge', produto.badge || '');
        setValue('fDescricao', produto.descricao);
        setValue('fPreco', produto.preco);
        setValue('fPrecoAntigo', produto.precoAntigo || '');
        setValue('fImagem', produto.imagem);
        setValue('fImagemAlt', produto.imagemAlt || '');
        setValue('fTamanhos', (produto.tamanhos || []).join(', '));
    }

    modal.classList.add('open');
}

function fecharModalProduto() {
    document.getElementById('modalProduto')?.classList.remove('open');
    adminState.editingId = null;
}

function editarProduto(id) {
    var p = buscarProduto(id);
    if (p) abrirModalProduto(p);
}

async function excluirProduto(id) {
    if (!confirm('Excluir produto?')) return;
    try {
        await excluirProdutoFirebase(id);
        await carregarCatalogo();
        renderizarProdutosTabela();
        renderizarEstoque();
        renderizarDashboard();
        toast('Produto excluído', 'success');
    } catch (e) {
        toast('Erro ao excluir', 'error');
    }
}

async function salvarProduto(e) {

    e.preventDefault();

    var tamanhosStr = getValue('fTamanhos');
    var tamanhos = tamanhosStr
        ? tamanhosStr.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t; })
        : ['Único'];

    var precoAntigo = parseFloat(getValue('fPrecoAntigo'));

    var dados = {
        nome: getValue('fNome'),
        categoria: getValue('fCategoria'),
        genero: getValue('fGenero') || 'unissex', /* ✅ GÊNERO SENDO SALVO AQUI */
        badge: getValue('fBadge') || null,
        descricao: getValue('fDescricao'),
        preco: parseFloat(getValue('fPreco')),
        precoAntigo: isNaN(precoAntigo) ? null : precoAntigo,
        imagem: getValue('fImagem'),
        imagemAlt: getValue('fImagemAlt') || '',
        tamanhos: tamanhos,
        estoque: true
    };

    if (!dados.nome || !dados.categoria || !dados.preco || !dados.imagem) {
        toast('Preencha os campos obrigatórios', 'error');
        return;
    }

    try {
        if (adminState.editingId) {
            dados.id = adminState.editingId;
        }
        await salvarProdutoFirebase(dados);
        await carregarCatalogo();
        fecharModalProduto();
        renderizarProdutosTabela();
        renderizarEstoque();
        renderizarDashboard();
        toast('Produto salvo', 'success');
    } catch (e) {
        console.error(e);
        toast('Erro ao salvar', 'error');
    }
}


/* =========================================================
   TOAST + UTILS
   ========================================================= */
function toast(msg, tipo) {
    var stack = document.getElementById('toastStack');
    if (!stack) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (tipo || 'info');
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 300);
    }, 4000);
}

function moeda(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function setText(id, valor) { var el = document.getElementById(id); if (el) el.textContent = valor; }
function setValue(id, valor) { var el = document.getElementById(id); if (el) el.value = valor; }
function getValue(id) { var el = document.getElementById(id); return el ? el.value : ''; }
function capitalizar(str) { if (!str) return ''; return str.split('-').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' '); }

window.trocarSecao = trocarSecao;
window.alternarSidebar = alternarSidebar;
window.fecharSidebar = fecharSidebar;
window.alternarSidebarRecolhida = alternarSidebarRecolhida;
window.alternarDropdown = alternarDropdown;
window.abrirBuscaGlobal = abrirBuscaGlobal;
window.abrirModalProduto = abrirModalProduto;
window.fecharModalProduto = fecharModalProduto;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.alterarQtdTamanho = alterarQtdTamanho;
window.definirQtdTamanho = definirQtdTamanho;
window.alterarQtdUnico = alterarQtdUnico;
window.definirQtdUnico = definirQtdUnico;
window.reporTudo = reporTudo;
window.salvarConfiguracoes = salvarConfiguracoes;
window.renderizarDashboard = renderizarDashboard;
window.obterPedidos = obterPedidos;
window.toast = toast;

window.carregarAvaliacoesAdmin = carregarAvaliacoesAdmin;
window.renderizarAvaliacoes = renderizarAvaliacoes;
window.excluirAvaliacaoAdmin = excluirAvaliacaoAdmin;

window.abrirModalPedido = abrirModalPedido;
window.fecharModalPedido = fecharModalPedido;
window.salvarStatusPedido = salvarStatusPedido;
window.excluirPedido = excluirPedido;

window.renderizarReembolsos = renderizarReembolsos;
window.escutarReembolsosRealtime = escutarReembolsosRealtime;
window.carregarReembolsosUmaVez = carregarReembolsosUmaVez;
window.abrirModalReembolso = abrirModalReembolso;
window.fecharModalReembolso = fecharModalReembolso;
window.salvarStatusReembolso = salvarStatusReembolso;
window.excluirReembolso = excluirReembolso;

window.iniciarPainel = iniciarPainel;