import { AIAPI } from "./aiAPI";

export interface DiagramStructure {
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

/**
 * Edit an existing diagram based on a natural language prompt
 */
export async function editDiagramFromPrompt(
  currentDiagram: DiagramStructure,
  editPrompt: string,
  sourceText?: string
): Promise<DiagramStructure> {
  const prompt = `You are an expert at editing visual diagrams. You have an existing diagram and need to modify it based on the user's request.

Current diagram structure:
${JSON.stringify(currentDiagram, null, 2)}

${sourceText ? `Original source text for context:\n"""${sourceText}"""\n` : ""}

User's edit request:
"""
${editPrompt}
"""

Your task:
1. Understand the user's edit request
2. Modify the diagram accordingly (add nodes, remove nodes, change connections, update labels, etc.)
3. Maintain consistency with existing node IDs and positions where possible
4. If adding new nodes, position them logically near related existing nodes
5. Preserve the overall diagram structure unless explicitly asked to change it

Return ONLY a valid JSON object in this exact format (no markdown, no code blocks, just the JSON):

{
  "nodes": [
    {"id": "node1", "label": "Updated Label", "x": 100, "y": 100}
  ],
  "edges": [
    {"from": "node1", "to": "node2", "label": "relationship"}
  ]
}

CRITICAL Guidelines:
- PRESERVE existing node IDs when keeping nodes (don't rename IDs unnecessarily)
- When removing nodes, also remove all edges connected to them
- When adding nodes, use new unique IDs (e.g., "node_new_1", "node_new_2")
- Position new nodes logically (near related nodes, spacing ~250-300px)
- Keep labels clear and concise (10-25 characters)
- Maintain the diagram's readability and visual clarity`;

  try {
    const response = await AIAPI.prompt(prompt, {
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    // Parse response (same logic as generateDiagramFromText)
    let jsonString = response.trim();
    jsonString = jsonString.replace(/```json\n?/g, "");
    jsonString = jsonString.replace(/```\n?/g, "");
    jsonString = jsonString.trim();

    let parsed: DiagramStructure;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
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

    return parsed;
  } catch (error) {
    console.error("Error editing diagram:", error);
    throw new Error(
      `Failed to edit diagram: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
