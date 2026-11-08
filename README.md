# Mi Botonera — Web-app v1.0

Primera versión sencilla para navegador móvil. Solo tiene dos tipos de acción:

- **URL:** abre páginas web (YouTube, vídeos, webs, mapas, etc.) en otra pestaña.
- **CALL:** abre el marcador del teléfono con el número preparado. La persona confirma la llamada.

## Probar en un  ordenador

1. Instala Node.js LTS desde https://nodejs.org/.
2. Descomprime el ZIP y abre una terminal dentro de la carpeta `botonera-webapp-v1`.
3. Ejecuta:

   ```bash
   npm install
   npm run start
   ```

4. Abre la dirección que indique Vite (normalmente `http://localhost:5173`).

Para probarla desde un móvil conectado a la misma Wi-Fi que el ordenador, ejecuta `npm run start -- --host 0.0.0.0`, consulta la IP local del ordenador y abre `http://IP-DEL-ORDENADOR:5173` en Chrome.

## Publicar gratis en GitHub Pages

1. Crea un repositorio GitHub y sube el contenido de esta carpeta (no la carpeta contenedora).
2. En el repositorio entra en **Settings → Pages**.
3. Selecciona **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Guarda y espera a que GitHub publique la web.

La configuración de Vite usa rutas relativas, por lo que funciona también en repositorios GitHub Pages de tipo `usuario.github.io/nombre-repo/`.

## Añadir al móvil

Abre la dirección publicada en Chrome Android → menú ⋮ → **Añadir a pantalla de inicio** o **Instalar aplicación** (el texto puede variar). La web incluye manifiesto y caché básica para permitir una experiencia tipo app y abrir la interfaz sin conexión después de la primera carga. Para acceder a páginas web y realizar llamadas se necesita conexión o cobertura, respectivamente.

## Funciones incluidas

- Diseño adaptable a móvil, botones grandes y desplazamiento vertical.
- Botones URL y CALL.
- Crear, editar, borrar y ordenar con controles (sin arrastrar).
- Emoji, posición numérica, color de fondo, color del texto y tamaño S/M/L/XL.
- Configuración protegida por PIN inicial `0000`; se puede cambiar.
- Almacenamiento local del navegador (`localStorage`).
- Exportación e importación JSON con confirmación.
- Importación `upsert` (añade/actualiza por ID) o `replace` (sustituye toda la botonera).
- Copia de seguridad local antes de una importación destructiva o borrado total.

## Limitaciones importantes

- Los datos se guardan en el navegador y en ese dispositivo. No se sincronizan automáticamente entre teléfonos.
- Borrar los datos del navegador puede borrar la botonera. Exporta copias JSON periódicamente.
- El PIN protege la pantalla de configuración, pero no es un sistema de seguridad fuerte.
- La llamada utiliza `tel:` y requiere que el móvil disponga de una función de llamadas. No realiza llamadas automáticamente.
- Algunos navegadores pueden bloquear la apertura de pestañas; si ocurre, se puede ajustar el navegador o abrir la URL desde el botón.
- Para compartir una botonera con otra persona, exporta el JSON y envíaselo por WhatsApp/correo. La otra persona pulsa Importar y selecciona el archivo.

## Estructura

- `index.html`: pantalla y navegación.
- `src/main.js`: lógica, edición, importación/exportación y acciones.
- `src/styles.css`: estilos adaptables y accesibles.
- `manifest.webmanifest`, `sw.js`, `icon.svg`: instalación tipo PWA y caché básica.
- `ejemplo-botonera.json`: ejemplo importable.
