import { spawn } from 'node:child_process';
import { mkdir, rm, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  // 1) clean dist
  await rm(distDir, { recursive: true, force: true });

  // 2) build client to dist/static
  // Use pnpm if available; fallback to npm.
  try {
    await run('pnpm', ['run', 'build:client']);
  } catch (e) {
    await run('npm', ['run', 'build:client']);
  }

  // 3) add minimal build artifacts for deployment scripts
  await mkdir(distDir, { recursive: true });
  await copyFile(path.join(root, 'package.json'), path.join(distDir, 'package.json'));
  await writeFile(path.join(distDir, 'build.flag'), '', 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

