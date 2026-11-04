# Changelog

## v7 — 04/11/2026
- Login de empleados (Supabase Auth). Solo entra quien tiene una fila activa en `empleados`; la sesión queda guardada.
- Sin API keys en la app: las edge functions se llaman con el JWT del empleado (se sacó la anon key hardcodeada y `src/lib/api.ts`).
- Producción: cola de fabricación con prioridad (▲▼) e "Iniciar fabricación"; OT en fabricación con días y horas transcurridos frente a los estimados, avance y entrega; entregadas recientes. Mismas funciones que la web.
- Tickets (pestaña nueva): foto de factura de proveedor (lectura con IA, a Compras, imputada a una OT o como stock) o de ticket de gasto (Caja chica con OT y foto).
- Cotizador: fotos comprimidas a 1600 px JPEG, links al presupuesto y a la hoja de taller en PDF; la OT queda en la cola.
- Build del APK con GitHub Actions al subir el `versionCode` en app.json a main (sin EAS).
