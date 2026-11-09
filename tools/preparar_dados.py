# -*- coding: utf-8 -*-
"""Converte as camadas exportadas pelo qgis2web em arquivos JavaScript otimizados.

Cada arquivo guarda um GeoJSON em window.RM_DADOS, o que permite abrir o site
com dois cliques no index.html, sem servidor web.

Uso: python tools/preparar_dados.py <pasta_do_export_qgis2web>
Requer: shapely, pyproj.

- Mantém todos os atributos das feições e a quantidade de feições.
- Reduz coordenadas a 5 casas decimais (cerca de 1 m).
- Simplifica apenas as linhas de hidrografia e rodovias; os limites municipais só são
  arredondados, para que as divisas compartilhadas continuem coincidentes.
"""
import json
import sys
from pathlib import Path

from pyproj import Geod
from shapely.geometry import mapping, shape

ORIGEM = Path(sys.argv[1]) / "layers"
DESTINO = Path(__file__).resolve().parent.parent / "data"
GEOD = Geod(ellps="GRS80")

CAMADAS = {
    "municipios": ("LimiteMunicipal_2.js", 0),
    "hidrografia": ("Hidrografia_1.js", 0.00012),  # cerca de 13 m
    "rodovias": ("Rodovia_4.js", 0.00004),  # cerca de 4 m
    "localidades": ("SedeMunicipal_3.js", 0),
}
SEM_DECIMAL = {"POPTOTAL01", "POPTOTAL02", "POPTOTAL03", "POPTOTAL04", "POPTOTAL05", "POPTOTAL06",
               "POPTOTAL07", "POPTOTAL08", "SRTM_M", "SITUACAO"}


def ler(nome):
    texto = (ORIGEM / nome).read_text(encoding="utf-8")
    return json.loads(texto[texto.index("{"):].rstrip().rstrip(";"))


def arredondar(c):
    if isinstance(c[0], (int, float)):
        return [round(c[0], 5), round(c[1], 5)]
    saida = [arredondar(x) for x in c]
    if saida and isinstance(saida[0][0], (int, float)):
        limpo = [saida[0]]
        for p in saida[1:]:
            if p != limpo[-1]:
                limpo.append(p)
        return limpo
    return saida


def propriedades(p, camada):
    p = dict(p)
    for k in SEM_DECIMAL & p.keys():
        if isinstance(p[k], float) and p[k] == int(p[k]):
            p[k] = int(p[k])
    if camada == "localidades":
        # POPULACAO vem como texto; "0" significa "sem estimativa" no atributo OBS
        v = int(p["POPULACAO"] or 0)
        p["POPULACAO"] = v if v > 0 else None
    return p


def area_km2(geom):
    return abs(GEOD.geometry_area_perimeter(shape(geom))[0]) / 1e6


def compacta(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


DESTINO.mkdir(exist_ok=True)
for camada, (arquivo, tol) in CAMADAS.items():
    dados = ler(arquivo)
    saida = []
    for i, f in enumerate(dados["features"]):
        g = f["geometry"]
        if tol:
            g = mapping(shape(g).simplify(tol, preserve_topology=True))
        p = propriedades(f["properties"], camada)
        if camada == "municipios":
            p["_AREA_KM2"] = round(area_km2(f["geometry"]), 1)
        saida.append({"type": "Feature", "id": i, "properties": p,
                      "geometry": {"type": g["type"], "coordinates": arredondar(json.loads(json.dumps(g["coordinates"])))}})
    destino = DESTINO / f"{camada}.js"
    colecao = compacta({"type": "FeatureCollection", "features": saida})
    destino.write_text(f"(window.RM_DADOS=window.RM_DADOS||{{}}).{camada}={colecao};", encoding="utf-8")
    print(f"{camada:12s} {len(saida):5d} feições  {(ORIGEM / arquivo).stat().st_size / 1024:8.0f} KB -> {destino.stat().st_size / 1024:6.0f} KB")
