// Message types for extension communication

export type MessageType =
  | "TEXT_SELECTED"
  | "GENERATE_DIAGRAM"
  | "DIAGRAM_GENERATED"
  | "DIAGRAM_ERROR"
  | "DIAGRAM_GENERATION_STARTED";

export interface BaseMessage {
  type: MessageType;
}

export interface TextSelectedMessage extends BaseMessage {
  type: "TEXT_SELECTED";
  data: {
    selectedText: string;
    pageTitle: string;
    pageUrl: string;
    selectionRange?: {
      startOffset: number;
      endOffset: number;
    };
  };
}

export interface GenerateDiagramMessage extends BaseMessage {
  type: "GENERATE_DIAGRAM";
  data: {
    text: string;
    pageTitle?: string;
    pageUrl?: string;
  };
}

export interface DiagramGeneratedMessage extends BaseMessage {
  type: "DIAGRAM_GENERATED";
  data: {
    elements: ExcalidrawElement[];
    sourceText: string;
  };
}

export interface DiagramErrorMessage extends BaseMessage {
  type: "DIAGRAM_ERROR";
  data: {
    error: string;
    sourceText?: string;
  };
}

export interface DiagramGenerationStartedMessage extends BaseMessage {
  type: "DIAGRAM_GENERATION_STARTED";
  data: {
    text: string;
  };
}

export interface OpenSidePanelMessage extends BaseMessage {
  type: "OPEN_SIDE_PANEL";
}

export interface GetSelectedTextMessage extends BaseMessage {
  type: "GET_SELECTED_TEXT";
}

export interface GetPageTextMessage extends BaseMessage {
  type: "GET_PAGE_TEXT";
}

export type ExtensionMessage =
  | TextSelectedMessage
  | GenerateDiagramMessage
  | DiagramGeneratedMessage
  | DiagramErrorMessage
  | DiagramGenerationStartedMessage
  | OpenSidePanelMessage
  | GetSelectedTextMessage
  | GetPageTextMessage;

// Re-export Excalidraw element type for convenience
export type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
