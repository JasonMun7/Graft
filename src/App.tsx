import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import BuiltInAITest from "./components/BuiltInAITest";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-center text-3xl font-bold text-gray-800 py-6">
        Visor
      </h1>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* AI Test Section */}
        <BuiltInAITest />
        {/* Excalidraw Section */}
        <div className="h-[400px] border border-gray-200 rounded-lg shadow-lg bg-white overflow-hidden">
          <Excalidraw
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
