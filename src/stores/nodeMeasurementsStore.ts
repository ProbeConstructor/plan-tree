import { writable, get } from "svelte/store";

export interface NodeMeasurement {
  depth: number;
  width: number;
  height: number;
}

export const nodeMeasurements = writable(new Map<string, NodeMeasurement>());

export function registerNodeMeasurement(
  nodeId: string,
  depth: number,
  width: number,
  height: number,
): void {
  const map = new Map(get(nodeMeasurements));
  const current = map.get(nodeId);
  if (
    current &&
    current.depth === depth &&
    current.width === width &&
    current.height === height
  ) {
    return;
  }
  map.set(nodeId, {
    depth,
    width,
    height,
  });
  nodeMeasurements.set(map);
}

export function unregisterNodeMeasurement(nodeId: string): void {
  const map = new Map(get(nodeMeasurements));
  map.delete(nodeId);
  nodeMeasurements.set(map);
}
