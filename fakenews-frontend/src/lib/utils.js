/**
 * @file utils.js
 * @description Modulo utilitario compartido para reglas de acceso, helpers y funciones transversales.
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

/** Une clases condicionales y resuelve conflictos de Tailwind en una sola cadena. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
