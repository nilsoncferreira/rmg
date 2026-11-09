// Inicialização e ligação entre mapa, controles, painel e tabelas
import { ANOS, CAMADAS, FUNDOS, METRICAS, ROTULO_VIA } from './config.js';
import {
  assinar, crescimento, definir, densidade, escapar, estado, fmt, formataMetrica, pop, valorMetrica,
} from './estado.js';
import {
  aproximar, carregar, definirFundo, definirOpacidade, definirVisivel, estilosVia, feicaoEm, fecharConsulta, fontes,
  iniciarMapa, iniciarMedicao, irParaInicio, mapa, medindo, mostrarConsulta, municipioPorNome, passarSobre, pararMedicao,
  realcar, redesenharTema,
} from './mapa.js';
import { iniciarPainel } from './painel.js';
import { abrirCamada, iniciarTabelas } from './tabelas.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const movel = window.matchMedia('(max-width: 859px)');

/* ---------- painéis e navegação ---------- */
const PAINEIS = ['camadas', 'painel', 'tabelas'];
const largo = window.matchMedia('(min-width: 1200px)');
const aberto = { camadas: largo.matches, painel: !movel.matches, tabelas: false };

function aplicarPaineis() {
  PAINEIS.forEach((id) => {
    $(`#${id}`).hidden = !aberto[id];
    $$(`[data-abrir="${id}"]`).forEach((b) => b.setAttribute('aria-pressed', aberto[id]));
  });
  const visao = PAINEIS.find((id) => aberto[id]) || 'mapa';
  $$('[data-visao]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.visao === visao));
  document.body.dataset.visao = visao;
  requestAnimationFrame(() => mapa?.updateSize());
}

function abrirPainel(id, valor = true) {
  if (movel.matches && valor) PAINEIS.forEach((p) => { aberto[p] = false; });
  aberto[id] = valor;
  aplicarPaineis();
  if (id === 'tabelas' && valor) abrirCamada(tabelaAtual());
}

let camadaTabela = 'municipios';
const tabelaAtual = () => camadaTabela;

function abrirTabela(id, fid = null) {
  camadaTabela = id;
  if (movel.matches) PAINEIS.forEach((p) => { aberto[p] = false; });
  aberto.tabelas = true;
  aplicarPaineis();
  abrirCamada(id, fid);
}

function mostrarMapaNoCelular() {
  if (!movel.matches) return;
  PAINEIS.forEach((p) => { aberto[p] = false; });
  aplicarPaineis();
}

$$('[data-abrir]').forEach((b) => b.addEventListener('click', () => abrirPainel(b.dataset.abrir, !aberto[b.dataset.abrir])));
$$('[data-visao]').forEach((b) => b.addEventListener('click', () => {
  PAINEIS.forEach((p) => { aberto[p] = false; });
  if (b.dataset.visao !== 'mapa') abrirPainel(b.dataset.visao);
  else aplicarPaineis();
}));
movel.addEventListener('change', (e) => {
  if (e.matches) PAINEIS.forEach((p) => { aberto[p] = false; });
  else { aberto.camadas = largo.matches; aberto.painel = true; }
  aplicarPaineis();
});
$('#abrir-sobre').addEventListener('click', () => $('#sobre').showModal());
$('#sobre').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

/* ---------- cartão de camadas ---------- */
const amostraLinha = (cor, largura, traco) => `<svg class="amostra" viewBox="0 0 28 12" aria-hidden="true"><line x1="1" x2="27" y1="6" y2="6" stroke="${cor}" stroke-width="${largura}" ${traco ? `stroke-dasharray="${traco.join(' ')}"` : ''}/></svg>`;

function montarCamadas() {
  const estiloVia = (id) => {
    const s = estilosVia[id].stroke;
    return amostraLinha(s.getColor(), s.getWidth(), s.getLineDash());
  };
  const linha = (id, titulo, amostra, extra = '') => `
    <div class="cam">
      <label class="cam-nome"><input type="checkbox" data-camada="${id}" checked>${amostra}<span>${titulo}</span></label>
      <button type="button" class="cam-tab" data-tabela="${id}" aria-label="Abrir tabela de atributos de ${titulo}" title="Abrir tabela de atributos"><svg class="icone" aria-hidden="true"><use href="#i-tabela"/></svg></button>
      ${extra}
    </div>`;
  $('#camadas').innerHTML = `
    <h2>Camadas</h2>
    ${linha('localidades', 'Localidades', '<svg class="amostra" viewBox="0 0 28 14" aria-hidden="true"><circle cx="14" cy="7" r="4.6" fill="#fff" stroke="#14211E" stroke-width="1.5"/><circle cx="14" cy="7" r="1.6" fill="#14211E"/></svg>', `
      <ul class="cam-leg">
        <li><svg class="amostra" viewBox="0 0 28 18" aria-hidden="true"><circle cx="14" cy="9" r="7.6" fill="#fff" stroke="#14211E" stroke-width="1.5"/><path d="m14 3.6 1.5 3.7 4 .2-3.1 2.5 1 3.9-3.4-2.2-3.4 2.2 1-3.9-3.1-2.5 4-.2Z" fill="#14211E"/></svg>Capital estadual</li>
        <li><svg class="amostra" viewBox="0 0 28 14" aria-hidden="true"><circle cx="14" cy="7" r="4.6" fill="#fff" stroke="#14211E" stroke-width="1.5"/><circle cx="14" cy="7" r="1.6" fill="#14211E"/></svg>Sede municipal</li>
        <li><svg class="amostra" viewBox="0 0 28 14" aria-hidden="true"><circle cx="14" cy="7" r="2.6" fill="#fff" stroke="#14211E" stroke-width="1.1"/></svg>Povoado ou outra localidade</li>
      </ul>`)}
    ${linha('rodovias', 'Malha viária', amostraLinha('#B8321F', 2.2), `
      <ul class="cam-leg">${ROTULO_VIA.map((v) => `<li>${estiloVia(v.id)}${v.rotulo}</li>`).join('')}</ul>`)}
    ${linha('hidrografia', 'Hidrografia', amostraLinha('#2A7DA6', 1.6), '<p class="cam-nota">Os cursos menores aparecem ao aproximar o mapa.</p>')}
    ${linha('municipios', 'Municípios', '<svg class="amostra" viewBox="0 0 28 14" aria-hidden="true"><rect x="3" y="1.5" width="22" height="11" fill="#A9D8C8" stroke="#14211E" stroke-width="1.2"/></svg>', `
      <label class="cam-opac">Opacidade do tema<input type="range" id="opacidade" min="0" max="100" value="78" aria-label="Opacidade do tema dos municípios"></label>`)}
    <h2>Mapa de fundo</h2>
    <div class="fundos" role="radiogroup" aria-label="Mapa de fundo">
      ${FUNDOS.map((f, i) => `<label><input type="radio" name="fundo" value="${f.id}" ${i === 0 ? 'checked' : ''}>${f.rotulo}</label>`).join('')}
    </div>`;
  $('#camadas').addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.camada) {
      definirVisivel(t.dataset.camada, t.checked);
      if (t.dataset.camada === 'hidrografia' && t.checked) carregarHidrografia();
    }
    if (t.name === 'fundo') definirFundo(t.value);
  });
  $('#opacidade').addEventListener('input', (e) => definirOpacidade(e.target.value / 100));
  $('#camadas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tabela]');
    if (b) abrirTabela(b.dataset.tabela);
  });
}

/* ---------- tema e régua de tempo ---------- */
function montarControle() {
  $('#metricas').innerHTML = Object.entries(METRICAS).map(([id, m]) => `<button type="button" role="radio" data-metrica="${id}" aria-checked="${id === estado.metrica}" tabindex="${id === estado.metrica ? 0 : -1}">${m.rotulo}</button>`).join('');
  $('#regua').innerHTML = ANOS.map((a, i) => `<button type="button" role="radio" class="seg-ano ${i % 2 ? 'claro' : 'escuro'}${a === 2007 ? ' contagem' : ''}" data-ano="${a}" aria-checked="${a === estado.ano}" tabindex="${a === estado.ano ? 0 : -1}" ${a === 2007 ? 'title="2007: Contagem da População do IBGE"' : ''}><i></i><span>${a}</span></button>`).join('');
  grupoRadio($('#metricas'), '[data-metrica]', (b) => definir({ metrica: b.dataset.metrica }));
  grupoRadio($('#regua'), '[data-ano]', (b) => { pararTocar(); definir({ ano: Number(b.dataset.ano) }); });
  $('#tocar').addEventListener('click', () => (tocando ? pararTocar() : iniciarTocar()));
}

function grupoRadio(grupo, sel, aoEscolher) {
  grupo.addEventListener('click', (e) => {
    const b = e.target.closest(sel);
    if (b) aoEscolher(b);
  });
  grupo.addEventListener('keydown', (e) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const itens = $$(sel, grupo);
    const i = (itens.indexOf(document.activeElement) + delta + itens.length) % itens.length;
    aoEscolher(itens[i]);
    itens[i].focus();
  });
}

let tocando = null;
function iniciarTocar() {
  if (estado.ano === ANOS[ANOS.length - 1]) definir({ ano: ANOS[0] });
  $('#tocar use').setAttribute('href', '#i-pausa');
  $('#tocar').setAttribute('aria-label', 'Pausar a série de anos');
  tocando = setInterval(() => {
    const i = ANOS.indexOf(estado.ano);
    if (i === ANOS.length - 1) pararTocar();
    else definir({ ano: ANOS[i + 1] });
  }, 1100);
}
function pararTocar() {
  clearInterval(tocando);
  tocando = null;
  $('#tocar use').setAttribute('href', '#i-play');
  $('#tocar').setAttribute('aria-label', 'Reproduzir a série de anos');
}

function atualizarControle() {
  $$('#metricas [data-metrica]').forEach((b) => {
    const s = b.dataset.metrica === estado.metrica;
    b.setAttribute('aria-checked', s);
    b.tabIndex = s ? 0 : -1;
  });
  $$('#regua [data-ano]').forEach((b) => {
    const s = Number(b.dataset.ano) === estado.ano;
    b.setAttribute('aria-checked', s);
    b.tabIndex = s ? 0 : -1;
  });
  const m = METRICAS[estado.metrica];
  $('#legenda-tema').innerHTML = m.classes
    ? `<li class="lg-unid">${m.unidade}</li>${m.classes.map((c, i) => `<li><i style="background:${m.cores[i]}"></i>${c}</li>`).join('')}`
    : '';
}

/* ---------- consulta ---------- */
function htmlConsulta(f) {
  const id = f.get('_camada');
  const info = CAMADAS[id];
  const p = f.getProperties();
  const verTabela = `<button type="button" class="botao" data-ver-tabela="${id}:${f.getId()}"><svg class="icone" aria-hidden="true"><use href="#i-tabela"/></svg>Ver na tabela</button>`;
  if (id === 'municipios') {
    return `<p class="c-tipo">Município</p><h3>${escapar(p.NOME_ACEN)}</h3>
      <dl class="c-dados">
        <div><dt>População em ${estado.ano}</dt><dd>${fmt.int(pop(p))}</dd></div>
        <div><dt>Densidade</dt><dd>${formataMetrica(densidade(p), 'dens')} hab./km²</dd></div>
        ${estado.ano > ANOS[0] ? `<div><dt>Desde 2001</dt><dd>${fmt.sinal(crescimento(p))}</dd></div>` : ''}
      </dl>
      <div class="c-acoes">${verTabela}<button type="button" class="botao" data-ver-painel>Ver no dashboard</button></div>`;
  }
  const nome = p[info.nomeCampo] || `${info.titulo.replace(/s$/, '')} sem nome`;
  const linhas = info.campos.filter((c) => c.k !== info.nomeCampo && !/^NOME(MICRO|MESO)?$|REG_PLANEJ|REGIAO|ESTADO|SETOR_CENS|SITUACAO$/.test(c.k) || (c.k === 'SITUACAO' && id === 'rodovias'))
    .filter((c) => p[c.k] != null && p[c.k] !== '')
    .map((c) => `<div><dt>${c.label}</dt><dd>${c.tipo === 'int' ? fmt.int(p[c.k]) : c.tipo === 'dec' ? fmt.dec(p[c.k]) : escapar(p[c.k])}</dd></div>`).join('');
  return `<p class="c-tipo">${info.titulo}</p><h3>${escapar(nome)}</h3><dl class="c-dados">${linhas}</dl><div class="c-acoes">${verTabela}</div>`;
}

function abrirConsulta(f, coord) {
  $('#consulta-corpo').innerHTML = htmlConsulta(f);
  mostrarConsulta(coord);
}

function ligarConsulta() {
  $('#consulta-fechar').addEventListener('click', () => { fecharConsulta(); });
  $('#consulta').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ver-tabela]');
    if (b) {
      const [id, fid] = b.dataset.verTabela.split(':');
      fecharConsulta();
      abrirTabela(id, Number(fid));
    }
    if (e.target.closest('[data-ver-painel]')) {
      fecharConsulta();
      abrirPainel('painel');
    }
  });
  mapa.on('singleclick', (e) => {
    if (medindo()) return;
    const f = feicaoEm(e.pixel);
    if (!f) { fecharConsulta(); definir({ selecionado: null }); return; }
    if (f.get('_camada') === 'municipios') definir({ selecionado: f.get('NOME_ACEN') });
    else {
      definir({ selecionado: null });
      realcar([f]);
    }
    abrirConsulta(f, e.coordinate);
  });

  if (window.matchMedia('(hover: hover)').matches) {
    let quadro = 0;
    let ultimo = null;
    const dica = $('#dica-mapa');
    mapa.on('pointermove', (e) => {
      if (e.dragging) return;
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        if (medindo()) { dica.hidden = true; return; }
        const f = feicaoEm(e.pixel, false);
        mapa.getTargetElement().style.cursor = f ? 'pointer' : '';
        const mun = f?.get('_camada') === 'municipios' ? f : null;
        if (mun !== ultimo) {
          passarSobre(mun);
          ultimo = mun;
        }
        if (!f) { dica.hidden = true; return; }
        const info = CAMADAS[f.get('_camada')];
        const nome = f.get(info.nomeCampo) || 'Sem nome';
        const p = f.getProperties();
        const m = estado.metrica === 'nenhuma' ? 'pop' : estado.metrica;
        dica.innerHTML = mun
          ? `<b>${escapar(nome)}</b>${formataMetrica(valorMetrica(p, m), m)} ${METRICAS[m].unidade}`
          : `<b>${escapar(nome)}</b>${info.titulo}`;
        dica.hidden = false;
        dica.style.transform = `translate(${e.pixel[0] + 14}px, ${e.pixel[1] + 14}px)`;
      });
    });
    mapa.getTargetElement().addEventListener('pointerleave', () => {
      dica.hidden = true;
      passarSobre(null);
      ultimo = null;
    });
  }
}

/* ---------- ferramentas ---------- */
function ligarFerramentas() {
  const zoom = (d) => mapa.getView().animate({ zoom: mapa.getView().getZoom() + d, duration: 200 });
  $('#z-mais').addEventListener('click', () => zoom(1));
  $('#z-menos').addEventListener('click', () => zoom(-1));
  $('#z-inicio').addEventListener('click', () => irParaInicio());
  const medir = (botao, tipo) => {
    const ativo = botao.getAttribute('aria-pressed') === 'true';
    $('#m-dist').setAttribute('aria-pressed', false);
    $('#m-area').setAttribute('aria-pressed', false);
    if (ativo) {
      pararMedicao();
      $('#medida-aviso').hidden = true;
      return;
    }
    iniciarMedicao(tipo);
    botao.setAttribute('aria-pressed', true);
    $('#medida-aviso').hidden = false;
  };
  $('#m-dist').addEventListener('click', (e) => medir(e.currentTarget, 'linha'));
  $('#m-area').addEventListener('click', (e) => medir(e.currentTarget, 'area'));
  $('#tab-fechar').addEventListener('click', () => abrirPainel('tabelas', false));
  $('#tab-maior').addEventListener('click', (e) => {
    const b = e.currentTarget;
    const maior = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', maior);
    $('#tabelas').classList.toggle('maior', maior);
    b.setAttribute('aria-label', maior ? 'Reduzir a tabela' : 'Aumentar a tabela');
    b.title = b.getAttribute('aria-label');
    requestAnimationFrame(() => mapa.updateSize());
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharConsulta();
      if (medindo()) {
        pararMedicao();
        $('#m-dist').setAttribute('aria-pressed', false);
        $('#m-area').setAttribute('aria-pressed', false);
        $('#medida-aviso').hidden = true;
      }
    }
  });
}

/* ---------- busca ---------- */
let indice = [];
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function construirIndice() {
  const grupos = new globalThis.Map();
  const adicionar = (id, rotulo) => {
    fontes[id].getFeatures().forEach((f) => {
      const nome = f.get(CAMADAS[id].nomeCampo);
      if (!nome) return;
      const chave = `${id}|${nome}`;
      if (!grupos.has(chave)) grupos.set(chave, { id, rotulo, nome, feicoes: [], chaveBusca: norm(nome) });
      grupos.get(chave).feicoes.push(f);
    });
  };
  adicionar('municipios', 'Município');
  adicionar('localidades', 'Localidade');
  adicionar('rodovias', 'Via');
  adicionar('hidrografia', 'Curso d’água');
  indice = [...grupos.values()];
}

function ligarBusca() {
  const ent = $('#busca');
  if (movel.matches) ent.placeholder = 'Buscar';
  const lista = $('#busca-lista');
  let ativo = -1;
  let achados = [];
  const fechar = () => {
    lista.hidden = true;
    ent.setAttribute('aria-expanded', 'false');
    ent.removeAttribute('aria-activedescendant');
    ativo = -1;
  };
  const marcar = () => {
    $$('li', lista).forEach((li, i) => li.setAttribute('aria-selected', i === ativo));
    if (ativo >= 0) {
      ent.setAttribute('aria-activedescendant', `res-${ativo}`);
      $(`#res-${ativo}`).scrollIntoView({ block: 'nearest' });
    }
  };
  const escolher = (item) => {
    ent.value = item.nome;
    fechar();
    mostrarMapaNoCelular();
    fecharConsulta();
    if (item.id === 'municipios') definir({ selecionado: item.nome });
    else {
      definir({ selecionado: null });
      realcar(item.feicoes);
    }
    aproximar(item.feicoes, item.id === 'localidades' ? 12.5 : 13);
  };
  ent.addEventListener('input', () => {
    const t = norm(ent.value.trim());
    if (t.length < 2) { fechar(); return; }
    achados = indice
      .filter((d) => d.chaveBusca.includes(t))
      .sort((a, b) => Number(b.chaveBusca.startsWith(t)) - Number(a.chaveBusca.startsWith(t)))
      .slice(0, 8);
    lista.innerHTML = achados.length
      ? achados.map((d, i) => `<li id="res-${i}" role="option" data-i="${i}" aria-selected="false"><span>${escapar(d.nome)}</span><small>${d.rotulo}</small></li>`).join('')
      : '<li class="sem-res">Nada encontrado. Confira a grafia.</li>';
    lista.hidden = false;
    ent.setAttribute('aria-expanded', 'true');
    ativo = -1;
  });
  ent.addEventListener('keydown', (e) => {
    if (lista.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!achados.length) return;
      ativo = (ativo + (e.key === 'ArrowDown' ? 1 : -1) + achados.length) % achados.length;
      marcar();
    } else if (e.key === 'Enter' && achados.length) {
      e.preventDefault();
      escolher(achados[Math.max(ativo, 0)]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      fechar();
    }
  });
  lista.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('[data-i]');
    if (li) {
      e.preventDefault();
      escolher(achados[Number(li.dataset.i)]);
    }
  });
  ent.addEventListener('blur', fechar);
}

/* ---------- carga ---------- */
let hidroPromessa = null;
function carregarHidrografia() {
  if (hidroPromessa) return hidroPromessa;
  const st = $('#status-carga');
  st.textContent = 'Carregando hidrografia…';
  hidroPromessa = carregar('hidrografia')
    .then(() => { st.textContent = ''; construirIndice(); })
    .catch(() => {
      hidroPromessa = null;
      st.textContent = 'Hidrografia indisponível. Recarregue a página para tentar de novo.';
    });
  return hidroPromessa;
}

async function iniciar() {
  iniciarMapa();
  montarCamadas();
  montarControle();
  aplicarPaineis();
  ligarFerramentas();
  ligarConsulta();
  ligarBusca();
  iniciarTabelas($('#tabelas'), {
    aoEscolher: (f, id) => {
      fecharConsulta();
      if (id === 'municipios') definir({ selecionado: f.get('NOME_ACEN') });
      else { definir({ selecionado: null }); realcar([f]); }
      aproximar([f], id === 'localidades' ? 12.5 : 13);
      mostrarMapaNoCelular();
    },
  });
  $$('#tab-abas [data-id]').forEach((b) => b.addEventListener('click', () => { camadaTabela = b.dataset.id; }));

  assinar((m) => {
    if ('metrica' in m || 'ano' in m) {
      redesenharTema();
      atualizarControle();
      fecharConsulta();
    }
    if ('selecionado' in m) {
      realcar(estado.selecionado ? [municipioPorNome(estado.selecionado)] : []);
    }
  });
  atualizarControle();

  try {
    const [municipios] = await Promise.all([carregar('municipios'), carregar('rodovias'), carregar('localidades')]);
    estado.municipios = municipios.map((f) => f.getProperties());
    iniciarPainel($('#painel'), {
      aoPassarLinha: (nome) => passarSobre(nome ? municipioPorNome(nome) : null),
    });
    irParaInicio(0);
    construirIndice();
    const adiar = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    adiar(() => carregarHidrografia());
  } catch (erro) {
    const a = $('#aviso-global');
    a.textContent = `O mapa não carregou os dados. ${erro.message} Confira se a pasta data está junto do index.html e recarregue a página.`;
    a.hidden = false;
  }
}

iniciar();

