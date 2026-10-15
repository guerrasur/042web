import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteId = 'lucio42';

function firebaseJSON(args) {
  const output = execFileSync('firebase', [...args, '--json', '--non-interactive'], {
    cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const response = JSON.parse(output);
  if (response.status === 'error') throw new Error(response.error?.message || 'Firebase devolvió un error.');
  return response.result ?? response;
}

try {
  const config = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
  if (!config.hosting || Array.isArray(config.hosting) || config.hosting.site !== siteId || config.hosting.public !== 'dist') {
    throw new Error('La configuración debe apuntar únicamente al sitio lucio42 y a la carpeta dist.');
  }
  console.log('Buscando el proyecto propietario de https://lucio42.web.app ...');
  const result = firebaseJSON(['projects:list']);
  const projects = Array.isArray(result) ? result : result.projects;
  if (!Array.isArray(projects) || !projects.length) {
    throw new Error('Esta cuenta no tiene proyectos Firebase accesibles. Abrí Cloud Shell desde la cuenta propietaria del sitio.');
  }
  let projectId;
  const unavailable = [];
  for (const project of projects) {
    if (!project.projectId) continue;
    console.log(`Comprobando ${project.projectId}...`);
    try {
      const result = firebaseJSON(['hosting:sites:list', '--project', project.projectId]);
      const sites = Array.isArray(result) ? result : result.sites;
      if (!Array.isArray(sites)) throw new Error('No se pudo interpretar la lista de sitios.');
      if (sites.some(site => site.name?.split('/').pop() === siteId || site.defaultUrl === `https://${siteId}.web.app`)) {
        projectId = project.projectId;
        break;
      }
    } catch {
      unavailable.push(project.projectId);
    }
  }
  if (!projectId) {
    const detail = unavailable.length ? ` No se pudieron consultar: ${unavailable.join(', ')}.` : '';
    throw new Error(`No se encontró lucio42.web.app en los proyectos accesibles de esta cuenta.${detail} Revisá la cuenta y el dominio del sitio.`);
  }
  console.log(`Proyecto encontrado: ${projectId}. Publicando en https://lucio42.web.app ...`);
  const deployment = spawnSync('firebase', ['deploy', '--only', 'hosting', '--project', projectId, '--non-interactive'], {
    cwd: root, stdio: 'inherit',
  });
  if (deployment.error) throw deployment.error;
  if (deployment.status !== 0) throw new Error('Firebase no completó la publicación. Copiá el error mostrado arriba.');
  console.log('Publicado: https://lucio42.web.app');
} catch (error) {
  console.error(error.message);
  console.error('Si el error es de autenticación, ejecutá firebase login --no-localhost y volvé a ejecutar este asistente.');
  process.exitCode = 1;
}
