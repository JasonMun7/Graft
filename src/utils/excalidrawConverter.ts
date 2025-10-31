import { convertToExcalidrawElements as convertSkeleton } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

interface DiagramStructure {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

// Visual defaults
const DEFAULT_FONT_SIZE = 20;
const ROUNDNESS = { type: 3 } as const;
const ARROW_OFFSET = 14;

/**
 * Convert diagram structure to Excalidraw elements using Skeleton API.
 */
export function convertToExcalidrawElements(
  structure: DiagramStructure
): ExcalidrawElement[] {
  const skeleton: any[] = [];
  const nodeDims = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();

  // Layout parameters
  const n = structure.nodes.length;
  const cols = Math.min(3, Math.max(1, n));
  const baseWidth = 460; // larger width to prevent cut-off
  const baseHeight = 110; // baseline height; Excalidraw will expand for long text
  const colGap = 300;
  const rowGap = 200;
  const startX = 100;
  const startY = 120;

  structure.nodes.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = startX + col * (baseWidth + colGap);
    const y = startY + row * rowGap;

    nodeDims.set(node.id, { x, y, w: baseWidth, h: baseHeight });

    skeleton.push({
      type: "rectangle",
      id: node.id,
      x,
      y,
      width: baseWidth,
      roundness: ROUNDNESS,
      label: {
        text: node.label,
        fontSize: DEFAULT_FONT_SIZE,
        textAlign: "center",
        verticalAlign: "middle",
      },
      backgroundColor: "#ffffff",
      strokeColor: "#4379FF",
      strokeWidth: 2,
    });
  });

  // Arrows: add bindings by id AND geometry so they show immediately and attach to shapes
  for (const edge of structure.edges) {
    const from = nodeDims.get(edge.from);
    const to = nodeDims.get(edge.to);
    if (!from || !to) continue;

    const fromCx = from.x + from.w / 2;
    const fromCy = from.y + from.h / 2;
    const toCx = to.x + to.w / 2;
    const toCy = to.y + to.h / 2;

    const dx = toCx - fromCx;
    const dy = toCy - fromCy;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const fromEdgeX = fromCx + nx * (from.w / 2 + ARROW_OFFSET);
    const fromEdgeY = fromCy + ny * (from.h / 2 + ARROW_OFFSET);
    const toEdgeX = toCx - nx * (to.w / 2 + ARROW_OFFSET);
    const toEdgeY = toCy - ny * (to.h / 2 + ARROW_OFFSET);

    skeleton.push({
      type: "arrow",
      // geometry
      x: fromEdgeX,
      y: fromEdgeY,
      width: toEdgeX - fromEdgeX,
      height: toEdgeY - fromEdgeY,
      // bindings (so it attaches to shapes)
      start: { id: edge.from },
      end: { id: edge.to },
      endArrowhead: "arrow",
      strokeWidth: 2,
      strokeColor: "#1CC6FF",
      label: edge.label ? { text: edge.label, fontSize: 16 } : undefined,
    });
  }

  const elements = (convertSkeleton as any)(skeleton, { regenerateIds: false });
  return elements as ExcalidrawElement[];
}
