# Guía de Despliegue en Hostinger - Sistema Electoral

Esta guía te ayudará a subir tu sistema de votación a un hosting compartido de Hostinger.

## Paso 1: Generar la Versión de Producción
En tu computadora, abre la terminal en la carpeta del proyecto y ejecuta:
```bash
npm run build
```
Esto creará una carpeta llamada `dist` con los archivos finales optimizados.

## Paso 2: Preparar los Archivos
1. Entra a la carpeta `dist`.
2. Verás que ya incluimos un archivo `.htaccess` (necesario para que las rutas como `/candidatos` funcionen en Hostinger).
3. Selecciona todos los archivos dentro de `dist` y comprímelos en un archivo `.zip`.

## Paso 3: Subir a Hostinger
1. Entra al **hPanel** de Hostinger.
2. Ve a **Administrador de Archivos (File Manager)**.
3. Entra a la carpeta `public_html`.
4. Sube tu archivo `.zip`.
5. Extrae el contenido directamente en `public_html`.
6. ¡Listo! Tu sitio debería cargar en tu dominio.

## Notas sobre Supabase
A diferencia de Vercel, en Hostinger no hay un panel fácil de "Environment Variables" para Vite. Por seguridad y facilidad, ya configuramos el código para que use tus llaves de Supabase directamente si las variables no están presentes. No necesitas hacer nada extra para la conexión en Hostinger.

## Importante
Asegúrate de que el dominio en Hostinger tenga SSL (HTTPS) activo, ya que Supabase requiere una conexión segura para funcionar correctamente.
