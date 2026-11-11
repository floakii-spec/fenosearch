# Links de compra

Cada `<loja>.txt` tem as URLs de produto de uma loja brasileira (tiradas do sitemap).
`match.js` cruza os produtos com `strains.js` e grava `<loja>.json`; `build.js` junta tudo em `../buy.js`.

    for s in seedclub dentista donaflorinda maconhaseeds santasemente pyramid; do node shops/match.js $s; done
    MISS=1 node shops/match.js seedclub   # produtos sem strain correspondente
    node shops/build.js

Lojas (indicadas pelo dono do site): Seed Club, Dentista Seeds, Dona Florinda, Maconha Seeds Bank, Santa Semente, Pyramid Seeds. Netseeds também foi pedida, mas o site bloqueia a coleta automática do sitemap.
