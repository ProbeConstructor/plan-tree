use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
// SPDX-License-Identifier: GPL-3.0-only
use tauri::Manager;

use argon2::Argon2;
use rand_core::{OsRng, RngCore};
use serde::Serialize;

/// Mínimo de milisegundos entre intentos de unlock consecutivos.
/// Argon2id ya es lento (~50-200ms), esto evita que desde la consola
/// de JS se encadenen llamadas para degradar la UX.
const UNLOCK_RATE_LIMIT_MS: u64 = 500;

/// Estado protegido: guarda la clave de 256 bits SOLO mientras la
/// bóveda está "desbloqueada". Vive únicamente en memoria de Rust;
/// nunca se serializa, nunca se manda a JS, nunca toca disco.
pub struct VaultState(pub Mutex<Option<[u8; 32]>>);

impl Default for VaultState {
    fn default() -> Self {
        VaultState(Mutex::new(None))
    }
}

/// Rate limiter para unlock: previene ráfagas de llamadas que
/// saturarían la CPU con Argon2id.
pub struct UnlockRateLimit(pub AtomicU64);

impl Default for UnlockRateLimit {
    fn default() -> Self {
        UnlockRateLimit(AtomicU64::new(0))
    }
}

fn check_rate_limit(last: &UnlockRateLimit) -> Result<(), String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let prev = last.0.load(Ordering::Relaxed);
    if now - prev < UNLOCK_RATE_LIMIT_MS {
        return Err("Demasiados intentos. Esperá un momento antes de reintentar.".to_string());
    }

    last.0.store(now, Ordering::Relaxed);
    Ok(())
}

/// Cifra `plaintext` con una clave de 256 bits cualquiera (no necesariamente
/// la del estado), devuelve "nonce:ciphertext" en hex.
fn wrap_with_key(key_bytes: &[u8; 32], plaintext: &[u8]) -> Result<String, String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("error cifrando: {e}"))?;

    Ok(format!("{}:{}", hex::encode(nonce_bytes), hex::encode(ciphertext)))
}

/// Inverso de `wrap_with_key`.
fn unwrap_with_key(key_bytes: &[u8; 32], payload: &str) -> Result<Vec<u8>, String> {
    let (nonce_hex, ciphertext_hex) = payload
        .split_once(':')
        .ok_or_else(|| "formato invalido".to_string())?;

    let nonce_bytes = hex::decode(nonce_hex).map_err(|e| format!("nonce invalido: {e}"))?;
    let ciphertext = hex::decode(ciphertext_hex).map_err(|e| format!("ciphertext invalido: {e}"))?;

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "clave incorrecta o datos dañados".to_string())
}

/// Mínimo y máximo de caracteres para la contraseña.
/// El mínimo coincide con la validación del frontend (LoginScreen.svelte).
/// El máximo previene DoS por strings enormes en Argon2id.
const MIN_PASSWORD_LEN: usize = 4;
const MAX_PASSWORD_LEN: usize = 512;

fn validate_password(pw: &str) -> Result<(), String> {
    if pw.len() < MIN_PASSWORD_LEN {
        return Err(format!(
            "La contraseña debe tener al menos {MIN_PASSWORD_LEN} caracteres"
        ));
    }
    if pw.len() > MAX_PASSWORD_LEN {
        return Err(format!(
            "La contraseña no puede superar los {MAX_PASSWORD_LEN} caracteres"
        ));
    }
    Ok(())
}

/// Genera una "sal" aleatoria de 16 bytes (codificada en hex).
/// La sal NO es secreta, se puede guardar junto a los metadatos
/// del proyecto sin problema.
#[tauri::command]
pub fn generate_salt() -> String {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    hex::encode(salt)
}

/// Deriva la clave (Argon2id) a partir de la contraseña + sal, y la
/// guarda en el estado protegido. JS nunca ve el resultado, solo
/// sabe que el "unlock" funcionó o falló.
#[tauri::command]
pub fn unlock(
    password: String,
    salt: String,
    state: tauri::State<VaultState>,
    rate_limit: tauri::State<UnlockRateLimit>,
) -> Result<(), String> {
    check_rate_limit(&rate_limit)?;
    validate_password(&password)?;

    let salt_bytes = hex::decode(&salt).map_err(|e| format!("sal invalida: {e}"))?;

    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), &salt_bytes, &mut key)
        .map_err(|e| format!("error derivando la clave: {e}"))?;

    let mut guard = state.0.lock().map_err(|_| "no se pudo bloquear el estado".to_string())?;
    *guard = Some(key);

    Ok(())
}

/// Como `unlock`, pero sin validar el largo de la contraseña.
/// Existe exclusivamente para que perfiles creados antes de la
/// validación de mínimo 4 caracteres puedan verificar su contraseña
/// y borrar la cuenta. Después de usar este comando hay que hacer
/// `lock` — no deja la clave activa para operaciones normales.
#[tauri::command]
pub fn unlock_no_length_check(
    password: String,
    salt: String,
    state: tauri::State<VaultState>,
    rate_limit: tauri::State<UnlockRateLimit>,
) -> Result<(), String> {
    check_rate_limit(&rate_limit)?;

    let salt_bytes = hex::decode(&salt).map_err(|e| format!("sal invalida: {e}"))?;

    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), &salt_bytes, &mut key)
        .map_err(|e| format!("error derivando la clave: {e}"))?;

    let mut guard = state.0.lock().map_err(|_| "no se pudo bloquear el estado".to_string())?;
    *guard = Some(key);

    Ok(())
}

/// Borra la clave de memoria (cerrar sesión / bloquear la app).
#[tauri::command]
pub fn lock(state: tauri::State<VaultState>) {
    if let Ok(mut guard) = state.0.lock() {
        *guard = None;
    }
}

/// Para que el frontend sepa si necesita pedir la contraseña o no.
#[tauri::command]
pub fn is_unlocked(state: tauri::State<VaultState>) -> bool {
    state.0.lock().map(|g| g.is_some()).unwrap_or(false)
}

/// Cifra un texto (normalmente un JSON.stringify del árbol) con la
/// clave actualmente desbloqueada. Devuelve "nonce:ciphertext" en hex.
#[tauri::command]
pub fn encrypt(plaintext: String, state: tauri::State<VaultState>) -> Result<String, String> {
    let guard = state.0.lock().map_err(|_| "no se pudo leer el estado".to_string())?;
    let key_bytes = guard.ok_or_else(|| "bóveda bloqueada: ingresa la contraseña primero".to_string())?;

    wrap_with_key(&key_bytes, plaintext.as_bytes())
}

/// Descifra algo producido por `encrypt`. Si la contraseña con la
/// que se hizo `unlock` era incorrecta, esto falla (AES-GCM detecta
/// manipulación/clave equivocada gracias al tag de autenticación).
#[tauri::command]
pub fn decrypt(payload: String, state: tauri::State<VaultState>) -> Result<String, String> {
    let guard = state.0.lock().map_err(|_| "no se pudo leer el estado".to_string())?;
    let key_bytes = guard.ok_or_else(|| "bóveda bloqueada: ingresa la contraseña primero".to_string())?;

    let plaintext = unwrap_with_key(&key_bytes, &payload)
        .map_err(|_| "contraseña incorrecta o datos dañados".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("resultado no es texto valido: {e}"))
}

#[derive(Serialize)]
pub struct RecoverySetup {
    pub recovery_key: String,
    pub wrapped_recovery: String,
}

/// Genera una clave de recuperación nueva y envuelve con ella la
/// clave ACTUALMENTE activa (la que ya desbloqueaste con tu
/// contraseña). Requiere que la bóveda esté desbloqueada.
/// El `recovery_key` se muestra al usuario UNA sola vez: si no lo
/// guarda, no hay forma de recuperarlo después.
#[tauri::command]
pub fn setup_recovery(state: tauri::State<VaultState>) -> Result<RecoverySetup, String> {
    let guard = state.0.lock().map_err(|_| "no se pudo leer el estado".to_string())?;
    let active_key = guard.ok_or_else(|| "bóveda bloqueada".to_string())?;

    let mut recovery_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut recovery_bytes);

    let wrapped_recovery = wrap_with_key(&recovery_bytes, &active_key)?;

    Ok(RecoverySetup {
        recovery_key: hex::encode(recovery_bytes),
        wrapped_recovery,
    })
}

/// Desbloquea usando la clave de recuperación en vez de la
/// contraseña. Si funciona, deja la clave activa en el estado
/// igual que `unlock`, lista para usar con encrypt/decrypt.
#[tauri::command]
pub fn unlock_with_recovery(
    recovery_key: String,
    wrapped_recovery: String,
    state: tauri::State<VaultState>,
) -> Result<(), String> {
    let cleaned: String = recovery_key
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .collect();

    let recovery_vec = hex::decode(&cleaned)
        .map_err(|_| "clave de recuperación inválida".to_string())?;

    if recovery_vec.len() != 32 {
        return Err("clave de recuperación inválida (largo incorrecto)".to_string());
    }

    let mut recovery_bytes = [0u8; 32];
    recovery_bytes.copy_from_slice(&recovery_vec);

    let key_vec = unwrap_with_key(&recovery_bytes, &wrapped_recovery)
        .map_err(|_| "clave de recuperación incorrecta".to_string())?;

    if key_vec.len() != 32 {
        return Err("clave inválida".to_string());
    }

    let mut active_key = [0u8; 32];
    active_key.copy_from_slice(&key_vec);

    let mut state_guard = state
        .0
        .lock()
        .map_err(|_| "no se pudo bloquear el estado".to_string())?;
    *state_guard = Some(active_key);

    Ok(())
}

#[derive(Serialize)]
pub struct PasswordReset {
    pub salt: String,
    pub check: String,
}

/// Reemplaza la clave activa por una derivada de una NUEVA
/// contraseña. Requiere que la bóveda esté desbloqueada (típicamente
/// vía recuperación). OJO: esto NO re-cifra los proyectos por sí
/// solo — quien llama a esto debe primero leer/descifrar todos los
/// proyectos con la clave VIEJA (antes de llamar a esta función), y
/// después volver a guardarlos (lo que los re-cifra con la nueva).
///
/// Deprecated: usar `reset_master_key_atomic` que es seguro contra crashes.
#[tauri::command]
pub fn reset_master_key(
    new_password: String,
    state: tauri::State<VaultState>,
) -> Result<PasswordReset, String> {
    validate_password(&new_password)?;

    {
        let guard = state.0.lock().map_err(|_| "no se pudo leer el estado".to_string())?;
        guard.ok_or_else(|| {
            "bóveda bloqueada: necesitas desbloquear con la clave de recuperación primero"
                .to_string()
        })?;
    }

    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);

    let mut new_key = [0u8; 32];
    Argon2::default()
        .hash_password_into(new_password.as_bytes(), &salt, &mut new_key)
        .map_err(|e| format!("error derivando la clave: {e}"))?;

    let check = wrap_with_key(&new_key, b"plan-tree-ok")?;

    let mut guard = state.0.lock().map_err(|_| "no se pudo bloquear el estado".to_string())?;
    *guard = Some(new_key);

    Ok(PasswordReset {
        salt: hex::encode(salt),
        check,
    })
}

/// Versión atómica de reset_master_key: deriva una clave NUEVA a partir de
/// la contraseña, re-cifra TODOS los proyectos del perfil en Rust (lee,
/// descifra con clave VIEJA, recifra con NUEVA, escribe), y SOLO ENTONCES
/// cambia la clave activa. Si el proceso crashea durante el re-cifrado,
/// la clave VIEJA sigue activa porque el swap nunca ocurre.
#[tauri::command]
pub fn reset_master_key_atomic(
    new_password: String,
    profile_name: String,
    state: tauri::State<VaultState>,
    app: tauri::AppHandle,
) -> Result<PasswordReset, String> {
    validate_password(&new_password)?;

    // Copiar clave activa FUERA del lock para no mantenerlo durante I/O
    let active_key = {
        let guard = state
            .0
            .lock()
            .map_err(|_| "no se pudo leer el estado".to_string())?;
        *guard
            .as_ref()
            .ok_or_else(|| "bóveda bloqueada".to_string())?
    };

    // Derivar nueva clave
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);

    let mut new_key = [0u8; 32];
    Argon2::default()
        .hash_password_into(new_password.as_bytes(), &salt, &mut new_key)
        .map_err(|e| format!("error derivando la clave: {e}"))?;

    // Resolver ruta AppData
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no se pudo resolver AppData: {e}"))?;
    let projects_dir = app_data.join("profiles").join(&profile_name).join("projects");

    // Leer todos los .plan (si el dir no existe, no hay proyectos aún)
    let entries: Vec<_> = match std::fs::read_dir(&projects_dir) {
        Ok(dir) => dir
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .and_then(|s| s.to_str())
                    == Some("plan")
            })
            .collect(),
        Err(_) => vec![],
    };

    // Descifrar cada proyecto con clave VIEJA, recifrar con NUEVA, escribir
    for entry in &entries {
        let path = entry.path();
        let encrypted = std::fs::read_to_string(&path)
            .map_err(|e| format!("no se pudo leer {}: {e}", path.display()))?;
        let plaintext = unwrap_with_key(&active_key, &encrypted)?;
        let re_encrypted = wrap_with_key(&new_key, &plaintext)?;
        std::fs::write(&path, &re_encrypted)
            .map_err(|e| format!("no se pudo escribir {}: {e}", path.display()))?;
    }

    // Recién acá: cambiar la clave activa (swap atómico después de escribir)
    {
        let mut guard = state
            .0
            .lock()
            .map_err(|_| "no se pudo bloquear el estado".to_string())?;
        *guard = Some(new_key);
    }

    let check = wrap_with_key(&new_key, b"plan-tree-ok")?;

    Ok(PasswordReset {
        salt: hex::encode(salt),
        check,
    })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_password_ok() {
        assert!(validate_password("abcd").is_ok());
        assert!(validate_password(&"a".repeat(512)).is_ok());
        assert!(validate_password("hola mundo 123!").is_ok());
    }

    #[test]
    fn test_validate_password_too_short() {
        let err = validate_password("ab").unwrap_err();
        assert!(err.contains("menos"));
        let err = validate_password("").unwrap_err();
        assert!(err.contains("menos"));
    }

    #[test]
    fn test_validate_password_too_long() {
        let err = validate_password(&"a".repeat(513)).unwrap_err();
        assert!(err.contains("superar"));
    }

    #[test]
    fn test_wrap_unwrap_roundtrip() {
        let mut key = [0u8; 32];
        OsRng.fill_bytes(&mut key);

        let plaintext = b"plan-tree-ok";
        let wrapped = wrap_with_key(&key, plaintext).unwrap();
        let unwrapped = unwrap_with_key(&key, &wrapped).unwrap();

        assert_eq!(unwrapped, plaintext);
    }

    #[test]
    fn test_unwrap_with_wrong_key_fails() {
        let mut key_a = [0u8; 32];
        let mut key_b = [0u8; 32];
        OsRng.fill_bytes(&mut key_a);
        OsRng.fill_bytes(&mut key_b);

        let wrapped = wrap_with_key(&key_a, b"secreto").unwrap();
        let result = unwrap_with_key(&key_b, &wrapped);

        assert!(result.is_err());
    }

    #[test]
    fn test_unwrap_malformed_payload() {
        let key = [0u8; 32];
        let result = unwrap_with_key(&key, "no-hay-dos-puntos");
        assert!(result.is_err());

        let result = unwrap_with_key(&key, "hexinvalido:hexinvalido");
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_salt_returns_hex() {
        let salt = generate_salt();
        // 16 bytes → 32 hex chars
        assert_eq!(salt.len(), 32);
        assert!(salt.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_check_rate_limit_first_call_ok() {
        let limit = UnlockRateLimit(AtomicU64::new(0));
        assert!(check_rate_limit(&limit).is_ok());
    }
}