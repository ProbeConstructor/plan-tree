import { get } from "svelte/store";
import { profiles, activeProfile } from "../stores/profileStore";
import { validateSafeName } from "../utils/validation";

const PROFILES_FILE = "profiles.json";

interface ProfilesFile {
  profiles: string[];
  lastProfile: string | null;
  lastProjectByProfile: Record<string, string>;
}

async function fsModule() {
  return import("@tauri-apps/plugin-fs");
}

async function readProfilesFile(): Promise<ProfilesFile> {
  const { readTextFile, exists, BaseDirectory } = await fsModule();

  const fileExists = await exists(PROFILES_FILE, {
    baseDir: BaseDirectory.AppData,
  });

  if (!fileExists) {
    return { profiles: [], lastProfile: null, lastProjectByProfile: {} };
  }

  const text = await readTextFile(PROFILES_FILE, {
    baseDir: BaseDirectory.AppData,
  });

  const data = JSON.parse(text) as Partial<ProfilesFile>;

  // por si el archivo es de antes de que existiera este campo
  return {
    profiles: data.profiles ?? [],
    lastProfile: data.lastProfile ?? null,
    lastProjectByProfile: data.lastProjectByProfile ?? {},
  };
}

async function writeProfilesFile(data: ProfilesFile): Promise<void> {
  const { writeTextFile, BaseDirectory } = await fsModule();

  await writeTextFile(PROFILES_FILE, JSON.stringify(data), {
    baseDir: BaseDirectory.AppData,
  });
}

/**
 * Carpeta base de un perfil. Lo usan vaultMeta.ts y projectManager.ts
 * para construir rutas como `${profileDir(name)}/vault.meta` o
 * `${profileDir(name)}/projects/...`.
 */
export function profileDir(name: string): string {
  return `profiles/${name}`;
}

/** Igual que profileDir, pero usando el perfil ACTIVO. Lanza si no hay ninguno. */
export function activeProfileDir(): string {
  const name = get(activeProfile);
  if (!name) {
    throw new Error("No hay perfil activo todavía.");
  }
  return profileDir(name);
}

export async function refreshProfiles(): Promise<void> {
  const data = await readProfilesFile();
  profiles.set(data.profiles);
}

export async function restoreLastProfile(): Promise<void> {
  const data = await readProfilesFile();
  if (data.lastProfile && data.profiles.includes(data.lastProfile)) {
    activeProfile.set(data.lastProfile);
  }
}

const MAX_PROFILES = 10;

export async function createProfile(name: string): Promise<void> {
  validateSafeName(name, "Perfil");

  const { mkdir, BaseDirectory } = await fsModule();

  const data = await readProfilesFile();

  if (data.profiles.includes(name)) {
    throw new Error(`Ya existe un perfil llamado "${name}".`);
  }

  if (data.profiles.length >= MAX_PROFILES) {
    throw new Error(
      `Ya hay ${MAX_PROFILES} perfiles. Borra alguno antes de crear otro.`,
    );
  }

  await mkdir(`${profileDir(name)}/projects`, {
    baseDir: BaseDirectory.AppData,
    recursive: true,
  });

  data.profiles.push(name);
  await writeProfilesFile(data);
  await refreshProfiles();
}

export async function selectProfile(name: string): Promise<void> {
  const data = await readProfilesFile();
  data.lastProfile = name;
  await writeProfilesFile(data);

  activeProfile.set(name);
}

/** "Cambiar de usuario": vuelve al ProfileSelector sin cerrar la app. */
export function clearActiveProfile(): void {
  activeProfile.set(null);
}

/** Borra un perfil completo: su carpeta en disco + sus entradas en profiles.json. */
export async function deleteProfile(name: string): Promise<void> {
  const { remove, BaseDirectory } = await fsModule();

  await remove(profileDir(name), {
    baseDir: BaseDirectory.AppData,
    recursive: true,
  });

  const data = await readProfilesFile();
  data.profiles = data.profiles.filter((p) => p !== name);
  delete data.lastProjectByProfile[name];
  if (data.lastProfile === name) {
    data.lastProfile = null;
  }

  await writeProfilesFile(data);
  await refreshProfiles();
}

/** Cuál fue el último proyecto abierto por ESTE perfil (null si nunca abrió ninguno). */
export async function getLastProject(
  profileName: string,
): Promise<string | null> {
  const data = await readProfilesFile();
  return data.lastProjectByProfile[profileName] ?? null;
}

/** Recuerda cuál fue el último proyecto abierto por ESTE perfil. */
export async function setLastProject(
  profileName: string,
  projectName: string,
): Promise<void> {
  const data = await readProfilesFile();
  data.lastProjectByProfile[profileName] = projectName;
  await writeProfilesFile(data);
}
