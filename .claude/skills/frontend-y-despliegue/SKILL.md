---
name: frontend-y-despliegue
description: "Tienda React: qué se reutiliza, editar site.ts, compilar con build:hosting, subir dist/ al hosting, actualizar solo el JS o reemplazar un archivo existente en cPanel (con copia previa y verificación), y comprobar rutas y cabeceras. Úsalo al desplegar cambios del frontend o del plugin."
---

# Frontend y despliegue

## 0. Lo que se reutiliza sin tocar

| Pieza | Dónde | Cambia por tienda |
|---|---|---|
| Tienda React | `src/`, `npm run build:hosting` | `src/config/site.ts` y `.figma/make/site.json` (marca, textos, contacto, prefijo `WC-`) |
| Plugin de conciliación | `wordpress/tienda-conciliacion/` | Nada |
| Cron | `wordpress/cron/tc-cron.php` | Solo la ruta del usuario y del dominio en el comando |
| `.htaccess` de la SPA y cabeceras | `public/.htaccess` | Nada (conservar el bloque PHP de cPanel del servidor) |
| Configuración secreta | `wordpress/config.example.php` | Token, ID de vendedor y prefijo de la clienta |

## 3. Frontend (C + M)

1. C: editar `site.ts` y `site.json`; `npm test`; `npm run build:hosting`; buscar secretos en `dist/`.
2. M: **antes de subir**, abrir el `.htaccess` del sitio en el servidor y conservar su bloque de cPanel (`# php -- BEGIN cPanel-generated handler`); subir **solo el contenido de `dist/`**, sin tocar `wp/`.
2b. **Actualizar solo el JS** (cambios chicos, como el de P18): copia de `index.html` fuera de la web; subir el `index-<hash>.js` nuevo a `assets/` con cPanel > Administrador de archivos > Cargar (`upload-ajax.html?dir=<assets>`; el CSS y las imágenes con el mismo nombre ya están); cambiar en `index.html` solo la referencia al JS; comprobar `/` y `/pedido/retorno`.
2c. **Reemplazar un archivo que ya existe en el servidor (plugin PHP, `index.html`…)** *(Refrizer)*: (1) respaldar leyendo con `get_file_content` y guardando con `save_file_content` en `/home/USUARIO/tienda-cron/backup-AAAAMMDD-<nombre>.txt`, y comprobar que el tamaño coincide; (2) subir con `upload-ajax.html?dir=<carpeta>` y `file_upload`: **si el archivo existe, cPanel pregunta "Overwrite File?" y hay que confirmar con "Yes"**; sin eso no se reemplaza y el tamaño no cambia; (3) con `list_files` comprobar que el tamaño es **exactamente** el del archivo local (lo que ya estaba en el servidor puede tener saltos de línea CRLF por haberse subido desde Windows: la diferencia con el repositorio es normal) y que los permisos siguen en 0644; (4) con varios archivos PHP que dependen entre sí, subir primero el que define las funciones nuevas; (5) esperar un barrido del cron y comprobar que sigue en `vendedor=match` y sin errores.
2d. **Subir muchos archivos nuevos de una vez** *(Refrizer, SEO 2026-11-05)*: `python` arma un zip con `zipfile` (rutas con `/`; NO usar `Compress-Archive` de PowerShell 5.1, que genera rutas con `\`); subirlo a `tienda-cron` con `upload-ajax.html` y `file_upload` (**un archivo por llamada**: el cargador procesa uno a la vez); crear una carpeta de preparación (`Fileman/mkdir`) y extraer con la API 2 (`/cpsessN/json-api/cpanel?cpanel_jsonapi_user=USUARIO&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop&op=extract&sourcefiles=<zip>&destfiles=<carpeta>`); copiar a `assets/` con `op=copy` (lista separada por comas) **solo los nombres que aún no existen**, comparando el tamaño de cada uno con el de preparación; y recién entonces cambiar `index.html` (respaldo, y copia de texto desde la carpeta de preparación con `get_file_content` y `save_file_content`, sin diálogos). Para probar el sitio desde JS, usar una pestaña del propio dominio: desde la de cPanel (otro origen) `fetch` falla por CORS aunque el sitio esté bien.
3. Comprobar (C, solo lectura): `/pedido/retorno` y `/producto/x` devuelven la tienda (no 404); `index.html` con `no-cache`; `/assets/*` con `immutable`; cabeceras HSTS, `X-Frame-Options`, `Referrer-Policy`, `nosniff` en `/`, la Store API y `wp-login`.
