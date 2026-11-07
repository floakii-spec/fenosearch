# FenoSearch

Atlas de strains: ficha, árvore genealógica, mapa de origem e comparação.

Site estático publicado em https://fenosearch.site via Netlify. Cada push na branch `main` faz o deploy automático.

## Estrutura

- `index.html`: o app inteiro (HTML, CSS e JS).
- `strains.js`: os dados de todas as strains (`window.STRAINS`).
- `thumb/<id>.webp`: miniaturas (260px), carregadas sob demanda.
- `hi/<id>.webp`: fotos da ficha (720px), carregadas ao abrir a strain.

## Dados

As 306 strains originais foram curadas à mão. As demais (`conf: "b"`) vêm de bases públicas (coletas do Leafly e do Seedfinder no GitHub).
com origem e breeder deixados como "Desconhecida/Desconhecido" quando a fonte não informa.

Campos `thcx` e `tex` marcam strains em que a base não informa THC ou terpenos; o app mostra "não informado".
