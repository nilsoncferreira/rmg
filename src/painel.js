// Dashboard populacional: figuras, concentração, evolução e ranking
import { ANOS, COR_DEMAIS, METRICAS, PARTES } from './config.js';
import {
  areaRM, assinar, crescimento, definir, densidade, escapar, estado, fmt, formataMetrica, pop, totalRM, valorMetrica,
} from './estado.js';

const SUPERFICIE = '#FCFDFB';
const COR_MUN = '#0E8A78';
const COR_RM = '#C4532C';
let raiz;
let aoPassarLinha = () => {};

export function iniciarPainel(el, opcoes) {
  raiz = el;
  aoPassarLinha = opcoes.aoPassarLinha;
  raiz.innerHTML = `
    <div class="pn-cabeca">
      <p class="pn-escopo" id="pn-escopo"></p>
      <button type="button" class="botao-texto" id="pn-limpar" hidden>Voltar à região</button>
    </div>
    <p class="heroi" id="pn-heroi"></p>
    <p class="heroi-rotulo" id="pn-heroi-rotulo"></p>
    <dl class="fichas" id="pn-fichas"></dl>
    <section class="bloco" aria-labelledby="t-conc">
      <h3 id="t-conc">Onde a população se concentra</h3>
      <p class="bloco-tese" id="pn-tese"></p>
      <div class="seg" id="pn-seg" role="img"></div>
      <ul class="seg-legenda" id="pn-seg-leg"></ul>
    </section>
    <section class="bloco" aria-labelledby="t-evol">
      <h3 id="t-evol">Evolução de 2001 a 2008</h3>
      <p class="bloco-sub" id="pn-evol-sub"></p>
      <ul class="seg-legenda" id="pn-evol-leg" hidden></ul>
      <div class="grafico" id="pn-linha"></div>
      <p class="nota"><strong>Atenção à quebra de série.</strong> Os valores de 2007 vêm da Contagem da População do IBGE. As quedas entre 2006 e 2007 podem refletir essa mudança de base, e não perda real de moradores.</p>
      <details class="dados">
        <summary>Ver os valores do gráfico</summary>
        <div id="pn-linha-tab"></div>
      </details>
    </section>
    <section class="bloco" aria-labelledby="t-rank">
      <h3 id="t-rank">Municípios por <span id="pn-rank-metrica"></span></h3>
      <p class="bloco-sub" id="pn-rank-sub"></p>
      <ol class="ranking" id="pn-rank"></ol>
    </section>`;
  raiz.querySelector('#pn-limpar').addEventListener('click', () => definir({ selecionado: null }));
  new ResizeObserver(() => desenharLinha()).observe(raiz.querySelector('#pn-linha'));
  assinar(render);
  render();
}

const atual = () => estado.municipios.find((p) => p.NOME_ACEN === estado.selecionado);

function render() {
  if (!estado.municipios.length) return;
  const { ano } = estado;
  const m = atual();
  const total = totalRM();
  const q = (s) => raiz.querySelector(s);

  q('#pn-limpar').hidden = !m;
  q('#pn-escopo').textContent = m ? m.NOME_ACEN : 'Região Metropolitana de Goiânia';
  q('#pn-heroi').textContent = fmt.int(m ? pop(m) : total);
  const c = m ? crescimento(m) : (total / totalRM(ANOS[0]) - 1) * 100;
  q('#pn-heroi-rotulo').textContent = ano === ANOS[0]
    ? `habitantes em ${ano}, primeiro ano da série`
    : `habitantes em ${ano}, ${fmt.sinal(c)} desde 2001`;

  const lista = [...estado.municipios].sort((a, b) => pop(b) - pop(a));
  if (m) {
    const pos = lista.indexOf(m) + 1;
    fichas([
      ['Parcela da região', fmt.pct((pop(m) / total) * 100)],
      ['Posição na região', `${pos}º de ${lista.length}`],
      ['Densidade', `${formataMetrica(densidade(m), 'dens')} hab./km²`],
      ['Área do município', `${fmt.int(m._AREA_KM2)} km²`],
    ]);
  } else {
    const encolheram = estado.municipios.filter((p) => crescimento(p) < 0).length;
    fichas([
      ['Municípios', fmt.int(estado.municipios.length)],
      ['Densidade', `${formataMetrica(total / areaRM(), 'dens')} hab./km²`],
      ['Área total', `${fmt.int(areaRM())} km²`],
      ['Com queda desde 2001', ano === ANOS[0] ? '—' : fmt.int(encolheram)],
    ]);
  }
  desenharSeg(total);
  desenharLinha();
  desenharRanking();
}

function fichas(itens) {
  raiz.querySelector('#pn-fichas').innerHTML = itens
    .map(([r, v]) => `<div><dt>${r}</dt><dd>${v}</dd></div>`).join('');
}

function desenharSeg(total) {
  const porNome = (n) => estado.municipios.find((p) => p.NOME_ACEN === n);
  const partes = PARTES.map((d) => ({ ...d, v: pop(porNome(d.nome)) }));
  const resto = total - partes.reduce((s, d) => s + d.v, 0);
  partes.push({ nome: `Demais ${estado.municipios.length - PARTES.length} municípios`, cor: COR_DEMAIS, tinta: '#14211E', v: resto });
  const duas = (partes[0].v + partes[1].v) / total * 100;
  raiz.querySelector('#pn-tese').textContent = `Goiânia e Aparecida de Goiânia reúnem ${fmt.pct(duas)} dos moradores da região em ${estado.ano}.`;
  const seg = raiz.querySelector('#pn-seg');
  seg.setAttribute('aria-label', partes.map((d) => `${d.nome}: ${fmt.int(d.v)} habitantes, ${fmt.pct(d.v / total * 100)}`).join('; '));
  seg.innerHTML = partes.map((d) => {
    const parc = d.v / total * 100;
    const titulo = `${d.nome}: ${fmt.int(d.v)} habitantes (${fmt.pct(parc)})`;
    const rot = parc >= 9 ? `<span>${fmt.int(parc)}%</span>` : '';
    return `<div style="flex:${d.v} 0 0;background:${d.cor};color:${d.tinta}" title="${escapar(titulo)}">${rot}</div>`;
  }).join('');
  raiz.querySelector('#pn-seg-leg').innerHTML = partes
    .map((d) => `<li><i style="background:${d.cor}"></i>${escapar(d.nome)}</li>`).join('');
}

/* ---------- gráfico de linha ---------- */
function escalaLimpa(min, max, n = 4) {
  const bruto = (max - min) / n || 1;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => x >= bruto);
  const ini = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const t = [];
  for (let v = ini; v <= fim + passo / 2; v += passo) t.push(v);
  return t;
}

function desenharLinha() {
  const alvo = raiz?.querySelector('#pn-linha');
  if (!alvo || !estado.municipios.length) return;
  const m = atual();
  const largura = alvo.clientWidth || 340;
  if (!largura) return;
  const totais = ANOS.map((a) => totalRM(a));
  const series = m
    ? [
      { nome: m.NOME_ACEN, cor: COR_MUN, v: ANOS.map((a) => (pop(m, a) / pop(m, ANOS[0])) * 100), bruto: ANOS.map((a) => pop(m, a)) },
      { nome: 'Região', cor: COR_RM, v: totais.map((t) => (t / totais[0]) * 100), bruto: totais },
    ]
    : [{ nome: 'Região', cor: COR_MUN, v: totais, bruto: totais }];

  raiz.querySelector('#pn-evol-sub').textContent = m
    ? `Índice com 2001 = 100, para comparar ${m.NOME_ACEN} com a região.`
    : 'Moradores somados dos 20 municípios. Selecione um ano no gráfico ou na régua do mapa.';
  const leg = raiz.querySelector('#pn-evol-leg');
  leg.hidden = !m;
  leg.innerHTML = m ? series.map((s) => `<li><i class="traco" style="background:${s.cor}"></i>${escapar(s.nome)}</li>`).join('') : '';

  const A = 196;
  const M = { e: 44, d: m ? 40 : 54, t: 24, b: 24 };
  const todos = series.flatMap((s) => s.v);
  const ticks = escalaLimpa(Math.min(...todos), Math.max(...todos));
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const px = (i) => M.e + (i / (ANOS.length - 1)) * (largura - M.e - M.d);
  const py = (v) => M.t + (1 - (v - y0) / (y1 - y0 || 1)) * (A - M.t - M.b);
  const iAno = ANOS.indexOf(estado.ano);
  const i2007 = ANOS.indexOf(2007);
  const fmtEixo = (v) => (m ? fmt.int(v) : fmt.compacto(v));

  const grade = ticks.map((t) => `<line x1="${M.e}" x2="${largura - M.d}" y1="${py(t)}" y2="${py(t)}" class="g-grade"/><text x="${M.e - 6}" y="${py(t) + 4}" class="g-eixo" text-anchor="end">${fmtEixo(t)}</text>`).join('');
  const eixoX = ANOS.map((a, i) => (i % 7 === 0 || a === estado.ano ? `<text x="${px(i)}" y="${A - 6}" class="g-eixo${a === estado.ano ? ' forte' : ''}" text-anchor="middle">${a}</text>` : '')).join('');
  const quebra = `<line x1="${px(i2007)}" x2="${px(i2007)}" y1="${M.t - 6}" y2="${A - M.b}" class="g-quebra"/><text x="${px(i2007)}" y="${M.t - 10}" class="g-eixo" text-anchor="middle">Contagem</text>`;
  const linhas = series.map((s) => {
    const d = s.v.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join('');
    return `<path d="${d}" fill="none" stroke="${s.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  const cursor = `<line x1="${px(iAno)}" x2="${px(iAno)}" y1="${M.t}" y2="${A - M.b}" class="g-cursor"/>${series.map((s) => `<circle cx="${px(iAno)}" cy="${py(s.v[iAno])}" r="4.5" fill="${s.cor}" stroke="${SUPERFICIE}" stroke-width="2"/>`).join('')}`;
  const fim = ANOS.length - 1;
  const rotFim = !m
    ? `<text x="${px(fim) + 7}" y="${py(series[0].v[fim]) + 4}" class="g-valor">${fmt.compacto(series[0].v[fim])}</text>`
    : Math.abs(py(series[0].v[fim]) - py(series[1].v[fim])) < 15
      ? '' // rótulos muito próximos: legenda e dica identificam as linhas
      : series.map((s) => `<text x="${px(fim) + 7}" y="${py(s.v[fim]) + 4}" class="g-valor">${fmt.int(s.v[fim])}</text>`).join('');
  const faixa = (largura - M.e - M.d) / (ANOS.length - 1);
  const alvos = ANOS.map((a, i) => `<rect x="${px(i) - faixa / 2}" y="0" width="${faixa}" height="${A}" fill="transparent" data-i="${i}" class="g-alvo" tabindex="-1"><title>${a}</title></rect>`).join('');

  alvo.innerHTML = `<svg width="${largura}" height="${A}" viewBox="0 0 ${largura} ${A}" role="img" aria-label="Linha de evolução populacional de 2001 a 2008">${grade}${quebra}<line x1="${M.e}" x2="${largura - M.d}" y1="${A - M.b}" y2="${A - M.b}" class="g-base"/>${eixoX}${linhas}${cursor}${rotFim}${alvos}</svg><div class="dica" hidden></div>`;

  const dica = alvo.querySelector('.dica');
  alvo.querySelectorAll('.g-alvo').forEach((r) => {
    const i = Number(r.dataset.i);
    r.addEventListener('pointerenter', () => {
      dica.hidden = false;
      dica.innerHTML = `<b>${ANOS[i]}${ANOS[i] === 2007 ? ' · Contagem' : ''}</b>${series.map((s) => `<span><i style="background:${s.cor}"></i>${escapar(s.nome)} ${fmt.int(s.bruto[i])}</span>`).join('')}`;
      const x = Math.min(Math.max(px(i) - dica.offsetWidth / 2, 0), largura - dica.offsetWidth);
      dica.style.left = `${x}px`;
    });
    r.addEventListener('pointerleave', () => { dica.hidden = true; });
    r.addEventListener('click', () => definir({ ano: ANOS[i] }));
  });

  raiz.querySelector('#pn-linha-tab').innerHTML = `<table class="mini"><thead><tr><th>Ano</th>${series.map((s) => `<th>${escapar(s.nome)}</th>`).join('')}</tr></thead><tbody>${ANOS.map((a, i) => `<tr><td>${a}</td>${series.map((s) => `<td>${fmt.int(s.bruto[i])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/* ---------- ranking ---------- */
function desenharRanking() {
  const metrica = estado.metrica === 'nenhuma' ? 'pop' : estado.metrica;
  const info = METRICAS[metrica];
  const lista = estado.municipios
    .map((p) => ({ p, v: valorMetrica(p, metrica) }))
    .sort((a, b) => b.v - a.v);
  const max = Math.max(...lista.map((d) => d.v), 0.001);
  const min = Math.min(...lista.map((d) => d.v), 0);
  const amp = max - min || 1;
  raiz.querySelector('#pn-rank-metrica').textContent = info.rotulo.toLowerCase();
  raiz.querySelector('#pn-rank-sub').textContent = estado.ano === ANOS[0] && metrica === 'cresc'
    ? 'Escolha um ano depois de 2001 para ver o crescimento.'
    : `${info.unidade[0].toUpperCase()}${info.unidade.slice(1)}, ${estado.ano}. Selecione um município para ver seu perfil.`;
  const ol = raiz.querySelector('#pn-rank');
  ol.innerHTML = lista.map(({ p, v }) => {
    const larg = Math.abs(v) / amp * 100;
    const ini = v < 0 ? (v - min) / amp * 100 : -min / amp * 100;
    const sel = p.NOME_ACEN === estado.selecionado;
    return `<li><button type="button" class="linha${sel ? ' sel' : ''}" data-nome="${escapar(p.NOME_ACEN)}" aria-pressed="${sel}">
      <span class="r-nome">${escapar(p.NOME_ACEN)}</span>
      <span class="r-valor">${formataMetrica(v, metrica)}</span>
      <span class="r-trilho"><i class="${v < 0 ? 'neg' : ''}" style="left:${ini.toFixed(2)}%;width:${Math.max(larg, 0.4).toFixed(2)}%"></i></span>
    </button></li>`;
  }).join('');
  ol.querySelectorAll('button').forEach((b) => {
    const nome = b.dataset.nome;
    b.addEventListener('click', () => definir({ selecionado: estado.selecionado === nome ? null : nome }));
    b.addEventListener('pointerenter', () => aoPassarLinha(nome));
    b.addEventListener('pointerleave', () => aoPassarLinha(null));
    b.addEventListener('focus', () => aoPassarLinha(nome));
    b.addEventListener('blur', () => aoPassarLinha(null));
  });
}
