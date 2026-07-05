# Plan de Auditoría de Seguridad — Plan Tree

## Visión General

Aplicación Tauri v2 (Svelte 5 + TypeScript + Rust) para organización jerárquica de tareas con
encriptación de extremo a extremo. Todos los datos se almacenan cifrados en disco local
(AES-256-GCM + Argon2id). La clave vive únicamente en memoria del proceso Rust.

---

## Fortalezas Actuales (ya implementado)

| Área | Estado |
|------|--------|
| Cifrado de datos en reposo | AES-256-GCM con clave derivada de contraseña via Argon2id |
| Clave nunca serializada | `VaultState(Mutex<Option<[u8; 32]>>)` — nunca sale de Rust, nunca viaja a JS |
| Sin bloques `unsafe` | Cero en código de aplicación |
| CSP estricto | `script-src: 'self'`, `frame-src: 'none'`, `object-src: 'none'` |
| Sin XSS por template | Svelte auto-escaping, cero `{@html}` |
| IPC centralizado | 9 comandos Tauri llamados desde un único módulo (`vaultManager.ts`) |
| Sin permisos shell/HTTP | No hay `shell`, `http`, ni `process` en capabilities |
| File system scoped a AppData | Operaciones limitadas al directorio de la app |
| Checksum en vault.meta | `sha256Hex` para detectar manipulación del archivo de metadata |
| Filtro en recovery key | Solo dígitos hexadecimales permitidos en Rust |
| `try/finally` en operaciones críticas | Password verification restaura perfil activo incluso en error |

---

## Checklist de Auditoría

### 1. Capabilities / ACL

- [x] **Revisar `core:window:default`**: está incluido en `core:default`. Incluye manejo de
      ventanas (tamaño, posición, visibilidad, decoración, fullscreen, monitores, cursor).
      Los permisos adicionales que agregamos manualmente (`allow-close`, `allow-show`,
      `allow-set-focus`, `allow-destroy`) están cubiertos por `core:window:default`. Se
      simplificó a solo `core:default`.
- [x] **`fs:allow-app-read-recursive` / `fs:allow-app-write-recursive`**: reemplazados por permisos
      individuales scoped: `fs:allow-read`, `fs:allow-write`, `fs:allow-exists`, `fs:allow-mkdir`,
      `fs:allow-remove`, `fs:allow-rename` con paths acotados a `$APPDATA/profiles/`,
      `$APPDATA/profiles.json`, y `$APPDATA/plan-tree.json` (legacy migration).
- [x] **Minimalismo**: revisado. 14 permisos reducidos a 10 (core:default + 6 fs scoped + 3 dialog).
      Cada permiso fs tiene paths explícitos. Sin permisos shell/HTTP/process.
- [ ] **Separar capabilities por ventana**: actualmente todo en `["main"]`. Si en el futuro hay
      ventanas secundarias, crear capabilities específicas.
- [x] **Revisar `core:default`**: incluye `core:app:default`, `core:event:default`,
      `core:image:default`, `core:menu:default`, `core:path:default`, `core:resources:default`,
      `core:tray:default`, `core:webview:default`, `core:window:default`. El equipo de Tauri lo
      considera "razonablemente seguro". No se identificaron riesgos concretos para Plan Tree.

### 2. Comandos IPC en Rust

- [x] **Validación de entrada en cada `#[tauri::command]`**:
  - `encrypt` / `decrypt`: el tamaño está acotado por la estructura de datos (TreeNode
        serializado). Un árbol de tareas no supera unos pocos MB en la práctica. Los comandos
        Rust manejan strings de hasta ~512MB por omisión de Tauri. Riesgo aceptable para app
        desktop local — el payload máximo está limitado por el plan tree structure.
  - `unlock`: ✅ validación server-side agregada (min 4, max 512 chars) en `vault.rs`.
  - `reset_master_key`: ✅ idem.
- [x] **Rate limiting en `unlock`**: implementado con `UnlockRateLimit(AtomicU64)` en Rust.
      Mínimo 500ms entre intentos. Si se excede, devuelve error "Demasiados intentos.".
- [x] **Atomicidad en `reset_master_key`**: reemplazado por `reset_master_key_atomic` que:
        (1) lee todos los .plan desde Rust, (2) descifra con clave VIEJA,
        (3) recifra con NUEVA, (4) escribe TODOS los archivos,
        (5) SOLO ENTONCES cambia la clave activa. Si crashea, la clave vieja
        sigue activa. Sin backup temporal. El comando antiguo se conserva deprecated.
- [ ] **Panics**: todos los commands devuelven `Result<_, String>`. Verificar que ningún camino
      de error pueda causar panic (unwrap/expect).

### 3. CSP

- [x] **`ws://localhost:5173` en production CSP**: eliminado de `connect-src` en `tauri.conf.json`.
      Solo necesario en modo dev para HMR de Vite.
- [ ] **`'unsafe-inline'` en style-src**: necesario para Svelte. Monitorear si Svelte algún día
      soporta nonce/hash para estilos.
- [x] **`img-src: 'self' data: blob:`**: `blob:` sí es necesario — `URL.createObjectURL()` se usa
      en `resizeImage.ts` y `dialogAdapter.ts` para precargar imágenes seleccionadas por el
      usuario antes de convertirlas a data URIs. Sin `blob:`, el preview de iconos no funciona.
      `data:` es necesario para los iconos almacenados como data URIs en el tree node.

### 4. Scopes del Plugin `fs`

- [x] **Scopes actuales**: las operaciones de fs se hacen con `BaseDirectory.AppData` y paths
      relativos. `SAFE_NAME_REGEX = /^[A-Za-z0-9 _-]{1,32}$/` previene cualquier path traversal
      (sin `/`, `..`, o caracteres de control). Máx 32 caracteres alineado con AGENTS.md.
- [x] **Sanitización de nombres de archivo**: creado `src/utils/validation.ts` con
      `validateSafeName()` (regex `/^[A-Za-z0-9 _-]{1,32}$/` alineado con AGENTS.md). Aplicado en:
      `createProfile`, `createProject`, `renameProject`, y en los modales
      `NewProjectModal` y `RenameProjectModal` con feedback instantáneo.
- [ ] **Operación `remove` en profile**: borra recursivamente `profiles/<name>/`. Verificar
      que el path no pueda salirse del directorio esperado.

### 5. Frontend XSS

- [x] **`innerHTML` en `main.ts:18`**: migrado a DOM API segura (`textContent` + `appendChild`).
- [x] **`node.icon` en `<img src>`**: validado con `isValidIconDataUri()` en `validation.ts` — solo
      data URIs de imagen (PNG/JPEG base64) pasan al render. El picker (`pickAndResizeImage`) ya
      filtra por tipo y tamaño, la validación en `NodeCard.svelte` es la segunda barrera.
- [ ] **Node titles / project names / profile names**: se renderizan con Svelte `{...}` que
      auto-escapena. Sin riesgo actual.
- [ ] **Event handlers**: revisar que ningún evento svelte (`on:click`, `on:input`, etc.)
      use `eval()`-like patterns o pase strings a funciones peligrosas.

### 6. Dependencias

- [x] **Agregar `npm audit` al CI** o al workflow de build. → `npm run audit:npm` agregado en package.json. 0 vulnerabilities.
- [x] **Agregar `cargo audit`** para dependencias Rust. → `npm run audit:cargo` agregado. 2 vulnerabilities encontradas (quick-xml 0.39.4, ambas high).
- [x] **Vulnerabilidad activa**: `quick-xml 0.39.4` (transitiva via tauri → plist). Dos CVEs:
  - RUSTSEC-2026-0194: Quadratic run time en start tag con atributos duplicados (7.5 high)
  - RUSTSEC-2026-0195: Unbounded namespace allocation en NsReader → DoS memory (7.5 high)
  - Solución: ✅ `cargo update -p plist` → plist 1.10.0 trae quick-xml 0.41.0. Tauri actualizado a 2.11.5.
- [x] **Revisar dependencias no utilizadas**: `log 0.4` se usa directamente en `lib.rs:36`
      (`log::LevelFilter::Info`). `tauri-plugin-log` no re-exporta el crate, es necesaria
      como dependencia directa. ✓
- [x] **Verificar supply chain**: 4 dependencias npm oficiales de Tauri. Rust: RustCrypto
      (aes-gcm, argon2) y Tauri org. Sin riesgos identificados.
- [x] **Versiones**: `aes-gcm 0.10` y `argon2 0.5` son de RustCrypto, sin CVEs conocidos
      en estas versiones. Latest aes-gcm: 0.11.0, argon2: 0.6.0-rc.8.

### 7. Manejo de Datos Sensibles en Memoria

- [x] **Zeroing de contraseñas en JS**: en `LoginScreen.svelte`, la password se captura en `pwd`
      y se limpia `password = ""` antes de la llamada async. En el flujo de recovery,
      `recoveryKeyInput` y `newPassword` también se limpian al volver al login.
- [x] **Recovery key en pantalla**: en `RecoveryBanner.svelte`, al cerrar el banner se asigna
      `showRecoveryKey = ""` y el `{#if}` se destruye (no queda hidden DOM). En
      `LoginScreen.svelte`, `newRecoveryKeyResult` se limpia al volver al login.
- [x] **Logs**: `tauri-plugin-log` solo se carga en debug (`lib.rs:33-39`). No hay
      `log!()` / `println!` / `console.log` en todo el código de la app. Cero riesgo de
      filtrado de datos sensibles por logs.

### 8. Configuración de Tauri

- [ ] **`devUrl` en producción**: `tauri.conf.json` tiene `devUrl: "http://localhost:5173"`.
      No se usa en producción (se usa `frontendDist`), pero es bueno saberlo.
- [ ] **Window config**: `resizable: true`. Evaluar si es necesario para seguridad
      (ventanas no redimensionables evitan ataques de UI redressing).
- [ ] **Identifier**: `dev.tyto.plan-tree`. Es el AppData path — consistente.

---

## Priorización

| Prioridad | Ítem | Esfuerzo | Impacto |
|-----------|------|----------|---------|
| P0 | Validación server-side de passwords (longitud mínima) | Bajo | Alto | ✅ |
| P0 | Agregar `npm audit` / `cargo audit` | Bajo | Alto | ✅ |
| P1 | Sanitización de nombres de archivo (project/profile) | Bajo | Alto | ✅ |
| P1 | Migrar `innerHTML` a API segura en `main.ts` | Bajo | Medio | ✅ |
| P1 | Rate limiting en `unlock` | Medio | Medio |
| P2 | Acotar permisos fs a subpaths concretos | Medio | Medio | ✅ |
| P2 | Atomicidad en password reset (reset_master_key_atomic) | Alto | Medio | ✅ |
| P2 | Quitar `ws://localhost:5173` del CSP de producción | Bajo | Bajo | ✅ |
| P2 | Revisar `core:default` / `core:window:default` | Bajo | Medio | ✅ |
| P3 | Zeroing de contraseñas en JS | Bajo | Bajo | ✅ |
| P3 | Verificar recovery key no quede en DOM | Bajo | Bajo | ✅ |

---

## Notas Adicionales

- **Plugin `single-instance`**: no requiere permisos JS. Se configura desde Rust y maneja
      el evento `single-instance` que la app escucha para traer la ventana al frente.
- **Plugin `dialog`**: solo `save`, `open`, `ask`. No incluye `message` ni `confirm` —
      aunque esos son de bajo riesgo.
- **Export/Import via dialog**: el usuario selecciona archivos manualmente. El path no
      se construye en la app, sino que viene del native dialog. Sin riesgo de path traversal.
- **Imágenes**: el image picker lee archivos y los convierte a data URIs en memoria
      (`resizeImage.ts`). No se persisten rutas de archivo.

---

## Próximos Pasos

1. Abordar items P0
2. Revisar items P1
3. Decidir si vale la pena los items P2 (relación esfuerzo/impacto)
4. Reevaluar después de cada release significativo
