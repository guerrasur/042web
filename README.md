# Lucio 042

Landing estática para Meditación Guiada Para Perros.

- Intro negra con logo 042 pulsando durante un mínimo de tres segundos y precarga de imágenes.
- Onda sonora blanca entre el álbum y los controles, obtenida del audio real; queda en reposo al pausar y respeta movimiento reducido.
- Imagen Grupo 4 rebotando dentro del espacio libre, sin invadir título o botón.
- Compatible con móvil, áreas seguras, cambios de orientación y movimiento reducido.
- Editar `PRESAVE_URL` en `script.js` cuando esté disponible el enlace oficial.
- GitHub Pages se publica desde `.github/workflows/pages.yml` al actualizar `main`.

## Rendimiento

- Equipos con hasta 4 núcleos, hasta 4 GB declarados o ahorro de datos usan juegos a 30 FPS y canvas a resolución 1×; el resto usa hasta 60 FPS y 2×.
- Los juegos dejan de dibujar cuando están quietos, vuelven a activarse al apuntar/disparar y se detienen al ocultar la pestaña. Las colisiones conservan su cálculo continuo.
- La onda real se dibuja como máximo a 15/30 FPS, sin consultar el tamaño del DOM en cada cuadro. Se detiene al pausar, ocultar el ojo o la pestaña.
- Las deformaciones de las caras son PNG precalculados y se descargan al usarse. Para regenerarlos: `python scripts/prepare-deformations.py` (Pillow y NumPy; no se necesitan para publicar).
- La entrada no espera descargar el tema. El audio precarga solo metadatos antes de reproducir.
- Validación: `node scripts/build-static.mjs && node --test tests/performance.test.cjs`.
- La mascota programa su próximo cambio de estado en vez de consultar cada segundo. Los guardados conservan su formato.

## Publicación en Firebase

El sitio de destino es `lucio42.web.app` (`lucio42` en Firebase Hosting).

- `node scripts/build-static.mjs` prepara `dist/` con el favicon, sprites, fuentes, cuatro temas y versión de actualización. GitHub Pages utiliza el mismo paquete.
- Con acceso al proyecto propietario del sitio, ejecutar `firebase deploy --only hosting --project ID_DEL_PROYECTO`. El paso previo prepara los archivos automáticamente.
- El ID del proyecto se verifica en Firebase antes de publicar; puede ser distinto del ID del sitio.

Las partidas y mascotas se guardan en el navegador para cada dominio. Los datos de GitHub Pages no se transfieren automáticamente al dominio de Firebase.

### Publicar desde Cloud Shell

Abrir Cloud Shell en la consola de Firebase con la cuenta propietaria del sitio y ejecutar:

```bash
(
  set -e
  carpeta_042="$(mktemp -d)"
  git clone --depth 1 https://github.com/guerrasur/042web.git "$carpeta_042"
  cd "$carpeta_042"
  node scripts/deploy-firebase.mjs
)
```

El asistente busca `lucio42.web.app` entre los sitios de los proyectos accesibles, prepara la versión actual y publica únicamente Hosting. Si no encuentra el sitio o hay un error de acceso, se detiene y muestra el motivo.
