// Definições de camadas, campos e classes temáticas

export const ANOS = [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008];
export const campoPop = (ano) => `POPTOTAL${String(ano).slice(2)}`;

const camposPop = ANOS.map((a) => ({ k: campoPop(a), label: `Pop. ${a}`, tipo: 'int' }));

export const CAMADAS = {
  municipios: {
    titulo: 'Municípios',
    arquivo: 'data/municipios.js',
    nomeCampo: 'NOME_ACEN',
    campos: [
      { k: 'NOME_ACEN', label: 'Município' },
      { k: 'COD_IBGE', label: 'Código IBGE' },
      ...camposPop,
      { k: 'NOMEMICRO', label: 'Microrregião' },
      { k: 'NOMEMESO', label: 'Mesorregião' },
      { k: 'REG_PLANEJ', label: 'Região de planejamento' },
      { k: 'ESTADO', label: 'UF' },
      { k: 'NOME', label: 'Nome sem acento' },
    ],
  },
  localidades: {
    titulo: 'Localidades',
    arquivo: 'data/localidades.js',
    nomeCampo: 'NOME_ACEN',
    campos: [
      { k: 'NOME_ACEN', label: 'Localidade' },
      { k: 'GRUPO', label: 'Grupo' },
      { k: 'MUNICIPIO', label: 'Município' },
      { k: 'COD_MUN', label: 'Código do município' },
      { k: 'POPULACAO', label: 'População', tipo: 'int' },
      { k: 'SRTM_M', label: 'Altitude SRTM (m)', tipo: 'int' },
      { k: 'LEGENDA', label: 'Classe' },
      { k: 'OBS', label: 'Observação' },
      { k: 'SETOR_CENS', label: 'Setor censitário' },
      { k: 'SITUACAO', label: 'Código de situação', tipo: 'int' },
      { k: 'NOMEMICRO', label: 'Microrregião' },
      { k: 'NOMEMESO', label: 'Mesorregião' },
      { k: 'REG_PLANEJ', label: 'Região de planejamento' },
      { k: 'REGIAO', label: 'Região' },
      { k: 'ESTADO', label: 'UF' },
      { k: 'NOME', label: 'Nome sem acento' },
    ],
  },
  rodovias: {
    titulo: 'Malha viária',
    arquivo: 'data/rodovias.js',
    nomeCampo: 'NOME',
    campos: [
      { k: 'NOME', label: 'Nome' },
      { k: 'TIPO', label: 'Tipo' },
      { k: 'SITUACAO', label: 'Situação' },
      { k: 'JURISDICAO', label: 'Jurisdição' },
      { k: 'EXTEN_KM', label: 'Extensão (km)', tipo: 'dec' },
    ],
  },
  hidrografia: {
    titulo: 'Hidrografia',
    arquivo: 'data/hidrografia.js',
    nomeCampo: 'CURSO',
    campos: [
      { k: 'CURSO', label: 'Curso d’água' },
      { k: 'DREN_ACENT', label: 'Drenagem' },
      { k: 'COMP_KM', label: 'Comprimento (km)', tipo: 'dec' },
      { k: 'ESCALA', label: 'Escala de origem' },
    ],
  },
};

const VERDE = ['#DDEFE8', '#A9D8C8', '#6FBBA7', '#2F9384', '#0B5E55'];

export const METRICAS = {
  pop: {
    rotulo: 'População',
    unidade: 'habitantes',
    cortes: [5000, 10000, 25000, 100000],
    cores: VERDE,
    classes: ['até 5 mil', '5 a 10 mil', '10 a 25 mil', '25 a 100 mil', 'mais de 100 mil'],
  },
  dens: {
    rotulo: 'Densidade',
    unidade: 'hab./km²',
    cortes: [25, 50, 100, 500],
    cores: VERDE,
    classes: ['até 25', '25 a 50', '50 a 100', '100 a 500', 'mais de 500'],
  },
  cresc: {
    rotulo: 'Crescimento',
    unidade: '% desde 2001',
    cortes: [0, 10, 20, 30],
    cores: ['#C4532C', '#E4E8E4', '#A9D8C8', '#2F9384', '#0B5E55'],
    classes: ['queda', '0 a 10%', '10 a 20%', '20 a 30%', 'mais de 30%'],
  },
  nenhuma: { rotulo: 'Sem cor' },
};

export const classeDe = (metrica, valor) => {
  const { cortes } = METRICAS[metrica];
  let i = 0;
  while (i < cortes.length && valor >= cortes[i]) i += 1;
  return i;
};

// Identidade fixa das partes da barra de concentração (validadas para daltonismo)
export const PARTES = [
  { nome: 'Goiânia', cor: '#0E8A78', tinta: '#fff' },
  { nome: 'Aparecida de Goiânia', cor: '#D99A00', tinta: '#14211E' },
  { nome: 'Trindade', cor: '#C4532C', tinta: '#fff' },
  { nome: 'Senador Canedo', cor: '#2C7FC0', tinta: '#fff' },
];
export const COR_DEMAIS = '#B4BCB7';

export const ROTULO_VIA = [
  { id: 'federal', rotulo: 'Rodovia federal' },
  { id: 'estadual', rotulo: 'Rodovia estadual' },
  { id: 'municipal', rotulo: 'Via municipal' },
  { id: 'leito', rotulo: 'Leito natural' },
  { id: 'obra', rotulo: 'Em construção ou planejada' },
  { id: 'ferrovia', rotulo: 'Ferrovia' },
  { id: 'duto', rotulo: 'Duto' },
];

export const FUNDOS = [
  { id: 'claro', rotulo: 'Mapa claro' },
  { id: 'osm', rotulo: 'OpenStreetMap' },
  { id: 'satelite', rotulo: 'Imagem de satélite' },
  { id: 'nenhum', rotulo: 'Sem fundo' },
];
