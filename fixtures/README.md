# Fixtures sintéticas do fork

Os dados usados pelo primeiro fluxo local ficam em
`client/src/data/productionChecklistFixtures.js` e não representam a base do
Koncluí nem uma conta de cliente.

O repositório local usa essas fixtures somente para inicializar o navegador.
As chaves de `localStorage` são versionadas com o prefixo
`ritmika.production.*`. O método `localChecklistRepository.reset()` recria o
estado sintético para testes manuais.
