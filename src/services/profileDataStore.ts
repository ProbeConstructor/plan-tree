import type { TagDefinition } from "../types";
import { readTextFile, writeTextFile, mkdir, remove } from "./fsAdapter";

const PROFILES_FILE = "profiles.json";

interface ProfilesFile {
  profiles: string[];
  lastProfile: string | null;
  lastProjectByProfile: Record<string, string>;
  projectColorsByProfile: Record<string, Record<string, string>>;
  graphSelectionByProfile: Record<string, string[]>;
  tagsByProfile: Record<string, TagDefinition[]>;
  panelLayoutByProfile: Record<string, { rightView: string | null; splitPosition: number }>;
}

function defaultData(): ProfilesFile {
  return {
    profiles: [],
    lastProfile: null,
    lastProjectByProfile: {},
    projectColorsByProfile: {},
    graphSelectionByProfile: {},
    tagsByProfile: {},
    panelLayoutByProfile: {},
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
  ): Promise<{ rightView: string | null; splitPosition: number } | null> {
    const data = await this.load();
    return data.panelLayoutByProfile[profile] ?? null;
  }

  async savePanelLayout(
    profile: string,
    rightView: string | null,
    splitPosition: number,
  ): Promise<void> {
    return this.serialized(async () => {
      const data = await this.load();
      data.panelLayoutByProfile[profile] = { rightView, splitPosition };
      this.dirty = true;
      await this.flush();
    });
  }
}

/** Singleton instance — all profile data access goes through this. */
export const profileData = new ProfileDataStore();
