// src/lib/permisos.ts — lo mismo que zebrano-web/src/lib/permisos.js, reducido a lo que la app muestra.
// La base es la que manda (RLS); esto solo esconde lo que el rol no puede usar.
const TALLER = ['carpintero_oficial', 'carpintero', 'ayudante', 'taller'];

export const esTaller = (rol?: string | null) => TALLER.includes(rol ?? '');
export const puede = (rol: string | null | undefined, que: 'precios' | 'ventas' | 'compras' | 'prospeccion' | 'gestionar_cola') => {
  if (rol === 'admin') return true;
  if (que === 'prospeccion' || que === 'gestionar_cola') return rol === 'gestion'; // RLS de prosp_* y puede_gestionar_produccion()
  if (rol === 'gestion') return true;
  if (rol === 'ventas') return que !== 'compras';
  return false; // taller: producción sin precios
};
