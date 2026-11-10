# ZEBRANO APP — Contexto para el agente

## Stack
React Native + Expo Router v4 · TypeScript · Supabase · TanStack Query · Zustand

## Supabase
- URL: https://xsciujuvkbubnhhnpcix.supabase.co
- Proyecto: zebrano
- Storage bucket: zebrano-proyectos

## Webhooks n8n activos
- Cotizador AI: POST https://n8n-n8n.z8ixjp.easypanel.host/webhook/zebrano-cotizador
- Leader Zebrano: POST https://n8n-n8n.z8ixjp.easypanel.host/webhook/zebrano-leader

## Edge Functions Supabase
- cotizador-ai: /functions/v1/cotizador-ai
- zebrano-leader: /functions/v1/zebrano-leader
- zebrano-cotizador: /functions/v1/zebrano-cotizador
- n8n-bridge: /functions/v1/n8n-bridge

## Render IA (gratuito)
- Pollinations.ai: https://image.pollinations.ai/prompt/{encoded_prompt}
- Sin API key, sin costo

## Flujo principal: Nuevo trabajo (app/nuevo-trabajo.tsx)
Igual que la web (src/pages/NuevoTrabajo.jsx): para quién → diseño editable → render → cotización → OT en cola.
Cada paso es una `accion` de `zebrano-cotizador` v66 (`leer`, `guardar_diseno`, `render`, `cotizar`, después `aprobar_cotizacion`) con el JWT del empleado (`cotizador()` en src/lib/supabase.ts).
El chat (app/asistente.tsx) queda como asistente secundario.

## Navegación
Inicio · Trabajos (Nuevo trabajo, Cotizaciones, Clientes y obras, Prospectos) · Producción (cola con planificación; /ot/[id] con Despiece, Corte y Materiales) · Compras (Tickets, Necesidades, Stock) · Más (Prospección, Tema, Salir).
Permisos por rol en src/lib/permisos.ts (el taller no ve Trabajos ni Compras; Prospección solo admin y gestión, como el RLS de `prosp_*`).

## Lógica copiada de la web (no reescribir)
- `src/lib/corte.js`: copia tal cual de zebrano-web/src/lib/corte.js (tipos en corte.d.ts).
- `src/lib/plan.ts`: `planificar` y `sumarHorasHabiles` de zebrano-web/src/components/PlanCola.jsx.
- Chequeo: `npx tsx scripts/check.ts`.

## Tema
Glass v6 en `src/lib/theme.ts` (tokens claro/oscuro, `useTema()`) y `src/components/ui.tsx` (Fondo, Vidrio, Boton, Badge, Segmentado, Pasos, Campo, Selector…). Nada de colores sueltos en las pantallas.

## Login y permisos
- Supabase Auth email/contraseña; solo entra quien tiene fila activa en `empleados`. Nada de API keys en la app: solo la publishable key (app.json) y el JWT.
- PDF del bucket privado `documentos`: `abrirDocumento()` (link firmado de 10 minutos).

## Build del APK
- Subir `versionCode` en app.json, commitear y pushear a main → GitHub Actions (`.github/workflows/apk.yml`) compila con Gradle y publica `zebrano-vN.apk` en Releases (N = versionCode). No usa EAS.

## Estructura de carpetas de proyectos en Storage
zebrano-proyectos/
└── proyectos/
    └── {proyecto_id}/
        └── sesion_{sesion_id}/
            ├── plano_original.jpg
            ├── render_v1.jpg
            └── cotizacion_v1.pdf

## Reglas
- Tema claro y oscuro con los tokens de src/lib/theme.ts (nunca colores sueltos)
- Sin `any` en TypeScript
- Commit después de cada feature
- EAS account: tomillo007

<!-- karpathy-guidelines:start -->
## Reglas de trabajo para agentes y Claude (basadas en karpathy-guidelines, MIT)

Fuente: https://github.com/multica-ai/andrej-karpathy-skills — adaptadas para trabajo autónomo.

### 1. Pensar antes de programar
- No asumir en silencio. Si hay ambigüedad, elegir la interpretación más razonable, **declarar el supuesto en el resultado** y seguir.
- Detenerse y preguntar solo si el cambio es irreversible o destructivo (borrar datos, migraciones que pierden información, cambios en producción que no se pueden revertir).
- Si existe un enfoque más simple que el pedido, decirlo.

### 2. Simplicidad primero
- El mínimo código que resuelve el problema. Nada especulativo.
- Sin funciones, abstracciones, configurabilidad ni manejo de errores para escenarios imposibles que nadie pidió.
- Si 200 líneas pueden ser 50, reescribir.

### 3. Cambios quirúrgicos
- Tocar solo lo necesario. **Nunca reescribir un archivo entero para un cambio chico**: editar solo las líneas afectadas.
- No "mejorar" código, comentarios ni formato vecinos. Respetar el estilo existente.
- Si se ve código muerto no relacionado, mencionarlo; no borrarlo.
- Eliminar solo lo que los propios cambios dejaron sin uso.
- Prueba: cada línea cambiada tiene que responder directamente al pedido.

### 4. Ejecución por objetivos
- Convertir el pedido en un criterio verificable ("arreglar el bug" → "test que lo reproduce, y hacerlo pasar").
- En tareas de varios pasos, plan breve con verificación por paso:
  1. [paso] → verificar: [chequeo]
- No dar por terminado algo que no se verificó.

En tareas triviales (typos, cambios de una línea) usar criterio: no hace falta todo el rigor.
<!-- karpathy-guidelines:end -->
