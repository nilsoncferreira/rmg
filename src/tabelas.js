// Tabelas de atributos de todas as camadas
import { intersects } from 'ol/extent.js';
import { CAMADAS } from './config.js';
import { escapar, fmt } from './estado.js';
import { carregar, fontes, mapa } from './mapa.js';

const POR_PAGINA = 50;
const estadoTab = {
  camada: 'municipios',
  busca: '',
  soArea: false,
  ordem: null,
  dir: 1,
  pagina: 0,
  linhaAtiva: null,
};
let raiz;
let aoEscolher = () => {};
const ordenador = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function iniciarTabelas(el, opcoes) {
  raiz = el;
  aoEscolher = opcoes.aoEscolher;
  raiz.querySelector('#tab-abas').innerHTML = Object.entries(CAMADAS).map(([id, c]) => `
    <button type="button" role="tab" id="aba-${id}" data-id="${id}" aria-controls="tab-corpo" aria-selected="${id === estadoTab.camada}">${c.titulo}</button>`).join('');
  raiz.querySelector('#tab-abas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) abrirCamada(b.dataset.id);
  });
  raiz.querySelector('#tab-abas').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const ids = Object.keys(CAMADAS);
    const i = ids.indexOf(estadoTab.camada) + (e.key === 'ArrowRight' ? 1 : -1);
    const id = ids[(i + ids.length) % ids.length];
    abrirCamada(id);
    raiz.querySelector(`#aba-${id}`).focus();
  });
  raiz.querySelector('#tab-busca').addEventListener('input', (e) => {
    estadoTab.busca = e.target.value;
    estadoTab.pagina = 0;
    desenhar();
  });
  raiz.querySelector('#tab-area').addEventListener('change', (e) => {
    estadoTab.soArea = e.target.checked;
    estadoTab.pagina = 0;
    desenhar();
  });
  raiz.querySelector('#tab-csv').addEventListener('click', baixarCSV);
  raiz.querySelector('#tab-ant').addEventListener('click', () => { estadoTab.pagina -= 1; desenhar(); });
  raiz.querySelector('#tab-prox').addEventListener('click', () => { estadoTab.pagina += 1; desenhar(); });
  raiz.querySelector('#tab-corpo').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-k]');
    if (th) {
      if (estadoTab.ordem === th.dataset.k) estadoTab.dir *= -1;
      else { estadoTab.ordem = th.dataset.k; estadoTab.dir = 1; }
      estadoTab.pagina = 0;
      desenhar();
      return;
    }
    const tr = e.target.closest('tr[data-fid]');
    if (tr) escolher(tr.dataset.fid);
  });
  raiz.querySelector('#tab-corpo').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const th = e.target.closest('th[data-k]');
    const tr = e.target.closest('tr[data-fid]');
    if (th || tr) { e.preventDefault(); e.target.click(); }
  });
  mapa.on('moveend', () => { if (estadoTab.soArea && !raiz.hidden) desenhar(); });
}

function escolher(fid) {
  const f = fontes[estadoTab.camada].getFeatureById(Number(fid));
  if (!f) return;
  estadoTab.linhaAtiva = Number(fid);
  raiz.querySelectorAll('tr.ativa').forEach((t) => t.classList.remove('ativa'));
  raiz.querySelector(`tr[data-fid="${fid}"]`)?.classList.add('ativa');
  aoEscolher(f, estadoTab.camada);
}

export async function abrirCamada(id, fid = null) {
  const mudou = estadoTab.camada !== id;
  estadoTab.camada = id;
  if (mudou) {
    estadoTab.ordem = null;
    estadoTab.dir = 1;
    estadoTab.pagina = 0;
    estadoTab.busca = '';
    raiz.querySelector('#tab-busca').value = '';
  }
  estadoTab.linhaAtiva = fid;
  raiz.querySelectorAll('[role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.id === id));
  raiz.querySelector('#tab-busca').setAttribute('placeholder', `Filtrar ${CAMADAS[id].titulo.toLowerCase()}`);
  const corpo = raiz.querySelector('#tab-corpo');
  if (!fontes[id].getFeatures().length) {
    corpo.innerHTML = `<p class="tab-aviso">Carregando ${CAMADAS[id].titulo.toLowerCase()}…</p>`;
    await carregar(id);
  }
  if (estadoTab.camada !== id) return;
  if (fid !== null) {
    estadoTab.busca = '';
    estadoTab.soArea = false;
    raiz.querySelector('#tab-busca').value = '';
    raiz.querySelector('#tab-area').checked = false;
    const i = linhas().findIndex((f) => f.getId() === fid);
    estadoTab.pagina = i < 0 ? 0 : Math.floor(i / POR_PAGINA);
  }
  desenhar();
  if (fid !== null) raiz.querySelector(`tr[data-fid="${fid}"]`)?.scrollIntoView({ block: 'center' });
}

function linhas() {
  const { camada, busca, soArea, ordem, dir } = estadoTab;
  const campos = CAMADAS[camada].campos;
  let lista = fontes[camada].getFeatures();
  if (soArea) {
    const ext = mapa.getView().calculateExtent(mapa.getSize());
    lista = lista.filter((f) => intersects(ext, f.getGeometry().getExtent()));
  }
  if (busca.trim()) {
    const t = norm(busca.trim());
    lista = lista.filter((f) => campos.some(({ k }) => norm(f.get(k)).includes(t)));
  }
  const ord = [...lista];
  if (ordem) {
    const numerico = campos.find((c) => c.k === ordem)?.tipo;
    ord.sort((a, b) => {
      const x = a.get(ordem);
      const y = b.get(ordem);
      if (x == null || x === '') return 1;
      if (y == null || y === '') return -1;
      return dir * (numerico ? x - y : ordenador.compare(x, y));
    });
  } else {
    ord.sort((a, b) => a.getId() - b.getId());
  }
  return ord;
}

const celula = (v, c) => {
  if (v == null || v === '') return '<span class="vazio">—</span>';
  if (c.tipo === 'int') return fmt.int(v);
  if (c.tipo === 'dec') return fmt.dec(v);
  return escapar(v);
};

function desenhar() {
  const { camada, ordem, dir } = estadoTab;
  const { campos } = CAMADAS[camada];
  const todas = linhas();
  const totalCamada = fontes[camada].getFeatures().length;
  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  estadoTab.pagina = Math.min(Math.max(estadoTab.pagina, 0), paginas - 1);
  const ini = estadoTab.pagina * POR_PAGINA;
  const pagina = todas.slice(ini, ini + POR_PAGINA);
  const aria = (k) => (ordem === k ? (dir > 0 ? 'ascending' : 'descending') : 'none');
  const seta = (k) => (ordem === k ? (dir > 0 ? ' ↑' : ' ↓') : '');
  const cabeca = campos.map((c) => `<th scope="col" class="${c.tipo ? 'num' : ''}" data-k="${c.k}" tabindex="0" aria-sort="${aria(c.k)}" title="Campo original: ${c.k}">${c.label}${seta(c.k)}</th>`).join('');
  const corpo = pagina.map((f) => `<tr data-fid="${f.getId()}" tabindex="0" class="${f.getId() === estadoTab.linhaAtiva ? 'ativa' : ''}">${campos.map((c) => `<td class="${c.tipo ? 'num' : ''}">${celula(f.get(c.k), c)}</td>`).join('')}</tr>`).join('');
  raiz.querySelector('#tab-corpo').innerHTML = pagina.length
    ? `<table class="atributos"><caption class="so-leitor">Tabela de atributos de ${CAMADAS[camada].titulo}</caption><thead><tr>${cabeca}</tr></thead><tbody>${corpo}</tbody></table>`
    : '<p class="tab-aviso">Nenhum registro atende a este filtro. Altere o texto ou desmarque “Só a área visível”.</p>';
  raiz.querySelector('#tab-conta').textContent = todas.length === totalCamada
    ? `${fmt.int(totalCamada)} registros`
    : `${fmt.int(todas.length)} de ${fmt.int(totalCamada)} registros`;
  raiz.querySelector('#tab-pagina').textContent = todas.length
    ? `${fmt.int(ini + 1)}–${fmt.int(ini + pagina.length)}`
    : '0';
  raiz.querySelector('#tab-ant').disabled = estadoTab.pagina === 0;
  raiz.querySelector('#tab-prox').disabled = estadoTab.pagina >= paginas - 1;
  raiz.querySelector('#tab-csv').disabled = !todas.length;
}

function baixarCSV() {
  const { camada } = estadoTab;
  const { campos } = CAMADAS[camada];
  const q = (v, c) => {
    if (v == null) return '';
    if (c.tipo === 'dec') return String(v).replace('.', ',');
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texto = [campos.map((c) => c.k).join(';'), ...linhas().map((f) => campos.map((c) => q(f.get(c.k), c)).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${texto}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${camada}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
