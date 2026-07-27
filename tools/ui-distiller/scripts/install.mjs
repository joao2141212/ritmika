import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

await execFileAsync('npm', ['install'], { stdio: 'inherit' });
console.log('Dependências locais instaladas. Para instalar o Chromium do Playwright, rode: npx playwright install chromium');
console.log('A captura permanece segura por padrão: não use --capture-visual, --capture-bodies ou --storage-state sem conta de teste autorizada.');
