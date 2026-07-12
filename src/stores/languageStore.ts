import { writable } from "svelte/store";
import { locale } from "svelte-i18n";
import { profileData } from "../services/profileDataStore";

/** Current app language. */
export const currentLanguage = writable<string>("es");

/**
 * Load the saved language from profiles.json and apply it.
 * Called once during app bootstrap.
 */
export async function loadLanguage(): Promise<void> {
  const lang = await profileData.getLanguage();
  currentLanguage.set(lang);
  locale.set(lang);
}

/**
 * Change the app language and persist it.
 * Updates both the Svelte store and svelte-i18n locale reactively.
 */
export async function setLanguage(lang: string): Promise<void> {
  await profileData.setLanguage(lang);
  currentLanguage.set(lang);
  locale.set(lang);
}
