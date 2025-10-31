import { AIAPI } from "./aiAPI";

interface DiagramStructure {
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
}

/**
 * Generate a structured prompt for diagram creation
 */
function createDiagramPrompt(text: string, _pageTitle?: string): string {
  return `You are an expert at creating visual diagrams from text. Analyze the following text and create a helpful diagram that clearly explains the key concepts and their relationships.

Text to analyze:
"""
${text}
"""

Your task:
1. Extract the MAIN ideas, concepts, steps, or entities from this text
2. Identify how these concepts relate to each other (flows, hierarchies, comparisons, processes, etc.)
3. Create a visual diagram structure that makes the text easier to understand

Return ONLY a valid JSON object in this exact format (no markdown, no code blocks, just the JSON):

{
  "nodes": [
    {"id": "node1", "label": "Key Concept", "x": 100, "y": 100},
    {"id": "node2", "label": "Related Concept", "x": 300, "y": 100}
  ],
  "edges": [
    {"from": "node1", "to": "node2", "label": "relationship type"}
  ]
}

CRITICAL Guidelines:
- Focus on clarity and usefulness: the diagram should HELP someone understand the text better
- Extract 3-8 key concepts (not too many, not too few)
- Use meaningful, descriptive labels (10-25 characters is ideal)
- If the text describes RELATIONSHIPS: show connections with descriptive edge labels
- Use simple, clear edge labels that explain the relationship (e.g., "causes", "leads to", "includes", "differs from")
- If the text lists items: group related items and show their relationships
`;
}

/**
 * Generate diagram data from text using Prompt API
 */
export async function generateDiagramFromText(
  text: string,
  pageTitle?: string,
  _pageUrl?: string
): Promise<DiagramStructure> {
  const prompt = createDiagramPrompt(text, pageTitle);

  try {
    const response = await AIAPI.prompt(prompt, {
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    // Try to extract JSON from the response
    let jsonString = response.trim();

    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\n?/g, "");
    jsonString = jsonString.replace(/```\n?/g, "");
    jsonString = jsonString.trim();

    // Try to parse JSON
    let parsed: DiagramStructure;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      // If parsing fails, try to extract JSON object from the text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract valid JSON from AI response");
      }
    }

    // Validate structure
    if (
      !parsed.nodes ||
      !Array.isArray(parsed.nodes) ||
      !parsed.edges ||
      !Array.isArray(parsed.edges)
    ) {
      throw new Error("Invalid diagram structure returned by AI");
    }

    // Ensure all nodes have required fields
    parsed.nodes = parsed.nodes.map((node, index) => ({
      id: node.id || `node${index}`,
      label: node.label || `Node ${index + 1}`,
      x: typeof node.x === "number" ? node.x : (index % 3) * 300 + 100,
      y:
        typeof node.y === "number" ? node.y : Math.floor(index / 3) * 200 + 100,
    }));

    // Ensure all edges have required fields
    parsed.edges = parsed.edges.map((edge) => ({
      from: edge.from || parsed.nodes[0]?.id || "node1",
      to: edge.to || parsed.nodes[1]?.id || "node2",
      label: edge.label,
    }));

    return parsed;
  } catch (error) {
    console.error("Error generating diagram:", error);
    throw new Error(
      `Failed to generate diagram: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
