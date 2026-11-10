// Tipos de src/lib/corte.js (copia de la web)
export interface PiezaCorte { nombre?: string; modulo?: string; largo_mm: number; ancho_mm: number; cantidad?: number; material?: string }
export interface PiezaUbicada { nombre?: string; modulo?: string; l: number; a: number; x: number; y: number; w: number; h: number; rot: boolean }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Placa { piezas: PiezaUbicada[]; uso: number; retazos: Rect[] }
export interface ResultadoCorte { placas: Placa[]; noEntran: { nombre?: string; modulo?: string; l: number; a: number }[]; uso: number }
export interface GrupoCorte extends ResultadoCorte { material: string; largo: number; ancho: number; veta: boolean }
export const PLACA: { largo: number; ancho: number; kerf: number };
export function tieneVeta(material?: string | null): boolean;
export function optimizar(piezas: PiezaCorte[], cfg?: { largo?: number; ancho?: number; kerf?: number; veta?: boolean }): ResultadoCorte;
export function optimizarPorMaterial(piezas: PiezaCorte[], placasCfg?: { material: string; largo_mm?: number; ancho_mm?: number }[]): GrupoCorte[];
export function _check(): ResultadoCorte;
