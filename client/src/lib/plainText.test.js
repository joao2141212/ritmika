import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearchText, normalizeSearchText } from './plainText.js';

test('normaliza acentos, cedilha, caixa e espacos para busca', () => {
    assert.equal(normalizeSearchText('  BALCÃO   DE  OPERAÇÃO  '), 'balcao de operacao');
});

test('encontra texto com ou sem acentuacao nos dois sentidos', () => {
    assert.equal(matchesSearchText('Balcão de Operação', 'balcao'), true);
    assert.equal(matchesSearchText('Recepcao principal', 'RECEPÇÃO'), true);
});

test('ignora espacos repetidos e nas extremidades', () => {
    assert.equal(matchesSearchText('Controle   de Qualidade', '  controle de   qualidade '), true);
});
