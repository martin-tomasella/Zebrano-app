# Changelog

## v10 — 10/11/2026
Replica el ERP v2 de la web (mismo backend, nada nuevo en Supabase).
- **Nuevo trabajo** como entrada principal, en 5 pasos (Para quién · Diseño · Render · Cotización · OT) contra `zebrano-cotizador` v66: cliente y obra, prospecto o cliente nuevo; texto dictado y hasta 6 fotos de 1600 px; tabla de módulos y mano de obra editables con el plano; render con pedido de cambio; precio en ARS y USD (oficial BCRA) con el PDF; aprobación que deja la OT en cola. Se entra desde Inicio, Trabajos, la ficha de cliente, cada obra y cada prospecto. El chat queda como asistente.
- **Producción:** planificación de la cola por etapa y personas (misma lógica que la web: jornada de 7 h, lunes a viernes, una OT por vez); al cambiar personas se recalculan y guardan las fechas de fin. Horas reales contra estimadas por etapa.
- **OT:** despiece por módulo, corte de placas con `corte.js` (dibujo por placa, aprovechamiento, retazos, hoja de corte para imprimir o compartir en PDF) y materiales con decisión comprar / usar stock.
- **Compras:** tickets con foto (como la v7), necesidades de todas las OT y stock con conteo físico.
- **Clientes y obras:** ficha con obras y trabajos (ARS y USD del día), cotizaciones con descuento y PDF firmado, vendido, cobrado y saldo. Prospectos con "Cotizar trabajo".
- **Prospección** (admin y gestión): bandeja de mails para aprobar, editar, descartar y pasar a prospecto. Aprobar no envía nada.
- **Tema Glass v6** como la web: foto de fondo con velo, paneles de vidrio, verde laca, claro y oscuro según el sistema o elegido en Más.
- Permisos por rol: el taller no ve precios, Trabajos ni Compras.

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
