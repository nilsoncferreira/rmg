// Estado compartilhado entre mapa, painel e tabelas
import { ANOS, campoPop } from './config.js';

const ouvintes = new Set();

export const estado = {
  ano: ANOS[ANOS.length - 1],
  metrica: 'pop',
  selecionado: null, // NOME_ACEN do município
  municipios: [],
};

export const assinar = (fn) => ouvintes.add(fn);
export const definir = (mudanca) => {
  Object.assign(estado, mudanca);
  ouvintes.forEach((fn) => fn(mudanca));
};

export const pop = (p, ano = estado.ano) => p[campoPop(ano)];
export const densidade = (p, ano = estado.ano) => pop(p, ano) / p._AREA_KM2;
export const crescimento = (p, ano = estado.ano) => (pop(p, ano) / pop(p, ANOS[0]) - 1) * 100;

export const valorMetrica = (p, metrica = estado.metrica, ano = estado.ano) => {
  if (metrica === 'dens') return densidade(p, ano);
  if (metrica === 'cresc') return crescimento(p, ano);
  return pop(p, ano);
};

export const totalRM = (ano = estado.ano) => estado.municipios.reduce((s, p) => s + pop(p, ano), 0);
export const areaRM = () => estado.municipios.reduce((s, p) => s + p._AREA_KM2, 0);

const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dec3 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

export const fmt = {
  int: (v) => int.format(v),
  dec: (v) => dec3.format(v),
  d1: (v) => dec1.format(v),
  pct: (v) => `${dec1.format(v)}%`,
  sinal: (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${dec1.format(Math.abs(v))}%`,
  compacto: (v) => {
    if (Math.abs(v) >= 1e6) return `${dec1.format(v / 1e6)} mi`;
    if (Math.abs(v) >= 1e4) return `${int.format(v / 1e3)} mil`;
    return int.format(v);
  },
};

export const formataMetrica = (v, metrica = estado.metrica) => {
  if (metrica === 'dens') return v >= 100 ? int.format(v) : dec1.format(v);
  if (metrica === 'cresc') return fmt.sinal(v);
  return int.format(v);
};

export const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
