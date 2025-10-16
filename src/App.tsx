import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-center text-3xl font-bold text-gray-800 py-6">
        Excalidraw Testing
      </h1>
      <div className="max-w-4xl mx-auto">
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
