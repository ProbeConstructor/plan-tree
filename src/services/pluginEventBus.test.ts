import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  pluginEventBus,
  PluginSubscriptionTracker,
} from "./pluginEventBus";

describe("PluginEventBus", () => {
  beforeEach(() => {
    pluginEventBus.clear();
  });

  it("emits to a single listener", () => {
    const cb = vi.fn();
    pluginEventBus.on("node:changed", cb);
    pluginEventBus.emit("node:changed", {
      node: { id: "n1" } as any,
      type: "added",
    });
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith({
      node: { id: "n1" },
      type: "added",
    });
  });

  it("emits to multiple listeners", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    pluginEventBus.on("node:changed", cb1);
    pluginEventBus.on("node:changed", cb2);
    pluginEventBus.emit("node:changed", {
      node: { id: "n1" } as any,
      type: "updated",
    });
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it("unsubscribe stops delivery", () => {
    const cb = vi.fn();
    const unsub = pluginEventBus.on("node:changed", cb);
    unsub();
    pluginEventBus.emit("node:changed", {
      node: { id: "n1" } as any,
      type: "added",
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it("emit with no listeners does not throw", () => {
    expect(() =>
      pluginEventBus.emit("project:loaded", { project: "test" }),
    ).not.toThrow();
  });

  it("listener error does not break other listeners", () => {
    const badCb = vi.fn(() => {
      throw new Error("boom");
    });
    const goodCb = vi.fn();
    pluginEventBus.on("node:changed", badCb);
    pluginEventBus.on("node:changed", goodCb);
    pluginEventBus.emit("node:changed", {
      node: { id: "n1" } as any,
      type: "added",
    });
    expect(goodCb).toHaveBeenCalledOnce();
  });

  it("listenerCount reflects active subscriptions", () => {
    expect(pluginEventBus.listenerCount()).toBe(0);
    const unsub1 = pluginEventBus.on("node:changed", () => {});
    const unsub2 = pluginEventBus.on("node:changed", () => {});
    expect(pluginEventBus.listenerCount()).toBe(2);
    unsub1();
    expect(pluginEventBus.listenerCount()).toBe(1);
    unsub2();
    expect(pluginEventBus.listenerCount()).toBe(0);
  });
});

describe("PluginSubscriptionTracker", () => {
  beforeEach(() => {
    pluginEventBus.clear();
  });

  it("tracks subscriptions and cleans up all on cleanup()", () => {
    const tracker = new PluginSubscriptionTracker(pluginEventBus, "p1");
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    tracker.on("node:changed", cb1);
    tracker.on("project:loaded", cb2);

    pluginEventBus.emit("node:changed", {
      node: { id: "n1" } as any,
      type: "added",
    });
    pluginEventBus.emit("project:loaded", { project: "proj" });
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();

    tracker.cleanup();

    pluginEventBus.emit("node:changed", {
      node: { id: "n2" } as any,
      type: "updated",
    });
    pluginEventBus.emit("project:loaded", { project: "proj2" });
    expect(cb1).toHaveBeenCalledOnce(); // not called again
    expect(cb2).toHaveBeenCalledOnce(); // not called again
  });

  it("cleanup is idempotent", () => {
    const tracker = new PluginSubscriptionTracker(pluginEventBus, "p2");
    tracker.on("node:changed", () => {});
    tracker.cleanup();
    expect(() => tracker.cleanup()).not.toThrow();
  });
});
