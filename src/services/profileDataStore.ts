import type { TagDefinition } from "../types";
import { readTextFile, writeTextFile, mkdir, remove } from "./fsAdapter";

const PROFILES_FILE = "profiles.json";

interface ProfilesFile {
  profiles: string[];
  lastProfile: string | null;
  language: string;
  lastProjectByProfile: Record<string, string>;
  projectColorsByProfile: Record<string, Record<string, string>>;
  graphSelectionByProfile: Record<string, string[]>;
  tagsByProfile: Record<string, TagDefinition[]>;
  panelLayoutByProfile: Record<string, { rightView: string | null; splitPosition: number }>;
  panelProjectsByProfile: Record<string, { left: string; right: string | null }>;
  pluginSettingsByProfile: Record<string, Record<string, Record<string, unknown>>>;
}

function defaultData(): ProfilesFile {
  return {
    profiles: [],
    lastProfile: null,
    language: "es",
    lastProjectByProfile: {},
    projectColorsByProfile: {},
    graphSelectionByProfile: {},
    tagsByProfile: {},
    panelLayoutByProfile: {},
    panelProjectsByProfile: {},
    pluginSettingsByProfile: {},
  };
}

/**
 * Central store for all profile-related persistent data.
 *
 * - **Lazy cache**: reads `profiles.json` from disk once, caches it in memory.
 * - **Dirty tracking**: mutations mark the cache dirty and flush on next tick.
 * - **Serialized writes**: a promise queue ensures concurrent mutations don't
 *   clobber each other (e.g. saveTags + savePanelLayout firing simultaneously).
 */
class ProfileDataStore {
  private data: ProfilesFile | null = null;
  private dirty = false;
  private writeQueue: Promise<void> = Promise.resolve();

  private serialized<T>(fn: () => Promise<T>): Promise<T> {
    const result: Promise<T> = this.writeQueue.then(fn);
    this.writeQueue = result.then(() => {}, () => {});
    return result;
  }

  private async load(): Promise<ProfilesFile> {
    if (this.data) return this.data;

    const exists = await readTextFile(PROFILES_FILE).then(
      () => true,
      () => false,
    );

    if (!exists) {
      this.data = defaultData();
      return this.data;
    }

    const text = await readTextFile(PROFILES_FILE);
    const parsed = JSON.parse(text) as Partial<ProfilesFile>;

    // Merge defaults for missing fields (backward compat with older schema)
    this.data = { ...defaultData(), ...parsed };
    return this.data;
  }

  private async flush(): Promise<void> {
    if (!this.dirty || !this.data) return;
    await writeTextFile(PROFILES_FILE, JSON.stringify(this.data));
    this.dirty = false;
  }

  /** Force a reload from disk on the next read. */
  invalidateCache(): void {
    this.data = null;
    this.dirty = false;
  }

  // ── Registry ──────────────────────────────────────────────

  async listProfiles(): Promise<string[]> {
    const data = await this.load();
    return data.profiles;
  }

  async getLastProfile(): Promise<string | null> {
    const data = await this.load();
    return data.lastProfile;
  }

  async setLastProfile(name: string | null): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.lastProfile = name;
      this.dirty = true;
      await this.flush();
    });
  }

  async getLanguage(): Promise<string> {
    const data = await this.load();
    return data.language ?? "es";
  }

  async setLanguage(lang: string): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.language = lang;
      this.dirty = true;
      await this.flush();
    });
  }

  async hasProfiles(): Promise<boolean> {
    const data = await this.load();
    return data.profiles.length > 0;
  }

  async createProfile(name: string): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.profiles.push(name);
      this.dirty = true;
      await this.flush();
    });
  }

  async deleteProfile(name: string): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();

      // Remove profile directory
      await remove(`profiles/${name}`, { recursive: true }).catch(() => {});

      // Clean up all references
      data.profiles = data.profiles.filter((p) => p !== name);
      delete data.lastProjectByProfile[name];
      delete data.projectColorsByProfile[name];
      delete data.graphSelectionByProfile[name];
      delete data.tagsByProfile[name];
      delete data.panelLayoutByProfile[name];
      if (data.lastProfile === name) data.lastProfile = null;

      this.dirty = true;
      await this.flush();
    });
  }

  // ── Per-profile settings ──────────────────────────────────

  async getLastProject(profile: string): Promise<string | null> {
    const data = await this.load();
    return data.lastProjectByProfile[profile] ?? null;
  }

  async setLastProject(profile: string, project: string): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.lastProjectByProfile[profile] = project;
      this.dirty = true;
      await this.flush();
    });
  }

  async getProjectColors(profile: string): Promise<Record<string, string>> {
    const data = await this.load();
    return data.projectColorsByProfile[profile] ?? {};
  }

  async saveProjectColor(profile: string, project: string, color: string): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      if (!data.projectColorsByProfile[profile]) {
        data.projectColorsByProfile[profile] = {};
      }
      data.projectColorsByProfile[profile][project] = color;
      this.dirty = true;
      await this.flush();
    });
  }

  async getGraphSelection(profile: string): Promise<string[] | null> {
    const data = await this.load();
    return data.graphSelectionByProfile[profile] ?? null;
  }

  async saveGraphSelection(profile: string, selected: string[]): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.graphSelectionByProfile[profile] = selected;
      this.dirty = true;
      await this.flush();
    });
  }

  async getTagDefs(profile: string): Promise<TagDefinition[]> {
    const data = await this.load();
    return data.tagsByProfile[profile] ?? [];
  }

  async saveTagDefs(profile: string, defs: TagDefinition[]): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.tagsByProfile[profile] = defs;
      this.dirty = true;
      await this.flush();
    });
  }

  async getPanelLayout(
    profile: string,
  ): Promise<{
    rightView: string | null;
    splitPosition: number;
    leftProject: string | null;
    rightProject: string | null;
  } | null> {
    const data = await this.load();
    const layout = data.panelLayoutByProfile[profile] ?? null;
    const projects = data.panelProjectsByProfile[profile] ?? null;

    // Backward compat: migrate from lastProjectByProfile if no panelProjects
    if (layout && !projects) {
      const lastProject = data.lastProjectByProfile[profile] ?? null;
      if (lastProject) {
        data.panelProjectsByProfile[profile] = { left: lastProject, right: null };
        this.dirty = true;
        // flush will happen on next serialized write
      }
    }

    const proj = data.panelProjectsByProfile[profile];
    return layout
      ? {
          ...layout,
          leftProject: proj?.left ?? null,
          rightProject: proj?.right ?? null,
        }
      : null;
  }

  async savePanelLayout(
    profile: string,
    rightView: string | null,
    splitPosition: number,
    leftProject: string | null,
    rightProject: string | null,
  ): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.panelLayoutByProfile[profile] = { rightView, splitPosition };
      if (leftProject) {
        data.panelProjectsByProfile[profile] = { left: leftProject, right: rightProject };
      }
      this.dirty = true;
      await this.flush();
    });
  }

  // ── Plugin Settings ────────────────────────────────────────

  /**
   * Read a plugin setting from the in-memory cache.
   * Returns undefined if profile or key doesn't exist (no error thrown).
   */
  getPluginSettingsCached(
    profile: string,
    pluginId: string,
    key: string,
  ): unknown {
    if (!this.data) return undefined;
    const profileSettings = this.data.pluginSettingsByProfile[profile];
    if (!profileSettings) return undefined;
    const pluginSettings = profileSettings[pluginId];
    if (!pluginSettings) return undefined;
    return pluginSettings[key];
  }

  /**
   * Read all settings for a plugin in a profile.
   */
  async getPluginSettings(
    profile: string,
    pluginId: string,
  ): Promise<Record<string, unknown>> {
    const data = await this.load();
    return data.pluginSettingsByProfile[profile]?.[pluginId] ?? {};
  }

  /**
   * Write a single plugin setting (profile-scoped).
   */
  async setPluginSettings(
    profile: string,
    pluginId: string,
    key: string,
    value: unknown,
  ): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      if (!data.pluginSettingsByProfile[profile]) {
        data.pluginSettingsByProfile[profile] = {};
      }
      if (!data.pluginSettingsByProfile[profile][pluginId]) {
        data.pluginSettingsByProfile[profile][pluginId] = {};
      }
      data.pluginSettingsByProfile[profile][pluginId][key] = value;
      this.dirty = true;
      await this.flush();
    });
  }

  /**
   * Remove all settings for a plugin across all profiles (uninstall cleanup).
   */
  async clearPluginSettings(pluginId: string): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      for (const profile of Object.keys(data.pluginSettingsByProfile)) {
        delete data.pluginSettingsByProfile[profile][pluginId];
      }
      this.dirty = true;
      await this.flush();
    });
  }
}

/** Singleton instance — all profile data access goes through this. */
export const profileData = new ProfileDataStore();
