/* =========================================================
   EMAIL.JS — Notificações por e-mail (EmailJS)
   ========================================================= */

'use strict';

const EMAILJS_CONFIG = {
    publicKey: 'EIBy3OPd6ECXedKsS',
    serviceId: 'service_00vd97h',
    templateId: 'template_4x1y0b8',
    templateIdAdmin: 'template_4x1y0b8',
    adminEmail: 'seyn.clothing@gmail.com'
};


(function initEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.warn('[email] EmailJS SDK não carregado');
        return;
    }
    try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('[email] ✅ EmailJS pronto');
        console.log('[email] templateId:', EMAILJS_CONFIG.templateId);
        console.log('[email] templateIdAdmin:', EMAILJS_CONFIG.templateIdAdmin);
    } catch (e) {
        console.error('[email] Erro ao inicializar:', e);
    }
})();


function formatarMoedaEmail(v) {
    return Number(v || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


function montarEnderecoCompleto(clienteOuEndereco) {
    if (!clienteOuEndereco) return 'Endereço não informado';

    var e = clienteOuEndereco.endereco || clienteOuEndereco;
    if (!e || typeof e !== 'object') return 'Endereço não informado';

    var linha1 = '';
    if (e.rua) {
        linha1 = e.rua;
        if (e.numero) linha1 += ', ' + e.numero;
        if (e.complemento) linha1 += ' - ' + e.complemento;
    }

    var linha2 = e.bairro || '';

    var linha3 = '';
    if (e.cidade) linha3 = e.cidade;
    if (e.estado) linha3 += (linha3 ? ' - ' : '') + e.estado;

    var linha4 = e.cep ? 'CEP ' + e.cep : '';

    var linhas = [linha1, linha2, linha3, linha4].filter(function (l) {
        return l && String(l).trim();
    });

    if (linhas.length === 0) return 'Endereço não informado';

    return linhas.join('<br>');
}


async function buscarPedidoOriginal(refund) {
    if (!refund || !refund.orderId) return null;
    if (!window.db) return null;

    try {
        var doc = await window.db.collection('orders').doc(refund.orderId).get();
        if (!doc.exists) return null;
        return doc.data();
    } catch (e) {
        console.warn('[email] Não deu pra buscar pedido original:', e);
        return null;
    }
}


function gerarItensHTML(itens) {
    if (!itens || itens.length === 0) return '';

    var linhas = itens.map(function (item) {
        var codigo = item.id || item.codigo || item.sku || '—';
        var nome = item.nome || 'Produto';
        var qtd = item.quantidade || 1;
        var preco = Number(item.preco || 0);
        var subtotal = preco * qtd;
        var imagem = item.imagem || '';
        var altTexto = String(nome).replace(/"/g, '&quot;');

        return '<tr>' +
            '<td style="padding:14px 12px 14px 0; border-bottom:1px solid #1a212c; width:60px; vertical-align:top;">' +
                (imagem
                    ? '<img src="' + imagem + '" alt="' + altTexto + '" width="50" height="62" ' +
                      'style="display:block; width:50px; height:62px; object-fit:cover; ' +
                      'border-radius:6px; border:1px solid #1a212c; background:#0b1120;">'
                    : '<div style="width:50px; height:62px; background:#0b1120; border:1px solid #1a212c; border-radius:6px;"></div>') +
            '</td>' +
            '<td style="padding:14px 12px; border-bottom:1px solid #1a212c; vertical-align:top;">' +
                '<p style="margin:0 0 2px; font-family:Arial,sans-serif; font-size:9px; letter-spacing:2px; color:#5d6b83; text-transform:uppercase;">CÓD ' + codigo + '</p>' +
                '<p style="margin:0 0 4px; font-family:Arial,sans-serif; font-size:14px; font-weight:600; color:#f5f7ff; line-height:1.3;">' + nome + '</p>' +
                '<p style="margin:0; font-family:Arial,sans-serif; font-size:12px; color:#5d6b83;">' + qtd + 'x · R$ ' + preco.toFixed(2).replace('.', ',') + '</p>' +
            '</td>' +
            '<td style="padding:14px 0 14px 12px; border-bottom:1px solid #1a212c; text-align:right; vertical-align:top; white-space:nowrap;">' +
                '<p style="margin:0; font-family:Georgia,serif; font-style:italic; font-size:15px; font-weight:700; color:#7fb0ff;">' +
                    'R$ ' + subtotal.toFixed(2).replace('.', ',') +
                '</p>' +
            '</td>' +
        '</tr>';
    }).join('');

    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
        linhas +
    '</table>';
}


/* Log unificado de erro */
function logErroEmailJS(contexto, e) {
    console.error('[email] ❌ Erro ' + contexto + ':');
    if (e) {
        console.error('  → status:', e.status);
        console.error('  → text:', e.text);
        console.error('  → message:', e.message);
        console.error('  → templateId usado:', EMAILJS_CONFIG.templateId);
        console.error('  → templateIdAdmin usado:', EMAILJS_CONFIG.templateIdAdmin);
    }
}


const STATUS_EMAIL = {
    'aguardando_pagamento': { emoji: '⏳', titulo: 'Pedido recebido',          mensagem: 'Recebemos seu pedido! Assim que o pagamento for confirmado, começamos a preparar tudo com cuidado.', botao_texto: 'Acompanhar pedido',   botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
    'pago':                 { emoji: '💰', titulo: 'Pagamento confirmado',     mensagem: 'Confirmamos o recebimento do seu pagamento! Seu pedido já entrou na fila de separação.',                botao_texto: 'Acompanhar pedido',   botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
    'processando':          { emoji: '📝', titulo: 'Pedido em processamento',  mensagem: 'Estamos processando seu pedido. Em breve ele será preparado para envio.',                              botao_texto: 'Acompanhar pedido',   botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
    'preparando':           { emoji: '📦', titulo: 'Preparando seu pedido',    mensagem: 'Boas notícias! Seu pedido já entrou na fila de separação e está sendo embalado com cuidado.',          botao_texto: 'Acompanhar pedido',   botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
    'enviado':              { emoji: '🚚', titulo: 'Seu pedido saiu para entrega', mensagem: 'Seu pedido já está em rota! A transportadora foi acionada.',                                       botao_texto: 'Acompanhar pedido',   botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
    'entregue':             { emoji: '✅', titulo: 'Pedido entregue',          mensagem: 'Seu pedido chegou! Esperamos que você ame as peças.',                                                  botao_texto: 'Avaliar produtos',    botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
    'cancelado':            { emoji: '💸', titulo: 'Pedido cancelado',         mensagem: 'Confirmamos o cancelamento do seu pedido. A solicitação de reembolso foi aberta automaticamente.',     botao_texto: 'Acompanhar reembolso', botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' }
};


async function enviarEmailMudancaStatus(pedido, novoStatus, observacaoAdmin) {
    if (!pedido || !pedido.cliente || !pedido.cliente.email) {
        console.warn('[email] Pedido sem e-mail do cliente');
        return { ok: false, erro: 'Pedido sem e-mail' };
    }
    if (typeof emailjs === 'undefined') {
        console.warn('[email] EmailJS indisponível');
        return { ok: false, erro: 'EmailJS indisponível' };
    }

    var info = STATUS_EMAIL[novoStatus];
    if (!info) {
        console.warn('[email] Status sem template:', novoStatus);
        return { ok: false, erro: 'Status sem template' };
    }

    var params = {
        to_email:          pedido.cliente.email,
        nome_cliente:      pedido.cliente.nome || 'cliente',
        numero_pedido:     pedido.numero || pedido.id || '—',
        valor:             formatarMoedaEmail(pedido.total || 0),
        itens_html:        gerarItensHTML(pedido.itens),
        endereco_completo: montarEnderecoCompleto(pedido.cliente),
        pagamento:         pedido.pagamento || 'PIX',
        emoji:             info.emoji,
        titulo:            info.titulo,
        mensagem:          observacaoAdmin || info.mensagem,
        botao_texto:       info.botao_texto,
        botao_url:         info.botao_url
    };

    console.log('[email] 📤 Enviando cliente (' + novoStatus + ') → template:', EMAILJS_CONFIG.templateId);

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params);
        console.log('[email] ✅ Cliente (' + novoStatus + '):', resp.status);
        return { ok: true };
    } catch (e) {
        logErroEmailJS('ao enviar cliente (' + novoStatus + ')', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro') };
    }
}


async function enviarEmailNovoPedidoProAdmin(pedido) {
    if (!pedido) return { ok: false, erro: 'Pedido vazio' };
    if (typeof emailjs === 'undefined') return { ok: false, erro: 'EmailJS indisponível' };

    var cliente = pedido.cliente || {};

    var params = {
        to_email:          EMAILJS_CONFIG.adminEmail,
        nome_cliente:      cliente.nome || 'Cliente',
        numero_pedido:     pedido.numero || pedido.id || '-',
        valor:             formatarMoedaEmail(pedido.total || 0),
        itens_html:        gerarItensHTML(pedido.itens),
        endereco_completo: montarEnderecoCompleto(cliente),
        pagamento:         pedido.pagamento || 'PIX',
        emoji:             '🛒',
        titulo:            'Novo pedido #' + (pedido.numero || pedido.id || '-'),
        mensagem:          'Você recebeu um novo pedido!',
        botao_texto:       'Abrir painel',
        botao_url:         'https://joaodev-vitor.github.io/seyn-clothing-br/admin.html'
    };

    console.log('[email] 📤 Enviando admin (novo pedido) → template:', EMAILJS_CONFIG.templateIdAdmin);

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateIdAdmin, params);
        console.log('[email] ✅ Admin (novo pedido):', resp.status);
        return { ok: true };
    } catch (e) {
        logErroEmailJS('ao enviar admin (novo pedido)', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro') };
    }
}


async function enviarEmailReembolso(refund, novoStatus, observacaoAdmin) {
    if (!refund || !refund.cliente || !refund.cliente.email) return { ok: false, erro: 'Refund sem e-mail' };
    if (typeof emailjs === 'undefined') return { ok: false, erro: 'EmailJS indisponível' };

    var mapas = {
        'pendente': { emoji: '📩', titulo: 'Reembolso recebido', mensagem: 'Recebemos sua solicitação de reembolso.', botao_texto: 'Acompanhar reembolso', botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
        'aprovado': { emoji: '✅', titulo: 'Reembolso aprovado', mensagem: 'Sua solicitação foi aprovada!', botao_texto: 'Acompanhar reembolso', botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/minha-conta.html' },
        'pago':     { emoji: '💰', titulo: 'Reembolso pago',     mensagem: 'O valor do reembolso já foi devolvido.', botao_texto: 'Voltar à loja', botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/es/index.html' },
        'negado':   { emoji: '⚠️', titulo: 'Reembolso negado',   mensagem: 'Analisamos sua solicitação e não foi possível aprovar.', botao_texto: 'Falar com o ateliê', botao_url: 'https://joaodev-vitor.github.io/seyn-clothing-br/es/minha-conta.html' }
    };

    var info = mapas[novoStatus];
    if (!info) return { ok: false, erro: 'Status sem template' };

    var params = {
        to_email:          refund.cliente.email,
        nome_cliente:      refund.cliente.nome || 'cliente',
        numero_pedido:     refund.orderNumero || '—',
        valor:             formatarMoedaEmail(refund.valor || 0),
        itens_html:        gerarItensHTML(refund.itens),
        endereco_completo: montarEnderecoCompleto(refund.cliente),
        pagamento:         'Reembolso',
        emoji:             info.emoji,
        titulo:            info.titulo,
        mensagem:          observacaoAdmin || info.mensagem,
        botao_texto:       info.botao_texto,
        botao_url:         info.botao_url
    };

    console.log('[email] 📤 Enviando reembolso cliente → template:', EMAILJS_CONFIG.templateId);

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params);
        console.log('[email] ✅ Reembolso cliente:', resp.status);
        return { ok: true };
    } catch (e) {
        logErroEmailJS('ao enviar reembolso cliente', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro') };
    }
}


async function enviarEmailAdminReembolso(refund) {
    if (!refund) return { ok: false, erro: 'Sem dados' };
    if (typeof emailjs === 'undefined') return { ok: false, erro: 'EmailJS indisponível' };

    var cli = refund.cliente || {};
    var pedidoNum = refund.orderNumero || '—';

    var params = {
        to_email:          EMAILJS_CONFIG.adminEmail,
        nome_cliente:      cli.nome || '—',
        numero_pedido:     pedidoNum,
        valor:             formatarMoedaEmail(refund.valor || 0),
        itens_html:        gerarItensHTML(refund.itens),
        endereco_completo: montarEnderecoCompleto(cli),
        pagamento:         'Reembolso',
        emoji:             '💸',
        titulo:            'Novo reembolso #' + pedidoNum,
        mensagem:          'Reembolso solicitado. Motivo: ' + (refund.motivo || '—'),
        botao_texto:       'Abrir painel',
        botao_url:         'https://joaodev-vitor.github.io/seyn-clothing-br/es/admin.html?section=reembolsos'
    };

    console.log('[email] 📤 Enviando reembolso admin → template:', EMAILJS_CONFIG.templateIdAdmin);

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateIdAdmin, params);
        console.log('[email] ✅ Admin (reembolso):', resp.status);
        return { ok: true };
    } catch (e) {
        logErroEmailJS('ao enviar reembolso admin', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro') };
    }
}


async function enviarEmailConfirmacaoProCliente(pedido) {
    return { ok: true };
}


window.STATUS_EMAIL = STATUS_EMAIL;
window.EMAILJS_CONFIG = EMAILJS_CONFIG;
window.enviarEmailMudancaStatus = enviarEmailMudancaStatus;
window.enviarEmailReembolso = enviarEmailReembolso;
window.enviarEmailAdminReembolso = enviarEmailAdminReembolso;
window.enviarEmailNovoPedidoProAdmin = enviarEmailNovoPedidoProAdmin;
window.enviarEmailConfirmacaoProCliente = enviarEmailConfirmacaoProCliente;
window.gerarItensHTML = gerarItensHTML;
window.montarEnderecoCompleto = montarEnderecoCompleto;
window.buscarPedidoOriginal = buscarPedidoOriginal;