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

/**
 * Convert diagram structure to Excalidraw elements using Skeleton API.
 * Uses force-directed layout and proper arrow edge calculations.
 */
export function convertToExcalidrawElements(
  structure: DiagramStructure
): ExcalidrawElement[] {
  const skeleton: any[] = [];
  const nodeDims = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();

  // Base dimensions
  const baseWidth = 460;
  const baseHeight = 110;

  // Apply force-directed layout based on edges
  const layoutNodes = applyForceDirectedLayout(
    structure.nodes,
    structure.edges,
    baseWidth
  );

  // Create rectangles with calculated positions
  layoutNodes.forEach((node) => {
    const x = Math.round(node.x);
    const y = Math.round(node.y);
    
    nodeDims.set(node.id, {
      x: x,
      y: y,
      w: baseWidth,
      h: baseHeight,
    });

    skeleton.push({
      type: "rectangle",
      id: node.id,
      x: x,
      y: y,
      width: baseWidth,
      height: baseHeight,
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

  // Create arrows following the general approach
  for (const edge of structure.edges) {
    const nodeA = nodeDims.get(edge.from);
    const nodeB = nodeDims.get(edge.to);
    if (!nodeA || !nodeB) continue;

    const arrowData = calculateArrowPosition(nodeA, nodeB);

    skeleton.push({
      type: "arrow",
      x: arrowData.x,
      y: arrowData.y,
      strokeWidth: 2,
      strokeColor: "#1CC6FF",
      start: { id: edge.from },
      end: { id: edge.to },
      endArrowhead: "arrow",
      points: arrowData.points,
      label: edge.label ? { text: edge.label, fontSize: 16 } : undefined,
    });
  }

  const elements = convertSkeleton(skeleton, { regenerateIds: false });
  return elements as ExcalidrawElement[];
}

/**
 * Calculate arrow position and points following the general approach
 */
function calculateArrowPosition(
  nodeA: { x: number; y: number; w: number; h: number },
  nodeB: { x: number; y: number; w: number; h: number }
): {
  x: number;
  y: number;
  points: [number, number][];
} {
  // Calculate centers
  const xA = nodeA.x + nodeA.w / 2;
  const yA = nodeA.y + nodeA.h / 2;
  const xB = nodeB.x + nodeB.w / 2;
  const yB = nodeB.y + nodeB.h / 2;

  // Calculate deltas
  const deltaX = xB - xA;
  const deltaY = yB - yA;

  // Half dimensions
  const halfWA = nodeA.w / 2;
  const halfHA = nodeA.h / 2;
  const halfWB = nodeB.w / 2;
  const halfHB = nodeB.h / 2;

  let xStart: number, yStart: number, xEnd: number, yEnd: number;

  // 1. Determine dominant axis and calculate edge positions
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    // VERTICAL CONNECTION (Down/Up dominant)
    xStart = xA;
    xEnd = xB;

    if (deltaY > 0) {
      // Moving DOWN: Start bottom edge, End top edge
      yStart = yA + halfHA;
      yEnd = yB - halfHB;
    } else {
      // Moving UP: Start top edge, End bottom edge
      yStart = yA - halfHA;
      yEnd = yB + halfHB;
    }
  } else {
    // HORIZONTAL CONNECTION (Right/Left dominant)
    yStart = yA;
    yEnd = yB;

    if (deltaX > 0) {
      // Moving RIGHT: Start right edge, End left edge
      xStart = xA + halfWA;
      xEnd = xB - halfWB;
    } else {
      // Moving LEFT: Start left edge, End right edge
      xStart = xA - halfWA;
      xEnd = xB + halfWB;
    }
  }

  // Round all coordinates to integers
  xStart = Math.round(xStart);
  yStart = Math.round(yStart);
  xEnd = Math.round(xEnd);
  yEnd = Math.round(yEnd);

  // 2. Arrow position is the START point
  const x = xStart;
  const y = yStart;

  // 3. Points array: [0, 0] for start, [relative_x, relative_y] for end
  const p1: [number, number] = [0, 0];
  const p2: [number, number] = [xEnd - xStart, yEnd - yStart];

  return {
    x,
    y,
    points: [p1, p2],
  };
}
/**
 * Apply force-directed graph layout algorithm
 * Positions nodes based on edge relationships
 */
function applyForceDirectedLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  nodeWidth: number
): DiagramNode[] {
  // Initialize positions randomly but spread out
  const positions = nodes.map((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const radius = 400;
    return {
      id: n.id,
      label: n.label,
      x: 800 + Math.cos(angle) * radius,
      y: 400 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  // Build adjacency info
  const nodeMap = new Map(positions.map((n, i) => [n.id, i]));
  const connections = new Map<number, number[]>();
  
  edges.forEach((edge) => {
    const fromIdx = nodeMap.get(edge.from);
    const toIdx = nodeMap.get(edge.to);
    if (fromIdx !== undefined && toIdx !== undefined) {
      if (!connections.has(fromIdx)) connections.set(fromIdx, []);
      if (!connections.has(toIdx)) connections.set(toIdx, []);
      connections.get(fromIdx)!.push(toIdx);
      connections.get(toIdx)!.push(fromIdx);
    }
  });

  // Force-directed layout parameters
  const iterations = 300;
  const idealDistance = 600;
  const repulsionStrength = 100000;
  const attractionStrength = 0.01;
  const dampening = 0.85;
  const minDistance = nodeWidth + 100;

  for (let iter = 0; iter < iterations; iter++) {
    // Calculate forces
    positions.forEach((node, i) => {
      let fx = 0;
      let fy = 0;

      // Repulsion from all other nodes
      positions.forEach((other, j) => {
        if (i === j) return;

        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;

        const repulsion = repulsionStrength / distSq;
        fx -= (dx / dist) * repulsion;
        fy -= (dy / dist) * repulsion;
      });

      // Attraction to connected nodes
      const connectedNodes = connections.get(i) || [];
      connectedNodes.forEach((j) => {
        const other = positions[j];
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const dist = Math.hypot(dx, dy) || 1;

        const displacement = dist - idealDistance;
        const attraction = displacement * attractionStrength;
        
        fx += (dx / dist) * attraction;
        fy += (dy / dist) * attraction;
      });

      // Apply forces with dampening
      node.vx = (node.vx + fx) * dampening;
      node.vy = (node.vy + fy) * dampening;
    });

    // Update positions
    positions.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
    });

    // Cool down over time
    const cooling = 1 - iter / iterations;
    positions.forEach((node) => {
      node.vx *= cooling;
      node.vy *= cooling;
    });
  }

  // Final pass: ensure minimum distances
  for (let pass = 0; pass < 50; pass++) {
    let adjusted = false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDistance) {
          adjusted = true;
          const push = (minDistance - dist) / 2 + 10;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          positions[i].x -= nx * push;
          positions[i].y -= ny * push;
          positions[j].x += nx * push;
          positions[j].y += ny * push;
        }
      }
    }
    if (!adjusted) break;
  }

  // Center the diagram
  const minX = Math.min(...positions.map((n) => n.x));
  const minY = Math.min(...positions.map((n) => n.y));
  const offsetX = 100 - minX;
  const offsetY = 100 - minY;

  return positions.map((n) => ({
    id: n.id,
    label: n.label,
    x: n.x + offsetX,
    y: n.y + offsetY,
  }));
}