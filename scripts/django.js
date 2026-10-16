import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const virtualEnvPython = process.platform === 'win32'
  ? path.join(root, 'django_admin', '.venv', 'Scripts', 'python.exe')
  : path.join(root, 'django_admin', '.venv', 'bin', 'python');
const python = existsSync(virtualEnvPython) ? virtualEnvPython : 'python';
const child = spawn(python, ['django_admin/manage.py', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

child.on('error', error => {
  console.error(`Unable to start Django with ${python}: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});
