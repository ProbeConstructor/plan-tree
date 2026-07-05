import { describe, it, expect } from "vitest";
import { get } from "svelte/store";
import { currentView } from "./viewStore";
import type { View } from "./viewStore";

describe("currentView store", () => {
  it("defaults to 'tree'", () => {
    expect(get(currentView)).toBe("tree");
  });

  it("accepts 'calendar' as a valid view after setting", () => {
    currentView.set("calendar");
    expect(get(currentView)).toBe("calendar");
  });

  it("accepts 'dashboard' as a valid view after setting", () => {
    currentView.set("dashboard");
    expect(get(currentView)).toBe("dashboard");
  });

  it("accepts 'tree' after switching from another view", () => {
    currentView.set("tree");
    expect(get(currentView)).toBe("tree");
  });

  it("notifies subscribers when view changes to calendar", () => {
    const seen: View[] = [];
    const unsub = currentView.subscribe((v) => seen.push(v));
    currentView.set("calendar");
    expect(seen).toContain("calendar");
    unsub();
  });
});
