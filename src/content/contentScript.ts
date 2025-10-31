// Content script for detecting text selection and communicating with extension

interface SelectionData {
  selectedText: string;
  pageTitle: string;
  pageUrl: string;
  selectionRange?: {
    startOffset: number;
    endOffset: number;
  };
}

// Create floating button element
function createFloatingButton(rect: DOMRect): HTMLElement {
  const button = document.createElement("div");
  button.id = "graft-floating-button";
  button.innerHTML = `
    <span style="display:flex;align-items:center;justify-content:center;line-height:1">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 3v18h18"/>
        <path d="M7 13l3 -3l4 4l5 -6"/>
      </svg>
    </span>
  `;
  button.style.cssText = `
    position: absolute;
    top: ${rect.bottom + window.scrollY + 10}px;
    left: ${rect.left + window.scrollX}px;
    background: linear-gradient(135deg, #5433FF 0%, #4379FF 35%, #1CC6FF 100%);
    color: white;
    padding: 8px;
    width: 38px;
    height: 38px;
    border-radius: 9999px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s, box-shadow 0.2s;
    user-select: none;
    pointer-events: auto;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  });

  return button;
}

// Remove floating button
function removeFloatingButton(): void {
  const button = document.getElementById("graft-floating-button");
  if (button) {
    button.remove();
  }
}

// Get selected text and context
function getSelectionData(): SelectionData | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();

  if (selectedText.length === 0) {
    return null;
  }

  return {
    selectedText,
    pageTitle: document.title,
    pageUrl: window.location.href,
    selectionRange: {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    },
  };
}

// Handle text selection
function handleTextSelection(): void {
  const selectionData = getSelectionData();

  // Remove existing button
  removeFloatingButton();

  if (!selectionData) {
    return;
  }

  // Require at least 5 characters (reduced for easier testing)
  if (selectionData.selectedText.length < 5) {
    return;
  }

  console.log(
    "Graft: Text selected:",
    selectionData.selectedText.substring(0, 50) + "..."
  );

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Only show button if selection is visible and not empty
  if (rect.width > 0 && rect.height > 0) {
    // Create and show floating button
    const button = createFloatingButton(rect);
    document.body.appendChild(button);

    // Auto-send selection once per unique selection so side panel opens and attempts generation
    // No auto-send; require an explicit click to open panel and proceed

    // Handle button click (one-shot)
    const handleClick = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("Graft: Button clicked, sending messages...");

      // Check if extension context is available
      try {
        if (!chrome.runtime || !chrome.runtime.id) {
          throw new Error("Extension context unavailable");
        }
      } catch (e) {
        console.warn(
          "Graft: Extension context missing. Please reload the extension in chrome://extensions and try again."
        );
        removeFloatingButton();
        alert(
          "Extension context is missing. Please:\n1. Go to chrome://extensions\n2. Reload the Graft extension\n3. Refresh this page and try again"
        );
        return;
      }

      // Disable the button to prevent double-sends
      (button as HTMLDivElement).style.pointerEvents = "none";
      (button as HTMLDivElement).style.opacity = "0.7";

      try {
        // Send message to background script with selected text
        const response1 = await chrome.runtime.sendMessage({
          type: "TEXT_SELECTED",
          data: selectionData,
        } as any);
        console.log("Graft: TEXT_SELECTED response:", response1);

        // Request side panel open
        const response2 = await chrome.runtime.sendMessage({
          type: "OPEN_SIDE_PANEL",
        } as any);
        console.log("Graft: OPEN_SIDE_PANEL response:", response2);

        // Remove button after sending
        removeFloatingButton();
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error(
          "Graft: Error sending selection to extension:",
          errorMessage
        );

        // Check if it's an extension context error
        if (
          errorMessage.includes("Extension context invalidated") ||
          errorMessage.includes("context") ||
          errorMessage.includes("disconnected")
        ) {
          alert(
            "Extension context was lost. Please:\n1. Go to chrome://extensions\n2. Reload the Graft extension\n3. Refresh this page and try again"
          );
        } else {
          // Other errors - show a simpler message
          alert("Failed to open Graft. Please try selecting text again.");
        }

        removeFloatingButton();
      }
    };
    button.addEventListener("click", handleClick, { once: true });
  }
}

// Debounced selection handler
let selectionTimeout: number | null = null;
function debouncedHandleSelection(): void {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }
  selectionTimeout = window.setTimeout(() => {
    handleTextSelection();
  }, 100);
}

// Initialize content script
function initContentScript(): void {
  if (document.body) {
    document.addEventListener("mouseup", debouncedHandleSelection);
    document.addEventListener("selectionchange", debouncedHandleSelection);
    console.log("Graft content script loaded");
  } else {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initContentScript);
    }
  }

  // Clean up button on tab visibility or lifecycle changes to avoid stale handlers
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) removeFloatingButton();
  });
  window.addEventListener("pagehide", () => removeFloatingButton());
}

// Start the content script
initContentScript();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  removeFloatingButton();
});

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ("type" in message && message.type === "GET_SELECTION") {
    const selectionData = getSelectionData();
    sendResponse(selectionData);
    return true;
  }
});
