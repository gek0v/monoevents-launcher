import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ManifestFile {
  path: string;
  url: string;
  sha1: string;
  size: number;
  type: 'custom' | 'modrinth' | 'config';
}

interface ModpackManifest {
  schemaVersion: number;
  id: string;
  name: string;
  version: string;
  minecraft: {
    version: string;
    modloader: 'forge';
    modloaderVersion: string;
    javaVersion: number;
  };
  changelog: string;
  files: ManifestFile[];
}

function calculateSha1(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha1');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function scanFilesRecursively(baseDir: string, currentDir: string = baseDir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(currentDir)) return results;

  const list = fs.readdirSync(currentDir);
  for (const item of list) {
    const itemPath = path.join(currentDir, item);
    const stat = fs.statSync(itemPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(scanFilesRecursively(baseDir, itemPath));
    } else {
      results.push(itemPath);
    }
  }
  return results;
}

export function generateManifest(
  inputFolder: string,
  outputPath: string,
  options: {
    id?: string;
    name?: string;
    version?: string;
    baseUrl?: string;
    changelog?: string;
  } = {}
): ModpackManifest {
  const id = options.id || 'monocraft-halloween-1.20.1';
  const name = options.name || 'MonoCraft Halloween (1.20.1 Forge)';
  const version = options.version || '1.0.0';
  const baseUrl = options.baseUrl || 'https://github.com/tu-usuario/monoevents-launcher/releases/download';
  const changelog = options.changelog || 'Actualización de mods y configuraciones del servidor.';

  const allFiles = scanFilesRecursively(inputFolder);
  const files: ManifestFile[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(inputFolder, filePath).replace(/\\/g, '/');
    const sha1 = calculateSha1(filePath);
    const size = fs.statSync(filePath).size;
    const isCustom = relativePath.includes('mono_events') || relativePath.startsWith('mods/custom');
    const isConfig = relativePath.startsWith('config/');

    const type: 'custom' | 'modrinth' | 'config' = isConfig
      ? 'config'
      : isCustom
        ? 'custom'
        : 'modrinth';

    const url = `${baseUrl}/v${version}/${path.basename(filePath)}`;

    files.push({
      path: relativePath,
      url,
      sha1,
      size,
      type,
    });
  }

  const manifest: ModpackManifest = {
    schemaVersion: 1,
    id,
    name,
    version,
    minecraft: {
      version: '1.20.1',
      modloader: 'forge',
      modloaderVersion: '47.4.22',
      javaVersion: 17,
    },
    changelog,
    files,
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[Manifest Generator] Manifiesto generado con éxito en: ${outputPath}`);
  console.log(`[Manifest Generator] Total de archivos indexados: ${files.length}`);

  return manifest;
}

// Ejecución directa por CLI si se invoca con Node
if (process.argv[1] && process.argv[1].endsWith('generate-manifest.ts')) {
  const targetDir = process.argv[2] || './sample-pack';
  const targetOut = process.argv[3] || './manifests/generated-modpack.json';

  if (!fs.existsSync(targetDir)) {
    console.log(`Directorio de entrada no encontrado (${targetDir}). Generando estructura vacía de ejemplo.`);
  } else {
    generateManifest(targetDir, targetOut);
  }
}
