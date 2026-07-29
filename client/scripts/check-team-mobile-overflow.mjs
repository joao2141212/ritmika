import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.resolve('src/styles/team-hub.css');
const css = fs.readFileSync(cssPath, 'utf8');

const requiredRules = [
    ['containeres principais limitados ao viewport', /\.team-hub,\s*\.team-hub-panel,\s*\.team-hub-grid,\s*\.team-member-card\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s],
    ['filhos flex da identidade podem encolher', /\.team-member-topline\s*>\s*\*\s*\{[^}]*min-width:\s*0;/s],
    ['e-mail longo quebra sem alargar o card', /\.team-member-identity\s+span\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*normal;/s],
    ['painel mobile remove largura excedente', /@media\s*\(max-width:\s*760px\)[\s\S]*?\.team-hub-panel\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;/s],
    ['ações mobile ocupam a largura disponível', /@media\s*\(max-width:\s*760px\)[\s\S]*?\.team-hub-actions\s+button,\s*\.team-member-manage\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;/s],
];

const failures = requiredRules.filter(([, pattern]) => !pattern.test(css));
if (failures.length) {
    console.error(`Falha de contrato mobile em ${path.relative(process.cwd(), cssPath)}:`);
    failures.forEach(([label]) => console.error(`- ${label}`));
    process.exit(1);
}

console.log('Contrato mobile da tela Equipe validado: sem largura maior que o viewport.');
