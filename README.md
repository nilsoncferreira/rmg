# WebGIS da Região Metropolitana de Goiânia

Mapa interativo dos 20 municípios da região, com dashboard populacional (2001 a 2008), tabelas de atributos, busca e medição. Feito apenas com HTML, CSS e JavaScript: abre com dois cliques no `index.html` e pode ser hospedado gratuitamente no GitHub Pages.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todo o conteúdo desta pasta. A pasta `node_modules` é ignorada automaticamente.
3. No repositório, abra **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, selecione o ramo `main` e a pasta `/ (root)` e clique em **Save**.

O endereço será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`. Não é preciso nenhuma etapa de compilação no GitHub, porque os arquivos prontos já estão em `assets/`.

## Ver no computador

Dê dois cliques em `index.html`. Não é preciso instalar nada nem usar servidor web. Mantenha as pastas `assets` e `data` junto do arquivo. O mapa de fundo precisa de internet; as demais camadas funcionam sem conexão.

## Alterar o site

| Para mudar | Edite |
| --- | --- |
| Textos e estrutura da página | `index.html` |
| Cores e layout | `src/app.css` |
| Campos das tabelas, classes do mapa e mapas de fundo | `src/config.js` e `src/mapa.js` |
| Gráficos e indicadores | `src/painel.js` |

Os textos em `index.html` podem ser editados diretamente. Os arquivos em `assets/` são gerados a partir de `src/`; para alterar `src/`, é preciso ter o Node.js e gerar novamente os arquivos finais:

```bash
npm install
npm run build
```

## Atualizar os dados

Os dados ficam em `data/*.js`. Para atualizá-los, exporte o projeto novamente pelo qgis2web e execute uma única vez este script de preparação, que não é usado para abrir o site (requer Python com `shapely` e `pyproj`):

```bash
python tools/preparar_dados.py CAMINHO/DO/EXPORT_QGIS2WEB
```

Os nomes dos arquivos das camadas estão em `CAMADAS`, no início desse script.

## Sobre os dados

- **População:** atributos `POPTOTAL01` a `POPTOTAL08`. Os anos foram interpretados pelo nome do campo.
- **Quebra de série:** os valores de 2007 vêm da Contagem da População do IBGE. O site sinaliza essa mudança de base nos gráficos.
- **Densidade:** calculada com a área de cada polígono, que pode diferir um pouco da área oficial.
- **Localidades:** população zero foi convertida em “sem estimativa”, conforme o campo `OBS`.
- **Geometria:** coordenadas com 5 casas decimais. Hidrografia simplificada em cerca de 13 m e vias em cerca de 4 m. Nenhuma feição ou atributo foi removido.

## Tecnologias e créditos

- [OpenLayers](https://openlayers.org/) para o mapa, com gráficos em SVG sem bibliotecas externas.
- Fontes [Josefin Sans](https://fonts.google.com/specimen/Josefin+Sans) e [Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3), incluídas no site.
- Mapas de fundo: Esri e OpenStreetMap, sujeitos aos termos de uso de cada serviço.
