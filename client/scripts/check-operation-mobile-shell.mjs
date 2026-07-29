import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.resolve('src/components/employee/employee.css');
const css = fs.readFileSync(cssPath, 'utf8');

const checks = [
  ['barra operacional usa posicionamento fixo', /\.employee-nav\s*\{[^}]*position:\s*fixed;/s],
  ['barra mobile permanece presa à base', /@media\s*\(max-width:\s*720px\)[\s\S]*?\.employee-nav\s*\{[^}]*bottom:\s*0;[^}]*left:\s*0;/s],
  ['barra mobile respeita a largura do viewport', /@media\s*\(max-width:\s*720px\)[\s\S]*?\.employee-nav\s*\{[^}]*width:\s*100%;/s],
  ['conteúdo reserva espaço para barra e safe area', /\.employee-main\s*\{[^}]*padding-bottom:\s*calc\(104px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\);/s],
];

const failures = checks.filter(([, pattern]) => !pattern.test(css));
if (failures.length) {
  console.error(`Falha no contrato do App de Operação em ${path.relative(process.cwd(), cssPath)}:`);
  failures.forEach(([label]) => console.error(`- ${label}`));
  process.exit(1);
}

console.log(JSON.stringify({ status: 'ok', checks: checks.length }));
