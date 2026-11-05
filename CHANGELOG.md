# Changelog

## v9 — 04/11/2026
- Menú inferior «liquid»: la burbuja verde se desliza con un resorte hasta la pestaña elegida, el ícono sube adentro de la burbuja y aparece la etiqueta.
- Ícono de la app y pantalla de inicio con el logo de Zebrano (mobiliario + arquitectura).

## v8 — 04/11/2026
- Rediseño «Veta», el mismo lenguaje visual que la web: verde laca y dorado veta sobre fondo oscuro, tipografía Instrument Sans, íconos Feather (sin emojis), botones de 44 px como mínimo.
- Cinco pestañas: Inicio, Producción, Cotizar (botón dorado de cámara al centro), Tickets y Más (Proyectos, Clientes, cerrar sesión).
- Producción: la cola se reordena manteniendo apretado y arrastrando; la OT en el taller muestra el tiempo corrido en grande y avisa si faltan horas estimadas.
- Cotizar: barra de etapas (Plano → Render → Presupuesto → A la cola).
- Ingreso y Tickets rediseñados. Inicio sin números de ejemplo (antes mostraba "Pendientes 2" y "Margen 38%" fijos).

## v7 — 04/11/2026
- Login de empleados (Supabase Auth). Solo entra quien tiene una fila activa en `empleados`; la sesión queda guardada.
- Sin API keys en la app: las edge functions se llaman con el JWT del empleado (se sacó la anon key hardcodeada y `src/lib/api.ts`).
- Producción: cola de fabricación con prioridad (▲▼) e "Iniciar fabricación"; OT en fabricación con días y horas transcurridos frente a los estimados, avance y entrega; entregadas recientes. Mismas funciones que la web.
- Tickets (pestaña nueva): foto de factura de proveedor (lectura con IA, a Compras, imputada a una OT o como stock) o de ticket de gasto (Caja chica con OT y foto).
- Cotizador: fotos comprimidas a 1600 px JPEG, links al presupuesto y a la hoja de taller en PDF; la OT queda en la cola.
- Build del APK con GitHub Actions al subir el `versionCode` en app.json a main (sin EAS).
