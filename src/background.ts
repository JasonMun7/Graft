import type { ExtensionMessage, TextSelectedMessage } from "./types/messages";

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Store selected text by tab ID
const selectedTextByTab = new Map<number, TextSelectedMessage["data"]>();

// Handle messages from content scripts and side panel
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Handle text selection from content script
    if (message.type === "TEXT_SELECTED") {
      const tabId = sender.tab?.id;
      if (tabId && message.type === "TEXT_SELECTED") {
        selectedTextByTab.set(tabId, message.data);

        // Try to send to side panel if open
        chrome.runtime.sendMessage(message).catch(() => {
          // Side panel might not be open, that's okay
        });
      }
      sendResponse({ success: true });
      return true;
    }

    // Handle open side panel request
    if ("type" in message && message.type === "OPEN_SIDE_PANEL") {
      const tabId = sender.tab?.id;
      const windowId = sender.tab?.windowId;

      console.log(
        "Background: Opening side panel, tabId:",
        tabId,
        "windowId:",
        windowId
      );

      if (windowId !== undefined) {
        chrome.sidePanel
          .open({ windowId })
          .then(() => {
            console.log("Background: Side panel opened successfully");
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error("Background: Error opening side panel:", error);
            sendResponse({ success: false, error: String(error) });
          });
      } else {
        // Fallback: get window ID from tab
        if (tabId) {
          chrome.tabs
            .get(tabId)
            .then((tab) => {
              if (tab.windowId) {
                return chrome.sidePanel.open({ windowId: tab.windowId });
              }
            })
            .then(() => {
              console.log("Background: Side panel opened via fallback");
              sendResponse({ success: true });
            })
            .catch((error) => {
              console.error("Background: Fallback error:", error);
              sendResponse({ success: false, error: String(error) });
            });
        } else {
          console.error("Background: No tab ID or window ID available");
          sendResponse({ success: false, error: "No tab or window ID" });
        }
      }
      return true;
    }

    // Handle get selected text request from side panel
    if ("type" in message && message.type === "GET_SELECTED_TEXT") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          const selectedText = selectedTextByTab.get(tabs[0].id);
          sendResponse(selectedText || null);
        } else {
          sendResponse(null);
        }
      });
      return true;
    }

    // Forward other messages
    return false;
  }
);

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  selectedTextByTab.delete(tabId);
});
