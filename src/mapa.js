// Mapa: fundos, camadas temáticas, destaque, consulta e medição
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorImageLayer from 'ol/layer/VectorImage.js';
import XYZ from 'ol/source/XYZ.js';
import VectorSource from 'ol/source/Vector.js';
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style.js';
import { Attribution, ScaleLine } from 'ol/control.js';
import Draw from 'ol/interaction/Draw.js';
import { createEmpty, extend, isEmpty } from 'ol/extent.js';
import { toLonLat } from 'ol/proj.js';
import { getArea, getLength } from 'ol/sphere.js';
import { LineString, Polygon } from 'ol/geom.js';
import { CAMADAS, METRICAS, classeDe } from './config.js';
import { estado, valorMetrica, fmt } from './estado.js';

const FONTE = '"Source Sans 3", "Segoe UI", Arial, sans-serif';
const formato = new GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });

export const fontes = {
  municipios: new VectorSource({ overlaps: false }),
  localidades: new VectorSource(),
  rodovias: new VectorSource(),
  hidrografia: new VectorSource(),
};
const carregando = {};

// Os dados são arquivos .js, para o site também abrir direto do disco, sem servidor
const lerScript = (arquivo) => new Promise((resolve, rejeita) => {
  const s = document.createElement('script');
  s.src = arquivo;
  s.onload = resolve;
  s.onerror = () => rejeita(new Error(`Não foi possível ler ${arquivo}.`));
  document.head.appendChild(s);
});

export function carregar(id) {
  if (!carregando[id]) {
    carregando[id] = lerScript(CAMADAS[id].arquivo)
      .then(() => {
        const feicoes = formato.readFeatures(window.RM_DADOS[id]);
        delete window.RM_DADOS[id]; // libera a memória do GeoJSON já convertido
        feicoes.forEach((f) => f.set('_camada', id, true));
        fontes[id].addFeatures(feicoes);
        return feicoes;
      });
  }
  return carregando[id];
}

/* ---------- estilos ---------- */
const zoomDe = (resolucao) => Math.log2(156543.03392 / resolucao);

const cacheFill = {};
const preenchimento = (cor) => {
  cacheFill[cor] ||= new Style({ fill: new Fill({ color: cor }) });
  return cacheFill[cor];
};
function estiloCoropletico(feicao) {
  const { metrica } = estado;
  if (metrica === 'nenhuma') return null;
  if (metrica === 'cresc' && estado.ano === 2001) return preenchimento('#E4E8E4');
  const v = valorMetrica(feicao.getProperties());
  return preenchimento(METRICAS[metrica].cores[classeDe(metrica, v)]);
}
const estiloLimite = new Style({ stroke: new Stroke({ color: '#14211E', width: 1 }) });

const RIO = '#2A7DA6';
const estilosRio = {
  '1:1.000.000': new Style({ stroke: new Stroke({ color: RIO, width: 1.3 }) }),
  '1:250.000': new Style({ stroke: new Stroke({ color: RIO, width: 0.9 }) }),
  '1:100.000': new Style({ stroke: new Stroke({ color: RIO, width: 0.7 }) }),
};
// As feições de escala mais detalhada só aparecem quando há zoom suficiente para distingui-las
const zoomMinRio = { '1:1.000.000': 0, '1:250.000': 10.4, '1:100.000': 11.4 };
const rioFino = new Style({ stroke: new Stroke({ color: RIO, width: 0.6 }) });
function estiloRio(f, res) {
  const e = f.get('ESCALA');
  const z = zoomDe(res);
  if (z < 9.6) return f.get('CURSO') && e === '1:1.000.000' ? rioFino : null;
  return z >= zoomMinRio[e] ? estilosRio[e] : null;
}

const VIA = '#B8321F';
const tracoVia = (largura, opcoes = {}) => ({
  stroke: new Stroke({ color: opcoes.cor || VIA, width: largura, lineDash: opcoes.traco, lineCap: opcoes.traco ? 'butt' : 'round', lineJoin: 'round' }),
});
export const estilosVia = {
  federal: tracoVia(2.4),
  estadual: tracoVia(1.6),
  municipal: tracoVia(0.9),
  leito: tracoVia(0.9, { cor: 'rgba(184,50,31,.55)' }),
  obra: tracoVia(1.5, { traco: [6, 4] }),
  ferrovia: tracoVia(1.5, { cor: '#2B3532', traco: [7, 3] }),
  duto: tracoVia(1.5, { cor: '#6D4C9A', traco: [2, 4] }),
};
export function classeVia(p) {
  if (p.TIPO === 'Ferrovia') return 'ferrovia';
  if (p.TIPO === 'Duto') return 'duto';
  if (/Planejada|Construcao/.test(p.SITUACAO)) return 'obra';
  if (/Leito/.test(p.SITUACAO)) return 'leito';
  if (p.JURISDICAO === 'Federal') return 'federal';
  if (p.JURISDICAO === 'Estadual') return 'estadual';
  return 'municipal';
}
const estiloVia = (() => {
  const base = Object.fromEntries(Object.entries(estilosVia).map(([k, v]) => [k, new Style(v)]));
  const finos = Object.fromEntries(Object.entries(estilosVia).map(([k, v]) => {
    const s = v.stroke.clone();
    s.setWidth(v.stroke.getWidth() * 0.62);
    return [k, new Style({ stroke: s })];
  }));
  const rotulo = new Style({
    text: new Text({
      font: `600 11px ${FONTE}`,
      placement: 'line',
      fill: new Fill({ color: '#8E2415' }),
      stroke: new Stroke({ color: 'rgba(255,255,255,.95)', width: 3 }),
      repeat: 600,
    }),
  });
  return (f, res) => {
    const p = f.getProperties();
    const z = zoomDe(res);
    const classe = classeVia(p);
    if (z < 10.2 && classe === 'municipal') return null;
    if (z < 9.6) return classe === 'leito' ? null : finos[classe];
    const principal = /^(BR|GO) /.test(p.NOME || '') || p.NOME === 'Anel Viario';
    if (p.NOME && ((principal && z >= 10.8) || z >= 13)) {
      rotulo.getText().setText(p.NOME === 'Anel Viario' ? 'Anel Viário' : p.NOME);
      return [base[classe], rotulo];
    }
    return base[classe];
  };
})();

const halo = (cor = 'rgba(255,255,255,.92)', w = 3.5) => new Stroke({ color: cor, width: w });
const anel = new CircleStyle({ radius: 5, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#14211E', width: 1.6 }), declutterMode: 'obstacle' });
const miolo = new CircleStyle({ radius: 1.8, fill: new Fill({ color: '#14211E' }), declutterMode: 'none' });
const anelCapital = new CircleStyle({ radius: 8.5, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#14211E', width: 1.8 }), declutterMode: 'obstacle' });
const estrela = new RegularShape({ points: 5, radius: 6.6, radius2: 2.7, fill: new Fill({ color: '#14211E' }), declutterMode: 'none' });
const pontoLocal = new CircleStyle({ radius: 2.6, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#14211E', width: 1.1 }), declutterMode: 'obstacle' });

const texto = (peso, tam, deslocamento = 11) => new Text({
  font: `${peso} ${tam}px ${FONTE}`,
  textAlign: 'left',
  offsetX: deslocamento,
  fill: new Fill({ color: '#14211E' }),
  stroke: halo(),
});
const rotCapital = new Style({ text: texto(700, 15, 17), zIndex: 3 });
const rotSede = new Style({ text: texto(600, 13), zIndex: 2 });
const rotLocal = new Style({ text: texto(400, 12, 7), zIndex: 1 });
const eCapital = [new Style({ image: anelCapital, zIndex: 3 }), new Style({ image: estrela, zIndex: 3 }), rotCapital];
const eSede = [new Style({ image: anel, zIndex: 2 }), new Style({ image: miolo, zIndex: 2 }), rotSede];
const eLocal = [new Style({ image: pontoLocal, zIndex: 1 }), rotLocal];
function estiloLocal(f, res) {
  const g = f.get('GRUPO');
  const nome = f.get('NOME_ACEN');
  if (g === 'Capital Estadual') { rotCapital.getText().setText(nome); return eCapital; }
  if (g === 'Sede') { rotSede.getText().setText(nome); return eSede; }
  if (zoomDe(res) < 11) return null;
  rotLocal.getText().setText(nome);
  return eLocal;
}

const realceLinha = [
  new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,.95)', width: 7 }) }),
  new Style({ stroke: new Stroke({ color: '#E8A800', width: 3.5 }) }),
];
const realcePonto = new Style({ image: new CircleStyle({ radius: 11, fill: new Fill({ color: 'rgba(232,168,0,.3)' }), stroke: new Stroke({ color: '#E8A800', width: 3 }) }) });
const realceArea = [
  new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,.95)', width: 5 }) }),
  new Style({ stroke: new Stroke({ color: '#14211E', width: 2.5 }), fill: new Fill({ color: 'rgba(232,168,0,.14)' }) }),
];
const estiloRealce = (f) => {
  const t = f.getGeometry().getType();
  if (t.endsWith('Point')) return realcePonto;
  return t.endsWith('Polygon') ? realceArea : realceLinha;
};
const estiloPassar = new Style({ stroke: new Stroke({ color: '#14211E', width: 2.2 }) });

/* ---------- camadas ---------- */
const fundos = {
  claro: new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attributions: 'Mapa de fundo © Esri',
      maxZoom: 16,
    }),
  }),
  osm: new TileLayer({
    visible: false,
    source: new XYZ({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attributions: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      maxZoom: 19,
    }),
  }),
  satelite: new TileLayer({
    visible: false,
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attributions: 'Imagem © Esri',
      maxZoom: 18,
    }),
  }),
};

const REGIAO_FILTRO = 'rotulos';
export const camadas = {
  preenchimento: new VectorLayer({ source: fontes.municipios, style: estiloCoropletico, opacity: 0.78, updateWhileAnimating: false }),
  hidrografia: new VectorImageLayer({ source: fontes.hidrografia, style: estiloRio, imageRatio: 1.5 }),
  limites: new VectorLayer({ source: fontes.municipios, style: estiloLimite, updateWhileAnimating: true }),
  rodovias: new VectorLayer({ source: fontes.rodovias, style: estiloVia, declutter: REGIAO_FILTRO, renderBuffer: 60 }),
  localidades: new VectorLayer({ source: fontes.localidades, style: estiloLocal, declutter: REGIAO_FILTRO, updateWhileInteracting: true }),
};

const fonteRealce = new VectorSource();
const fontePassar = new VectorSource();
const fonteMedida = new VectorSource();
const camadaPassar = new VectorLayer({ source: fontePassar, style: estiloPassar, zIndex: 20 });
const camadaRealce = new VectorLayer({ source: fonteRealce, style: estiloRealce, zIndex: 21 });
const camadaMedida = new VectorLayer({
  source: fonteMedida,
  zIndex: 22,
  style: new Style({
    stroke: new Stroke({ color: '#14211E', width: 2.5, lineDash: [8, 5] }),
    fill: new Fill({ color: 'rgba(242,183,5,.22)' }),
  }),
});

export let mapa;
let popup;



export function iniciarMapa() {
  mapa = new Map({
    target: 'mapa',
    layers: [
      ...Object.values(fundos),
      camadas.preenchimento,
      camadas.hidrografia,
      camadas.limites,
      camadas.rodovias,
      camadas.localidades,
      camadaPassar,
      camadaRealce,
      camadaMedida,
    ],
    view: new View({ center: [-5478000, -1890000], zoom: 9.5, minZoom: 7, maxZoom: 18, constrainResolution: false }),
    controls: [
      new ScaleLine({ target: 'status-escala', units: 'metric', minWidth: 70 }),
      new Attribution({ target: 'status-credito', collapsible: false }),
    ],
  });
  popup = new Overlay({
    element: document.getElementById('consulta'),
    positioning: 'bottom-center',
    offset: [0, -12],
    autoPan: { animation: { duration: 200 }, margin: 16 },
  });
  mapa.addOverlay(popup);
  new ResizeObserver(() => mapa.updateSize()).observe(document.getElementById('mapa'));
  mapa.on('pointermove', (e) => {
    const [lon, lat] = toLonLat(e.coordinate);
    const hemN = lat >= 0 ? 'N' : 'S';
    const hemL = lon >= 0 ? 'L' : 'O';
    document.getElementById('status-coord').textContent = `${Math.abs(lat).toFixed(4).replace('.', ',')}° ${hemN}  ${Math.abs(lon).toFixed(4).replace('.', ',')}° ${hemL}`;
  });
  return mapa;
}

export const irParaInicio = (duracao = 450) => {
  const ext = fontes.municipios.getExtent();
  if (!ext || isEmpty(ext)) return;
  const baixo = (document.getElementById('controle')?.offsetHeight || 0) + 24;
  const cartao = document.getElementById('camadas');
  const esquerda = cartao.hidden || cartao.offsetWidth >= mapa.getSize()[0] ? 24 : cartao.offsetWidth + 24;
  mapa.getView().fit(ext, { padding: [24, window.innerWidth < 860 ? 16 : 60, baixo, esquerda], duration: duracao });
};

export const redesenharTema = () => camadas.preenchimento.changed();

export function definirFundo(id) {
  Object.entries(fundos).forEach(([k, c]) => c.setVisible(k === id));
}

export function definirVisivel(id, visivel) {
  if (id === 'municipios') {
    camadas.preenchimento.setVisible(visivel);
    camadas.limites.setVisible(visivel);
  } else {
    camadas[id].setVisible(visivel);
  }
}

export const definirOpacidade = (v) => camadas.preenchimento.setOpacity(v);

export function aproximar(feicoes, maxZoom = 13) {
  const ext = createEmpty();
  feicoes.forEach((f) => extend(ext, f.getGeometry().getExtent()));
  if (isEmpty(ext)) return;
  const baixo = (document.getElementById('controle')?.offsetHeight || 0) + 30;
  const cartao = document.getElementById('camadas');
  const esquerda = cartao.hidden || cartao.offsetWidth >= mapa.getSize()[0] ? 40 : cartao.offsetWidth + 40;
  mapa.getView().fit(ext, { padding: [40, 60, baixo, esquerda], maxZoom, duration: 500 });
}

export function realcar(feicoes) {
  fonteRealce.clear();
  if (feicoes?.length) fonteRealce.addFeatures(feicoes.map((f) => f.clone()));
}

export function passarSobre(feicao) {
  fontePassar.clear();
  if (feicao) fontePassar.addFeature(feicao.clone());
}

export function municipioPorNome(nome) {
  return fontes.municipios.getFeatures().find((f) => f.get('NOME_ACEN') === nome);
}

/* ---------- consulta ---------- */
const CAMADAS_CONSULTA = () => [
  [camadas.localidades, 'localidades'],
  [camadas.rodovias, 'rodovias'],
  [camadas.hidrografia, 'hidrografia'],
  [camadas.preenchimento, 'municipios'],
  [camadas.limites, 'municipios'],
];

export function feicaoEm(pixel, incluirRios = true) {
  const ordem = CAMADAS_CONSULTA();
  const achados = [];
  mapa.forEachFeatureAtPixel(pixel, (f, c) => { achados.push([f, c]); }, {
    hitTolerance: 5,
    layerFilter: (c) => ordem.some(([k]) => k === c) && (incluirRios || c !== camadas.hidrografia),
  });
  for (const [c] of ordem) {
    const a = achados.find(([, k]) => k === c);
    if (a) return a[0];
  }
  return null;
}

export const mostrarConsulta = (coord) => popup.setPosition(coord);
export const fecharConsulta = () => popup.setPosition(undefined);

/* ---------- medição ---------- */
let desenho = null;
let dicaMedida = null;

export const medindo = () => Boolean(desenho);

function formataMedida(geom) {
  if (geom instanceof Polygon) {
    const km2 = getArea(geom) / 1e6;
    return km2 >= 1 ? `${fmt.d1(km2)} km²` : `${fmt.int(km2 * 100)} ha`;
  }
  const m = getLength(geom);
  return m >= 1000 ? `${fmt.d1(m / 1000)} km` : `${fmt.int(m)} m`;
}

export function pararMedicao(limpar = true) {
  if (desenho) mapa.removeInteraction(desenho);
  desenho = null;
  if (limpar) {
    fonteMedida.clear();
    if (dicaMedida) mapa.removeOverlay(dicaMedida);
    dicaMedida = null;
  }
  document.getElementById('mapa').classList.remove('medindo');
}

export function iniciarMedicao(tipo) {
  pararMedicao();
  fecharConsulta();
  const el = document.createElement('div');
  el.className = 'dica-medida';
  dicaMedida = new Overlay({ element: el, positioning: 'bottom-center', offset: [0, -10], stopEvent: false });
  mapa.addOverlay(dicaMedida);
  desenho = new Draw({ source: fonteMedida, type: tipo === 'area' ? 'Polygon' : 'LineString', style: camadaMedida.getStyle() });
  desenho.on('drawstart', (ev) => {
    fonteMedida.clear();
    ev.feature.getGeometry().on('change', (e) => {
      const g = e.target;
      el.textContent = formataMedida(g);
      dicaMedida.setPosition(g instanceof LineString ? g.getLastCoordinate() : g.getInteriorPoint().getCoordinates());
    });
  });
  mapa.addInteraction(desenho);
  document.getElementById('mapa').classList.add('medindo');
}
