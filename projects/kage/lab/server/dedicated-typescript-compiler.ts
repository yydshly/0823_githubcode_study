import { spawn } from 'node:child_process';
import { access, rm, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { GeneratedExperienceBundle } from '../src/generation/generated-experience-bundle.ts';

export async function compileDedicatedSources(
  directory: string,
  projectRoot: string,
  bundle: GeneratedExperienceBundle,
  timeoutMs = 45_000,
): Promise<string[]> {
  const configPath = join(directory, 'tsconfig.generated.json');
  const tscPath = join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  await access(tscPath);
  const files = bundle.files.filter((file) => file.language === 'typescript').map((file) => `./${file.path}`);
  const sdkPath = relative(directory, join(projectRoot, 'src', 'generated-sdk', 'index.ts')).split(sep).join('/');
  const config = {
    compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true,
      skipLibCheck: true, useDefineForClassFields: true, allowImportingTsExtensions: true,
      paths: { '@signal-lab/experience-sdk': [sdkPath] }, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: []
    },
    files
  };
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  try {
    const result = await runCompiler(process.execPath, [tscPath, '--project', configPath, '--pretty', 'false'], projectRoot, timeoutMs);
    await releaseWindowsFileHandles();
    if (result.code === 0) return [];
    return result.output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12);
  } finally {
    await rm(configPath, { force: true }).catch(() => undefined);
  }
}

function runCompiler(executable: string, args: readonly string[], cwd: string, timeoutMs: number): Promise<{ code: number; output: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, [...args], { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let settled = false;
    const timer = setTimeout(() => { child.kill(); reject(new Error('专属代码 TypeScript 编译超时。')); }, timeoutMs);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { output += chunk; }); child.stderr.on('data', (chunk: string) => { output += chunk; });
    child.once('error', (error) => { if (settled) return; settled = true; clearTimeout(timer); reject(error); });
    child.once('close', (code) => { if (settled) return; settled = true; clearTimeout(timer); resolvePromise({ code: code ?? -1, output }); });
  });
}

async function releaseWindowsFileHandles(): Promise<void> {
  if (process.platform !== 'win32') return;
  await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 180));
}
