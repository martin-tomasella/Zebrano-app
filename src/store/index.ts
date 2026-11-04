// src/store/index.ts
import { create } from 'zustand';
import type { CotizacionSesion, Proyecto, Cliente } from '@/types';

export interface EmpleadoSesion { id: string; nombre: string; rol: string }

interface AppStore {
  // Empleado logueado (null = sin sesión)
  empleado: EmpleadoSesion | null;
  setEmpleado: (e: EmpleadoSesion | null) => void;

  // Sesión activa del cotizador
  sesionActiva: CotizacionSesion | null;
  setSesionActiva: (s: CotizacionSesion | null) => void;

  // Cliente activo
  clienteActivo: Cliente | null;
  setClienteActivo: (c: Cliente | null) => void;

  // Proyecto activo
  proyectoActivo: Proyecto | null;
  setProyectoActivo: (p: Proyecto | null) => void;

  // Estado de carga global
  loading: boolean;
  setLoading: (v: boolean) => void;

  // Imágenes pendientes de enviar al agente
  imagenesQueue: string[];
  addImagen: (uri: string) => void;
  clearImagenes: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  empleado:    null,
  setEmpleado: (e) => set({ empleado: e }),

  sesionActiva:    null,
  setSesionActiva: (s) => set({ sesionActiva: s }),

  clienteActivo:    null,
  setClienteActivo: (c) => set({ clienteActivo: c }),

  proyectoActivo:    null,
  setProyectoActivo: (p) => set({ proyectoActivo: p }),

  loading:    false,
  setLoading: (v) => set({ loading: v }),

  imagenesQueue: [],
  addImagen: (uri) => set((state) => ({ imagenesQueue: [...state.imagenesQueue, uri] })),
  clearImagenes: () => set({ imagenesQueue: [] }),
}));
