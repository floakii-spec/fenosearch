# FenoSearch

Atlas de strains: ficha, árvore genealógica, mapa de origem, comparação e a história da proibição no Brasil.

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

## Aba História

O artigo "Fumo de negro, erva maldita" (em `index.html`, constantes `HTL`, `HCH`, `HMYTH`, `HGLO`, `HWHO`) resume dois livros publicados sob CC BY 4.0:

- SAAD, Luísa. *"Fumo de negro": a criminalização da maconha no pós-abolição.* Salvador: EDUFBA, 2019.
- SOUZA, Jorge Emanuel Luz de. *Sonhos da diamba, controles do cotidiano.* Salvador: EDUFBA/CETAD, 2015.

Os itens de 2006 e 2024 da linha do tempo não vêm dos livros e estão marcados como "depois dos livros".

## Links de compartilhar

Cada strain tem um link próprio, `fenosearch.site/s/<id>`, que mostra nome, resumo e foto na prévia do WhatsApp e abre a ficha no app. As páginas ficam em `s/` e são geradas por `node mkshare.js`; rode de novo sempre que mudar `strains.js`.
