import { IconSparkles } from "@tabler/icons-react";
import { useState } from "react";

interface DiagramEditorProps {
  isEditing: boolean;
  onEditDiagram: (prompt: string) => void;
}

export default function DiagramEditor({
  isEditing,
  onEditDiagram,
}: DiagramEditorProps) {
  const [editPrompt, setEditPrompt] = useState("");

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPrompt.trim()) {
      onEditDiagram(editPrompt);
      setEditPrompt("");
    }
  };

  return (
    <div className="relative p-4 rounded-lg border border-brand-2/50 bg-white/80 backdrop-blur-sm overflow-hidden">
      {isEditing && (
        <>
          {/* Shimmer animation while editing */}
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(84,51,255,0.15) 20%, rgba(67,121,255,0.15) 40%, rgba(28,198,255,0.15) 60%, rgba(151,251,209,0.15) 80%, transparent 100%)",
              width: "50%",
            }}
          ></div>
        </>
      )}
      <form onSubmit={handleEditSubmit} className="space-y-3 relative">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg border-2 border-dashed border-brand-2/70 flex items-center justify-center text-brand-2 bg-white/80">
            <IconSparkles size={18} aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Edit Diagram</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Describe changes using natural language — add, remove, or modify nodes and connections"
            disabled={isEditing}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
          />
          <button
            type="submit"
            disabled={isEditing || !editPrompt.trim()}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-brand-1 to-brand-2 text-white text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isEditing ? "Editing..." : "Edit"}
          </button>
        </div>
      </form>
    </div>
  );
}