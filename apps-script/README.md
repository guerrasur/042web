# Avisos del EP: Google Sheets privado

Cuenta solicitada: **lucioguerrasur@gmail.com**. No usar otra cuenta.

1. Importar la planilla de contactos como Google Sheets en esa cuenta. Mantener el acceso general en **Restringido**. La pestaña debe llamarse `Contactos` y la primera fila debe contener, en este orden: `Fecha de inscripción`, `Canal`, `Contacto`, `Avisado`, `Clave`.
2. Crear un proyecto de Google Apps Script en la misma cuenta y copiar `Code.gs`. Usar el manifiesto `appsscript.json` para limitar el permiso a Google Sheets y fijar la zona horaria argentina.
3. En **Configuración del proyecto → Propiedades de secuencia de comandos**, agregar `CONTACT_SHEET_ID` con el ID de la planilla. Ese ID queda en Google; no se coloca en la web.
4. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como el propietario; acceso **Cualquier usuario**, incluidos visitantes sin cuenta Google. Autorizar el acceso a Sheets desde la cuenta indicada. Esto publica solamente el receptor de altas y un estado de salud; no publica la planilla ni permite consultar contactos.
5. Copiar la URL terminada en `/exec` en `endpoint` de `presave-config.js`. No usar `/dev` ni enviar con `mode: 'no-cors'`: la interfaz debe leer la confirmación real antes de agradecer.
6. Publicar y probar desde un navegador sin sesión de Google. Verificar que un contacto de prueba llegue a la planilla, que al repetirlo no se agregue otra fila, y que errores de red no muestren el agradecimiento. No usar teléfonos o mails reales ajenos para pruebas.

Cada registro conserva fecha, canal, contacto y estado `Pendiente`. La columna `Clave` se usa para evitar duplicados; se puede ocultar, pero no borrar. El receptor valida el contacto, utiliza un bloqueo durante el guardado y trata la entrada como texto para evitar fórmulas. No envía mensajes ni programa avisos automáticamente. La URL de altas es pública por diseño; el campo trampa reduce bots simples y no sustituye un servicio antiabuso si aumenta el spam.

## Galgo

Los sprites originales de Sofía Cano están en `sprites/galgo-1.png` y `sprites/galgo-2.png`, mirando a la derecha y conservando el mismo lienzo transparente. Sus URLs incluyen una versión para evitar reutilizar respuestas antiguas. El crédito «Galgo por Sofía Cano» aparece solamente debajo del agradecimiento, en blanco al 48 % y a 12 px.

La velocidad inicial es 28 px/s y se ajusta con `dogSpeed` en `presave-config.js`. Cambia de sprite cada 500 ms, sale por la derecha, espera 1 segundo y vuelve a entrar por la izquierda. El contenedor persiste al cambiar de pantalla. Solo se anima mientras el popup y la pestaña están visibles; con movimiento reducido se muestra quieto.
