export const U = 22

export interface Color {
  name: string
  r: number
  g: number
  b: number
  dom: string
}

export const COLORS: Color[] = [
  { name: 'Blanco puro',   r: 0,  g: 0,  b: 0,  dom: 'Neutro' },
  { name: 'Rojo puro',     r: 14, g: 0,  b: 0,  dom: 'R' },
  { name: 'Verde puro',    r: 0,  g: 14, b: 0,  dom: 'G' },
  { name: 'Azul puro',     r: 0,  g: 0,  b: 14, dom: 'B' },
  { name: 'Amarillo',      r: 8,  g: 8,  b: 0,  dom: 'Mix' },
  { name: 'Cyan',          r: 0,  g: 8,  b: 8,  dom: 'Mix' },
  { name: 'Magenta',       r: 8,  g: 0,  b: 8,  dom: 'Mix' },
  { name: 'Naranja',       r: 10, g: 4,  b: 0,  dom: 'R' },
  { name: 'Naranja claro', r: 7,  g: 3,  b: 0,  dom: 'R' },
  { name: 'Rojo oscuro',   r: 11, g: 1,  b: 1,  dom: 'R' },
  { name: 'Rojo rosado',   r: 8,  g: 0,  b: 3,  dom: 'R' },
  { name: 'Rosa claro',    r: 5,  g: 0,  b: 2,  dom: 'R' },
  { name: 'Rosa fuerte',   r: 7,  g: 0,  b: 4,  dom: 'R' },
  { name: 'Salmón',        r: 6,  g: 2,  b: 1,  dom: 'R' },
  { name: 'Durazno',       r: 5,  g: 3,  b: 1,  dom: 'R' },
  { name: 'Verde lima',    r: 3,  g: 10, b: 0,  dom: 'G' },
  { name: 'Verde oliva',   r: 4,  g: 7,  b: 1,  dom: 'G' },
  { name: 'Verde oscuro',  r: 1,  g: 11, b: 1,  dom: 'G' },
  { name: 'Verde menta',   r: 2,  g: 8,  b: 4,  dom: 'G' },
  { name: 'Verde agua',    r: 0,  g: 7,  b: 5,  dom: 'G' },
  { name: 'Verde bosque',  r: 1,  g: 9,  b: 2,  dom: 'G' },
  { name: 'Azul cielo',    r: 0,  g: 3,  b: 9,  dom: 'B' },
  { name: 'Azul marino',   r: 0,  g: 1,  b: 12, dom: 'B' },
  { name: 'Azul real',     r: 1,  g: 2,  b: 10, dom: 'B' },
  { name: 'Azul turquesa', r: 0,  g: 5,  b: 7,  dom: 'B' },
  { name: 'Azul acero',    r: 2,  g: 3,  b: 8,  dom: 'B' },
  { name: 'Azul lavanda',  r: 4,  g: 2,  b: 7,  dom: 'B' },
  { name: 'Morado',        r: 6,  g: 0,  b: 6,  dom: 'Mix' },
  { name: 'Violeta',       r: 5,  g: 1,  b: 7,  dom: 'Mix' },
  { name: 'Púrpura',       r: 7,  g: 0,  b: 5,  dom: 'Mix' },
  { name: 'Café/Marrón',   r: 7,  g: 3,  b: 2,  dom: 'R' },
  { name: 'Café claro',    r: 5,  g: 3,  b: 2,  dom: 'R' },
  { name: 'Terracota',     r: 9,  g: 2,  b: 1,  dom: 'R' },
  { name: 'Gris claro',    r: 2,  g: 2,  b: 2,  dom: 'Neutro' },
  { name: 'Gris medio',    r: 4,  g: 4,  b: 4,  dom: 'Neutro' },
  { name: 'Gris oscuro',   r: 6,  g: 6,  b: 6,  dom: 'Neutro' },
  { name: 'Gris azulado',  r: 2,  g: 3,  b: 5,  dom: 'Neutro' },
  { name: 'Gris verdoso',  r: 2,  g: 4,  b: 2,  dom: 'Neutro' },
  { name: 'Beige',         r: 3,  g: 3,  b: 1,  dom: 'Neutro' },
  { name: 'Crema',         r: 2,  g: 2,  b: 0,  dom: 'Neutro' },
]

export function toRgb(r: number, g: number, b: number): string {
  const mix = (v: number) => Math.round(v + (255 - v) * 0.55)
  return `rgb(${mix(Math.round((r / 14) * 255))},${mix(Math.round((g / 14) * 255))},${mix(Math.round((b / 14) * 255))})`
}

export function getMl(color: Color) {
  const mlRoja  = color.r * U
  const mlVerde = color.g * U
  const mlAzul  = color.b * U
  return { mlRoja, mlVerde, mlAzul, mlBlanca: 700 - mlRoja - mlVerde - mlAzul }
}
