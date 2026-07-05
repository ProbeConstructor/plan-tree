// SPDX-License-Identifier: GPL-3.0-only

/**
 * Regex para nombres de perfil y proyecto.
 * Solo caracteres seguros para nombres de archivo/carpeta.
 * Sin barras, sin puntos (excepto espacios), sin caracteres de control.
 */
export const SAFE_NAME_REGEX = /^[A-Za-z0-9 _-]{1,32}$/;

export const SAFE_NAME_PATTERN = "solo letras, números, espacios, - y _ (máx. 32 caracteres)";

/**
 * Valida un nombre de perfil o proyecto. Lanza con mensaje claro si es inválido.
 */
/**
 * Regex para data URIs de imagen válidas.
 * Solo PNG y JPEG, dentro del límite de tamaño de Plan Tree (50KB encoded).
 */
const VALID_ICON_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]{1,68200}$/;

/**
 * Verifica que un icono sea una data URI de imagen válida.
 */
export function isValidIconDataUri(icon: string | undefined): icon is string {
  if (!icon) return false;
  return VALID_ICON_RE.test(icon);
}

export function validateSafeName(name: string, label: string): void {
  if (!name || !name.trim()) {
    throw new Error(`${label}: el nombre no puede estar vacío.`);
  }
  if (!SAFE_NAME_REGEX.test(name.trim())) {
    throw new Error(`${label}: ${SAFE_NAME_PATTERN}.`);
  }
}
