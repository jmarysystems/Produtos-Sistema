// Produtos: cadastro completo com NCM, CEST, marca, tabela nutricional e imagens.
import { sb, listar, criar, atualizar, excluir, traduzErro } from '../api.js';
import * as ui from '../ui.js';

const esc = ui.esc;

export async function render(raiz, ctx) {
  ctx.setTitulo('Produtos');

  const podeCriar = ctx.pode('produtos', 'cadastrar');
  const podeEditar = ctx.pode('produtos', 'editar');
  const podeExcluir = ctx.pode('produtos', 'excluir');

  const [produtos, categorias, subcategorias, familias, marcas] = await Promise.all([
    listar('produtos', { select: '*, arm_categorias(descricao), arm_marcas(descricao)', ordem: 'sku' }),
    listar('arm_categorias', { ordem: 'descricao' }),
    listar('arm_subcategorias', { ordem: 'descricao' }),
    listar('arm_familias', { ordem: 'descricao' }),
    listar('arm_marcas', { ordem: 'descricao' }),
  ]);
  const listas = { categorias, subcategorias, familias, marcas };

  const imagens = await listar('produto_imagens', { ordem: 'ordem' });
  const porProduto = {};
  for (const img of imagens) {
    (porProduto[img.produto_id] = porProduto[img.produto_id] || []).push(img);
  }

  const linhas = produtos.map((p) => `
    <tr data-busca="${esc(JSON.stringify(p).toLowerCase())}">
      <td class="foto">${porProduto[p.id] && porProduto[p.id].length
        ? `<img src="${esc(porProduto[p.id][0].url)}" alt="" class="mini"
             data-zoom="${esc(p.id)}" data-i="0">`
        : '—'}</td>
      <td class="mono">${esc(p.sku)}</td>
      <td class="mono">${esc(p.ean || '—')}</td>
      <td>${esc(p.descricao)}</td>
      <td>${esc(p.unidade)}</td>
      <td>${esc(p.arm_categorias?.descricao || '—')}</td>
      <td>${esc(p.arm_marcas?.descricao || p.marca_fabricante || '—')}</td>
      <td>${p.ativo === false ? 'inativo' : 'ativo'}</td>
      <td class="acoes">
        ${podeEditar ? `<button type="button" class="botao-pequeno" data-editar="${esc(p.id)}">Editar</button>` : ''}
        ${podeExcluir ? `<button type="button" class="botao-pequeno botao-perigo" data-excluir="${esc(p.id)}">Excluir</button>` : ''}
      </td>
    </tr>`).join('');

  raiz.innerHTML = `
    <div class="cartao">
      <div class="cartao-topo">
        <h2>${produtos.length} produto(s)</h2>
        ${podeCriar ? '<button type="button" class="botao-primario" id="novo">Novo produto</button>' : ''}
      </div>
      <label class="campo" style="max-width:340px"><span>Filtrar</span>
        <input type="search" id="filtro" placeholder="SKU, EAN ou descrição"></label>
      <div class="tabela-rolagem"><table id="tabela">
        <thead><tr><th>Foto</th><th>SKU</th><th>EAN</th><th>Descrição</th><th>Un.</th>
          <th>Categoria</th><th>Marca</th><th>Ativo</th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="9">Nenhum produto cadastrado.</td></tr>'}</tbody>
      </table></div>
    </div>`;

  const filtro = raiz.querySelector('#filtro');
  filtro.addEventListener('input', () => {
    const t = filtro.value.toLowerCase();
    for (const tr of raiz.querySelectorAll('#tabela tbody tr')) {
      if (!tr.dataset.busca) continue;
      tr.hidden = !!t && !tr.dataset.busca.includes(t);
    }
  });

  // ------------------------------------------------------------------ form
  function opcoes(itens, valor) {
    return (itens || []).map((i) => `<option value="${esc(i.id)}" ${
      i.id === valor ? 'selected' : ''}>${esc(i.descricao)}</option>`).join('');
  }

  function abrirFormulario(registro) {
    const editando = !!registro.id;

    const subCat = registro.categoria_id || '';
    const subs = subcategorias.filter((s) => s.categoria_id === subCat);
    const subSel = registro.subcategoria_id || '';
    const fams = familias.filter((f) => f.subcategoria_id === subSel);

    const { fechar, corpo } = ui.modal({
      titulo: editando ? 'Editar produto' : 'Novo produto',
      largura: '860px',
      corpo: `
        <form id="form">
          <div class="abas">
            <button type="button" class="aba ativa" data-aba="basico">Dados básicos</button>
            <button type="button" class="aba" data-aba="seguranca">QTD Segurança</button>
            <button type="button" class="aba" data-aba="medidas">Medidas</button>
          </div>

          <section data-painel="basico">
          <div class="grade grade-2">
          ${ui.campoTexto('SKU', 'sku', registro.sku, { obrigatorio: true })}
          ${ui.campoTexto('EAN', 'ean', registro.ean, { placeholder: 'se vazio, usa o SKU' })}
          ${ui.campoTexto('Descrição', 'descricao', registro.descricao, { obrigatorio: true })}
          ${ui.campoTexto('Unidade', 'unidade', registro.unidade || 'UN', { obrigatorio: true })}

          <label class="campo"><span>Categoria</span>
            <select name="categoria_id" data-cat><option value="">—</option>
              ${opcoes(categorias, subCat)}</select></label>
          <label class="campo"><span>Subcategoria</span>
            <select name="subcategoria_id" data-sub><option value="">—</option>
              ${opcoes(subs, subSel)}</select></label>
          <label class="campo"><span>Família</span>
            <select name="familia_id" data-fam><option value="">—</option>
              ${opcoes(fams, registro.familia_id || '')}</select></label>
          <label class="campo"><span>Marca</span>
            <select name="marca_id"><option value="">—</option>
              ${opcoes(marcas, registro.marca_id || '')}</select></label>
          ${ui.campoTexto('Marca/Fabricante', 'marca_fabricante',
            registro.marca_fabricante ?? '', { placeholder: 'ex.: Coca-Cola, Unilever…' })}

          <label class="campo"><span>NCM</span>
            <div class="linha-acoes" style="flex-wrap:nowrap">
              <input name="ncm_codigo" value="${esc(registro.ncm_codigo || '')}" placeholder="ex.: 2203.00.00">
              <button type="button" class="botao-pequeno" id="ver-ncm">Verificar</button>
            </div>
            <small class="sub" id="ncm-info"></small></label>
          <label class="campo"><span>CEST</span>
            <div class="linha-acoes" style="flex-wrap:nowrap">
              <input name="cest_codigo" value="${esc(registro.cest_codigo || '')}" placeholder="ex.: 0100100">
              <button type="button" class="botao-pequeno" id="ver-cest">Verificar</button>
            </div>
            <small class="sub" id="cest-info"></small></label>

          <label class="campo"><span>Ativo</span>
            <input type="checkbox" name="ativo" ${registro.ativo === false ? '' : 'checked'}></label>

          <label class="campo campo-largo"><span>Tabela nutricional</span>
            <textarea name="tabela_nutricional" rows="4"
              placeholder="algumas linhas de texto">${esc(registro.tabela_nutricional || '')}</textarea></label>

          <div class="campo campo-largo">
            <span>Imagens do produto</span>
            <input type="file" id="arquivos" accept="image/*" multiple>
            <div id="miniaturas" class="linha-acoes" style="margin-top:10px"></div>
          </div>

          </div>
          </section>

          <section data-painel="seguranca" hidden>
            <p class="sub">Quantidades por posição na loja — usadas no cálculo do estoque de segurança.</p>
            <div class="grade grade-2">
              ${ui.campoTexto('Gôndola', 'gondola', registro.gondola ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Ponta de Gôndola', 'ponta_gondola', registro.ponta_gondola ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Ponto Extra', 'ponto_extra', registro.ponto_extra ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Geladeira', 'geladeira', registro.geladeira ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Paredão de Entrada', 'paredao_entrada', registro.paredao_entrada ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Depósito', 'deposito', registro.deposito ?? '', { tipo: 'number' })}
            </div>
            <p class="sub" id="total-seguranca"></p>
          </section>

          <section data-painel="medidas" hidden>
            <p class="sub">Informe as medidas na unidade escolhida — o metro quadrado e o
              metro cúbico são calculados automaticamente.</p>
            <div class="grade grade-2">
              <label class="campo"><span>Unidade de Medida</span>
                <select name="unidade_medida" id="unidade-medida">
                  ${['MILIMETRO', 'CENTIMETRO', 'METRO'].map((u) => `<option value="${u}" ${
                    (registro.unidade_medida || 'METRO') === u ? 'selected' : ''}>${
                    u.charAt(0) + u.slice(1).toLowerCase()}</option>`).join('')}
                </select></label>
              ${ui.campoTexto('Largura', 'largura', registro.largura ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Altura', 'altura', registro.altura ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Comprimento', 'comprimento', registro.comprimento ?? '', { tipo: 'number' })}
              <label class="campo"><span>Metro Quadrado (m²)</span>
                <input name="metro_quadrado" readonly value="${registro.metro_quadrado ?? ''}"></label>
              <label class="campo"><span>Metro Cúbico (m³)</span>
                <input name="metro_cubico" readonly value="${registro.metro_cubico ?? ''}"></label>

              ${ui.campoTexto('Quantidade por embalagem', 'quantidade_por_embalagem',
                registro.quantidade_por_embalagem ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Descrição reduzida', 'descricao_reduzida',
                registro.descricao_reduzida ?? '')}
              ${ui.campoTexto('Venda média diária', 'venda_media_diaria',
                registro.venda_media_diaria ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Markup (%)', 'markup', registro.markup ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Margem objetiva (%)', 'margem_objetiva',
                registro.margem_objetiva ?? '', { tipo: 'number' })}
              ${ui.campoTexto('Margem realizada (%)', 'margem_realizada',
                registro.margem_realizada ?? '', { tipo: 'number' })}
            </div>
          </section>

          <div class="linha-acoes campo-largo" style="margin-top:14px">
            <button type="submit" class="botao-primario">${editando ? 'Salvar' : 'Cadastrar'}</button>
            <button type="button" id="cancelar">Cancelar</button>
          </div>
        </form>`,
    });

    corpo.querySelector('#cancelar').addEventListener('click', fechar);

    // abas
    for (const aba of corpo.querySelectorAll('.aba')) {
      aba.addEventListener('click', () => {
        for (const a of corpo.querySelectorAll('.aba')) a.classList.toggle('ativa', a === aba);
        for (const p of corpo.querySelectorAll('[data-painel]')) {
          p.hidden = p.dataset.painel !== aba.dataset.aba;
        }
      });
    }

    // medidas: converte para metro e calcula m² e m³
    const FATOR = { MILIMETRO: 0.001, CENTIMETRO: 0.01, METRO: 1 };
    function calcularMedidas() {
      const unidade = corpo.querySelector('#unidade-medida')?.value || 'METRO';
      const fator = FATOR[unidade] || 1;
      const valor = (campo) => Number(corpo.querySelector(`[name="${campo}"]`)?.value) || 0;

      const largura = valor('largura') * fator;
      const altura = valor('altura') * fator;
      const comprimento = valor('comprimento') * fator;

      const m2 = largura && comprimento ? largura * comprimento : 0;
      const m3 = largura && altura && comprimento ? largura * altura * comprimento : 0;

      const campoM2 = corpo.querySelector('[name="metro_quadrado"]');
      const campoM3 = corpo.querySelector('[name="metro_cubico"]');
      if (campoM2) campoM2.value = m2 ? m2.toFixed(4) : '';
      if (campoM3) campoM3.value = m3 ? m3.toFixed(4) : '';
    }

    for (const campo of ['largura', 'altura', 'comprimento', 'unidade-medida']) {
      corpo.querySelector(`[name="${campo}"]`)?.addEventListener('input', calcularMedidas);
      corpo.querySelector(`#${campo}`)?.addEventListener('change', calcularMedidas);
    }
    calcularMedidas();

    // total das posições
    const camposPosicao = ['gondola', 'ponta_gondola', 'ponto_extra', 'geladeira',
      'paredao_entrada', 'deposito'];
    const totalEl = corpo.querySelector('#total-seguranca');
    function atualizarTotal() {
      const total = camposPosicao.reduce((s, campo) => {
        const el = corpo.querySelector(`[name="${campo}"]`);
        return s + (Number(el?.value) || 0);
      }, 0);
      if (totalEl) totalEl.textContent = `Total das posições: ${total}`;
    }
    for (const campo of camposPosicao) {
      corpo.querySelector(`[name="${campo}"]`)?.addEventListener('input', atualizarTotal);
    }
    atualizarTotal();

    // cascata categoria -> subcategoria -> família
    const selCat = corpo.querySelector('[data-cat]');
    const selSub = corpo.querySelector('[data-sub]');
    const selFam = corpo.querySelector('[data-fam]');
    const preencher = (sel, itens) => {
      sel.innerHTML = '<option value="">—</option>'
        + opcoes(itens, '');
    };
    selCat.addEventListener('change', () => {
      preencher(selSub, subcategorias.filter((s) => s.categoria_id === selCat.value));
      preencher(selFam, []);
    });
    selSub.addEventListener('change', () => {
      preencher(selFam, familias.filter((f) => f.subcategoria_id === selSub.value));
    });

    // NCM / CEST
    async function verificarNcm() {
      const codigo = corpo.querySelector('[name="ncm_codigo"]').value.trim();
      const info = corpo.querySelector('#ncm-info');
      if (!codigo) { info.textContent = ''; return; }
      const { data } = await sb.from('ncm').select('codigo,descricao')
        .or(`codigo.eq.${codigo},codigo.eq.${codigo.padEnd(8, '0')}`).limit(1);
      info.textContent = data && data.length
        ? `${data[0].codigo} — ${data[0].descricao}`
        : 'NCM não encontrado na tabela.';
      info.style.color = data && data.length ? '' : '#8c1d18';
    }

    async function verificarCest() {
      const codigo = corpo.querySelector('[name="cest_codigo"]').value.trim();
      const info = corpo.querySelector('#cest-info');
      if (!codigo) { info.textContent = ''; return; }
      const { data } = await sb.from('cest').select('cest,descricao')
        .eq('cest', codigo).order('data_inicio', { ascending: false }).limit(1);
      info.textContent = data && data.length
        ? `${data[0].cest} — ${data[0].descricao}`
        : 'CEST não encontrado na tabela.';
      info.style.color = data && data.length ? '' : '#8c1d18';
    }

    corpo.querySelector('#ver-ncm').addEventListener('click', verificarNcm);
    corpo.querySelector('#ver-cest').addEventListener('click', verificarCest);

    // imagens existentes
    const miniaturas = corpo.querySelector('#miniaturas');
    const remover = [];

    async function carregarImagens(produtoId) {
      if (!produtoId) return;
      const { data } = await sb.from('produto_imagens')
        .select('*').eq('produto_id', produtoId).order('ordem');
      miniaturas.innerHTML = (data || []).map((img) => `
        <span style="position:relative;display:inline-block">
          <img src="${esc(img.url)}" alt="" class="mini"
               data-z="${esc(img.url)}"
               style="width:84px;height:84px;object-fit:cover;border-radius:8px;border:1px solid #cfd6df">
          <button type="button" data-apagar="${esc(img.id)}" data-caminho="${esc(img.caminho)}"
            style="position:absolute;top:-6px;right:-6px;border:none;background:#c62828;color:#fff;border-radius:50%;width:20px;height:20px;cursor:pointer">×</button>
        </span>`).join('');

      for (const im of miniaturas.querySelectorAll('[data-z]')) {
        im.addEventListener('click', () => {
          const lista = (data || []).map((x) => ({ url: x.url }));
          abrirZoom(lista, lista.findIndex((x) => x.url === im.dataset.z));
        });
      }

      for (const b of miniaturas.querySelectorAll('[data-apagar]')) {
        b.addEventListener('click', () => {
          remover.push({ id: b.dataset.apagar, caminho: b.dataset.caminho });
          b.parentElement.remove();
        });
      }
    }

    if (editando) carregarImagens(registro.id);

    corpo.querySelector('#form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = ui.dadosDoForm(ev.target);
      const valores = {
        sku: d.sku,
        ean: d.ean || null,
        descricao: d.descricao,
        unidade: d.unidade || 'UN',
        categoria_id: d.categoria_id || null,
        subcategoria_id: d.subcategoria_id || null,
        familia_id: d.familia_id || null,
        marca_id: d.marca_id || null,
        marca_fabricante: d.marca_fabricante || null,
        ncm_codigo: d.ncm_codigo || null,
        cest_codigo: d.cest_codigo || null,
        quantidade_por_embalagem: d.quantidade_por_embalagem ? Number(d.quantidade_por_embalagem) : null,
        tabela_nutricional: d.tabela_nutricional || null,
        ativo: !!corpo.querySelector('[name="ativo"]').checked,
        gondola: d.gondola ? Number(d.gondola) : null,
        ponta_gondola: d.ponta_gondola ? Number(d.ponta_gondola) : null,
        ponto_extra: d.ponto_extra ? Number(d.ponto_extra) : null,
        geladeira: d.geladeira ? Number(d.geladeira) : null,
        paredao_entrada: d.paredao_entrada ? Number(d.paredao_entrada) : null,
        deposito: d.deposito ? Number(d.deposito) : null,
        unidade_medida: d.unidade_medida || 'METRO',
        largura: d.largura ? Number(d.largura) : null,
        altura: d.altura ? Number(d.altura) : null,
        comprimento: d.comprimento ? Number(d.comprimento) : null,
        metro_quadrado: d.metro_quadrado ? Number(d.metro_quadrado) : null,
        metro_cubico: d.metro_cubico ? Number(d.metro_cubico) : null,
        descricao_reduzida: d.descricao_reduzida || null,
        venda_media_diaria: d.venda_media_diaria ? Number(d.venda_media_diaria) : null,
        markup: d.markup ? Number(d.markup) : null,
        margem_objetiva: d.margem_objetiva ? Number(d.margem_objetiva) : null,
        margem_realizada: d.margem_realizada ? Number(d.margem_realizada) : null,
      };

      const botao = ev.target.querySelector('button[type="submit"]');
      botao.disabled = true;
      botao.textContent = 'Salvando…';

      try {
        let produto;
        if (editando) produto = await atualizar('produtos', registro.id, valores);
        else produto = await criar('produtos', { ...valores, origem: 'cadastro' });

        for (const item of remover) {
          await sb.storage.from('produtos').remove([item.caminho]);
          await sb.from('produto_imagens').delete().eq('id', item.id);
        }

        const arquivos = corpo.querySelector('#arquivos').files;
        for (const arquivo of Array.from(arquivos)) {
          const caminho = `${produto.id}/${Date.now()}_${arquivo.name.replace(/[^\w.\-]/g, '_')}`;
          const { error: erroUpload } = await sb.storage.from('produtos').upload(caminho, arquivo);
          if (erroUpload) { ui.toast(traduzErro(erroUpload), 'erro'); continue; }
          const { data: pub } = sb.storage.from('produtos').getPublicUrl(caminho);
          await sb.from('produto_imagens').insert({
            produto_id: produto.id, caminho, url: pub.publicUrl,
          });
        }

        fechar();
        ui.toast(editando ? 'Produto atualizado.' : 'Produto cadastrado.');
        ctx.recarregar();
      } catch (erro) {
        ui.toast(erro.message, 'erro');
        botao.disabled = false;
        botao.textContent = editando ? 'Salvar' : 'Cadastrar';
      }
    });
  }

  for (const img of raiz.querySelectorAll('[data-zoom]')) {
    img.addEventListener('click', () => {
      abrirZoom(porProduto[img.dataset.zoom] || [], Number(img.dataset.i) || 0);
    });
  }

  raiz.querySelector('#novo')?.addEventListener('click', () => abrirFormulario({}));
  for (const b of raiz.querySelectorAll('[data-editar]')) {
    b.addEventListener('click', () => abrirFormulario(produtos.find((p) => p.id === b.dataset.editar) || {}));
  }
  for (const b of raiz.querySelectorAll('[data-excluir]')) {
    b.addEventListener('click', async () => {
      if (!window.confirm('Excluir este produto?')) return;
      try {
        await excluir('produtos', b.dataset.excluir);
        ui.toast('Produto excluído.');
        ctx.recarregar();
      } catch (erro) { ui.toast(erro.message, 'erro'); }
    });
  }
}

// ------------------------------------------------------------------ zoom
function abrirZoom(imagens, indice = 0) {
  const lista = (imagens || []).filter((i) => i && i.url);
  if (!lista.length) return;

  let atual = Math.min(Math.max(indice, 0), lista.length - 1);

  const overlay = document.createElement('div');
  overlay.className = 'zoom-overlay';
  overlay.innerHTML = `
    <button type="button" class="zoom-fechar" aria-label="Fechar">&times;</button>
    ${lista.length > 1 ? '<button type="button" class="zoom-nav zoom-ant" aria-label="Anterior">‹</button>' : ''}
    <img class="zoom-img" src="${esc(lista[atual].url)}" alt="">
    ${lista.length > 1 ? '<button type="button" class="zoom-nav zoom-prox" aria-label="Próxima">›</button>' : ''}
    ${lista.length > 1 ? `<span class="zoom-conta">${atual + 1} / ${lista.length}</span>` : ''}`;

  document.body.appendChild(overlay);

  const img = overlay.querySelector('.zoom-img');
  const conta = overlay.querySelector('.zoom-conta');

  const mostrar = (i) => {
    atual = (i + lista.length) % lista.length;
    img.src = lista[atual].url;
    if (conta) conta.textContent = `${atual + 1} / ${lista.length}`;
  };

  const fechar = () => {
    overlay.remove();
    document.removeEventListener('keydown', teclado);
  };

  const teclado = (ev) => {
    if (ev.key === 'Escape') fechar();
    if (ev.key === 'ArrowLeft' && lista.length > 1) mostrar(atual - 1);
    if (ev.key === 'ArrowRight' && lista.length > 1) mostrar(atual + 1);
  };

  overlay.querySelector('.zoom-fechar').addEventListener('click', fechar);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) fechar(); });
  overlay.querySelector('.zoom-ant')?.addEventListener('click', () => mostrar(atual - 1));
  overlay.querySelector('.zoom-prox')?.addEventListener('click', () => mostrar(atual + 1));
  document.addEventListener('keydown', teclado);
}
