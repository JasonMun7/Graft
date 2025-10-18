import { useState, useEffect } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

// Simplified schema based on convertToExcalidrawElements examples
const diagramSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["rectangle", "diamond", "ellipse", "arrow"]
      },
      id: { type: "string" },
      x: { type: "number" },
      y: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      strokeColor: { type: "string" },
      backgroundColor: { type: "string" },
      strokeWidth: { type: "number" },
      label: {
        type: "object",
        properties: {
          text: { type: "string" },
          fontSize: { type: "number" },
          textAlign: { type: "string" },
          verticalAlign: { type: "string" }
        },
        required: ["text"]
      },
      // Arrow-specific
      start: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" }
        }
      },
      end: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" }
        }
      }
    },
    required: ["type", "x", "y", "label"] // label is required!
  }
};

function App() {
  const [inputText, setInputText] = useState("");
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugOutput, setDebugOutput] = useState("");
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  useEffect(() => {
    // Check if API is available
    if (!window.LanguageModel) {
      setError("Prompt API is not available. Please use Chrome 137+ and enable chrome://flags/#prompt-api-for-gemini-nano");
    }
  }, []);

  const handleGenerateDiagram = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to visualize");
      return;
    }

    setIsLoading(true);
    setError("");
    setDebugOutput("");
    const startTime = performance.now();

    try {
      if (!window.LanguageModel) {
        throw new Error(
          "Prompt API is not available. Please ensure you're using Chrome 137+ with the Prompt API enabled at chrome://flags/#prompt-api-for-gemini-nano"
        );
      }

      console.log("Creating session...");
      const promptStart = performance.now();
      
      // Balanced settings - fast but allows complexity
      const session = await window.LanguageModel.create({
        temperature: 0.3, // Low but not too restrictive
        topK: 3, // Small but allows some variation
        systemPrompt: `You are a flowchart creator. Create clear, well-structured diagrams that capture the key flow and relationships.

OUTPUT FORMAT:
[
  {
    "type": "rectangle" | "diamond" | "ellipse",
    "id": "unique-id",
    "x": number,
    "y": number,
    "width": 200,
    "height": 80,
    "strokeColor": "#hex",
    "backgroundColor": "#hex",
    "label": { "text": "Node label" }
  },
  {
    "type": "arrow",
    "id": "unique-id",
    "x": start_x,
    "y": start_y,
    "width": horizontal_distance,
    "height": vertical_distance,
    "strokeColor": "#495057",
    "start": { "id": "source-node-id" },
    "end": { "id": "target-node-id" },
    "label": { "text": "relationship" }
  }
]`,
      });

      
const prompt = `Analyze this text and create a comprehensive flowchart: "${inputText}"


### LAYOUT & ARROW RULES
- Use a clear vertical or grid layout (top-to-bottom flow preferred).
- Start the first node near (100,100).
- Node spacing: at least 350px horizontally and 250px vertically.
- Standard node size: width=250, height=80.
- Nodes must not overlap; keep visible white space between them.
- Arrows connect node **centers** to target **centers** with at least 100px padding around nodes.
- Arrows should generally point downward or rightward (no crossings if possible).
- Curved arrows are allowed only for feedback loops or cycles.
- If two arrows overlap, offset one by ~30px for clarity.

### OVERLAP & SPACING CORRECTION
- After placing all nodes, check for overlaps:
  - If two nodes are within 150px in x or y, shift one downward or rightward until spacing ≥150px.
- If the entire diagram appears compressed, multiply all x,y positions by 1.5 to expand spacing.

### STRUCTURAL RULES
- 5-12 total elements (aim for 6-10).
- Include nodes for all major concepts or steps.
- Add arrows showing key relationships or flow.
- Each node and arrow must have a unique "id" and a "label.text".
- Arrows must reference node ids correctly in "start" and "end".
- Use concise, descriptive labels (3-8 words).
- Node color scheme:
  - Blue tones = process or general step
  - Green = success or positive outcome
  - Red = error, failure, or warning
  - Yellow = decision or conditional
- Node types:
  - Rectangle → processes, actions, or main concepts
  - Diamond → decisions, conditionals, or branches
  - Ellipse → start/end points or inputs/outputs
- Arrange in logical order (top-to-bottom or left-to-right).
- Include all major ideas from the input text and show clear relationships with labeled arrows.

Focus on completeness while maintaining clarity.`;

      console.log("Sending prompt...");
      
      const result = await session.prompt(prompt, {
        responseConstraint: diagramSchema
      });
      
      const promptEnd = performance.now();
      console.log(`⏱️ AI generation: ${((promptEnd - promptStart) / 1000).toFixed(2)}s`);
      console.log("Raw response:", result);
      
      const diagramData = JSON.parse(result);
      console.log("Parsed data:", diagramData);
      console.log(`Generated ${diagramData.length} elements`);
      
      setDebugOutput(JSON.stringify(diagramData, null, 2));
      
      // Sanitize: ensure all elements have labels and ids
      const sanitized = diagramData.map((el: any, idx: number) => {
        if (!el.label || !el.label.text) {
          el.label = { text: `Element ${idx + 1}` };
        }
        if (!el.id) {
          el.id = `element-${idx}`;
        }
        return el;
      });
      
      console.log("Converting to Excalidraw...");
      const convertStart = performance.now();
      const newElements = convertToExcalidrawElements(sanitized);
      const convertEnd = performance.now();
      console.log(`⏱️ Conversion: ${((convertEnd - convertStart) / 1000).toFixed(3)}s`);
      console.log("Elements:", newElements);
      
      if (excalidrawAPI) {
        excalidrawAPI.updateScene({ elements: newElements });
        setTimeout(() => {
          excalidrawAPI.scrollToContent(newElements, { fitToContent: true });
        }, 100);
      }
      
      const endTime = performance.now();
      const totalTime = (endTime - startTime) / 1000;
      setGenerationTime(totalTime);
      console.log(`⏱️ TOTAL: ${totalTime.toFixed(2)}s`);
      
      session.destroy();
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate diagram");
      setDebugOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-center text-3xl font-bold text-gray-800 py-6">
        AI Diagram Generator
      </h1>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to visualize as a diagram:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            rows={4}
            placeholder="E.g., Describe a process, workflow, or concept..."
          />
          <button
            onClick={handleGenerateDiagram}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Generating..." : "Generate Diagram"}
          </button>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          {generationTime && (
            <p className="mt-2 text-sm text-blue-600">
              ⏱️ Generated in {generationTime.toFixed(2)}s
            </p>
          )}
        </div>

        {debugOutput && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg shadow-lg font-mono text-sm overflow-auto max-h-64">
            <h4 className="text-white font-bold mb-2">AI Generated JSON ({JSON.parse(debugOutput).length} elements):</h4>
            <pre>{debugOutput}</pre>
          </div>
        )}

        <div className="h-[500px] border border-gray-200 rounded-lg shadow-lg bg-white overflow-hidden">
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            theme="light"
            // initialData={}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
                export: false,
                toggleTheme: true,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;