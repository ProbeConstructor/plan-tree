// SPDX-License-Identifier: GPL-3.0-only

/**
 * Regex para nombres de perfil y proyecto.
 * Solo caracteres seguros para nombres de archivo/carpeta.
 * Sin barras, sin puntos (excepto espacios), sin caracteres de control.
 */
export const SAFE_NAME_REGEX = /^[A-Za-z0-9 _-]{1,64}$/;

export const SAFE_NAME_PATTERN = "solo letras, números, espacios, - y _ (máx. 64 caracteres)";

/**
 * Valida un nombre de perfil o proyecto. Lanza con mensaje claro si es inválido.
 */
export function validateSafeName(name: string, label: string): void {
  if (!name || !name.trim()) {
    throw new Error(`${label}: el nombre no puede estar vacío.`);
  }
  if (!SAFE_NAME_REGEX.test(name.trim())) {
    throw new Error(`${label}: ${SAFE_NAME_PATTERN}.`);
  }
}
