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
]

LAYOUT STRATEGY:
- Use grid layout: columns at x=50, 350, 650, 950
- Rows at y=50, 250, 450, 650
- Standard node size: width=250, height=80
- Space nodes 300px horizontally, 200px vertically
- Use rectangles for main concepts
- Use diamonds for decisions/branches
- Use ellipses for start/end points

RULES:
- 5-12 total elements (aim for 6-10)
- Include nodes for major concepts
- Add arrows to show key relationships/flow
- Every element needs unique id and label.text
- Arrows reference node ids in start/end
- Use meaningful, concise labels (3-8 words)
- Colors: blue tones for process, green for success, red for errors, yellow for decisions`,
      });

      const prompt = `Analyze this text and create a comprehensive flowchart: "${inputText}"

Create a diagram with:
- 5-10 nodes (rectangles/diamonds/ellipses) representing key concepts, steps, or decision points
- 3-7 arrows showing relationships and flow between nodes

Requirements:
- Each node: unique id, position (grid layout), width=250, height=80, colors, label with text
- Each arrow: unique id, position, start/end references to node ids, label describing relationship
- Use appropriate node types:
  * rectangles: processes, actions, concepts
  * diamonds: decisions, conditionals, branches
  * ellipses: start/end points, inputs/outputs
- Arrange in logical flow (typically left-to-right or top-to-bottom)
- Include ALL major concepts from the text
- Show clear relationships with labeled arrows

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