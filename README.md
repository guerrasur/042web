# Lucio 042

Landing estática para Meditación Guiada Para Perros.

- Intro negra con logo 042 pulsando durante un mínimo de tres segundos y precarga de imágenes.
- Imagen Grupo 4 rebotando dentro del espacio libre, sin invadir título o botón.
- Compatible con móvil, áreas seguras, cambios de orientación y movimiento reducido.
- Editar `PRESAVE_URL` en `script.js` cuando esté disponible el enlace oficial.
- GitHub Pages se publica desde `.github/workflows/pages.yml` al actualizar `main`.

## Publicación en Firebase

El sitio de destino es `lucio42.web.app` (`lucio42` en Firebase Hosting).

- `node scripts/build-static.mjs` prepara `dist/` con el favicon, sprites, fuentes, cuatro temas y versión de actualización. GitHub Pages utiliza el mismo paquete.
- Con acceso al proyecto propietario del sitio, ejecutar `firebase deploy --only hosting --project ID_DEL_PROYECTO`. El paso previo prepara los archivos automáticamente.
- El ID del proyecto se verifica en Firebase antes de publicar; puede ser distinto del ID del sitio.

Las partidas y mascotas se guardan en el navegador para cada dominio. Los datos de GitHub Pages no se transfieren automáticamente al dominio de Firebase.
