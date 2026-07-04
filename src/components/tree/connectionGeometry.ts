import type { TreeViewNode } from "../../types";
import { COLUMN_WIDTH } from "../../constants/layout";
import type { NodeMeasurement } from "../../stores/nodeMeasurementsStore";

export interface ConnectionPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function buildConnectionPoints(
  parent: TreeViewNode,
  child: TreeViewNode,
  rowOffsets: Map<number, number>,
  measurements: Map<string, NodeMeasurement>,
): ConnectionPoints {
  const parentMeasure = measurements.get(parent.node.id);

  const childMeasure = measurements.get(child.node.id);

  const parentWidth = parentMeasure?.width ?? COLUMN_WIDTH;
  const parentHeight = parentMeasure?.height ?? 61;

  const childWidth = childMeasure?.width ?? COLUMN_WIDTH;
  const childHeight = childMeasure?.height ?? 61;

  return {
    x1: parent.x * COLUMN_WIDTH + parentWidth / 2,
    y1: (rowOffsets.get(parent.depth) ?? 0) + parentHeight,

    x2: child.x * COLUMN_WIDTH + childWidth / 2,
    y2: rowOffsets.get(child.depth) ?? 0,
  };
}
