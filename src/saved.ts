import { convertToExcalidrawElements } from "@excalidraw/excalidraw";


// export const graph1 = convertToExcalidrawElements([
//       {
//     "type": "rectangle",
//     "id": "1",
//     "x": 100,
//     "y": 100,
//     "width": 250,
//     "height": 80,
//     "strokeColor": "black",
//     "backgroundColor": "#ADD8E6",
//     "strokeWidth": 2,
//     "label": {
//       "text": "Photosynthesis Overview",
//       "fontSize": 16,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {},
//     "end": {}
//   },
//   {
//     "type": "rectangle",
//     "id": "2",
//     "x": 100,
//     "y": 280,
//     "width": 250,
//     "height": 80,
//     "strokeColor": "black",
//     "backgroundColor": "#ADD8E6",
//     "strokeWidth": 2,
//     "label": {
//       "text": "Light Energy Conversion",
//       "fontSize": 16,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "1"
//     },
//     "end": {}
//   },
//   {
//     "type": "rectangle",
//     "id": "3",
//     "x": 100,
//     "y": 460,
//     "width": 250,
//     "height": 80,
//     "strokeColor": "black",
//     "backgroundColor": "#ADD8E6",
//     "strokeWidth": 2,
//     "label": {
//       "text": "Chemical Energy Storage",
//       "fontSize": 16,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "2"
//     },
//     "end": {}
//   },
//   {
//     "type": "rectangle",
//     "id": "4",
//     "x": 100,
//     "y": 640,
//     "width": 250,
//     "height": 80,
//     "strokeColor": "black",
//     "backgroundColor": "#ADD8E6",
//     "strokeWidth": 2,
//     "label": {
//       "text": "Cellular Respiration",
//       "fontSize": 16,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "3"
//     },
//     "end": {}
//   },
//   {
//     "type": "rectangle",
//     "id": "5",
//     "x": 100,
//     "y": 820,
//     "width": 250,
//     "height": 80,
//     "strokeColor": "black",
//     "backgroundColor": "#ADD8E6",
//     "strokeWidth": 2,
//     "label": {
//       "text": "Oxygen Production & Atmosphere",
//       "fontSize": 16,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "4"
//     },
//     "end": {}
//   },
//   {
//     "type": "arrow",
//     "id": "a1",
//     "x": 100,
//     "y": 240,
//     "label": {
//       "text": "Converts",
//       "fontSize": 12,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "1"
//     },
//     "end": {
//       "id": "2"
//     }
//   },
//   {
//     "type": "arrow",
//     "id": "a2",
//     "x": 100,
//     "y": 420,
//     "label": {
//       "text": "Stores Energy",
//       "fontSize": 12,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "2"
//     },
//     "end": {
//       "id": "3"
//     }
//   },
//   {
//     "type": "arrow",
//     "id": "a3",
//     "x": 100,
//     "y": 600,
//     "label": {
//       "text": "Utilizes Energy",
//       "fontSize": 12,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "3"
//     },
//     "end": {
//       "id": "4"
//     }
//   },
//   {
//     "type": "arrow",
//     "id": "a4",
//     "x": 100,
//     "y": 780,
//     "label": {
//       "text": "Produces Oxygen",
//       "fontSize": 12,
//       "textAlign": "center",
//       "verticalAlign": "middle"
//     },
//     "start": {
//       "id": "4"
//     },
//     "end": {
//       "id": "5"
//     }
//   }
// ]
// )


export const graph2 = convertToExcalidrawElements([
      {
    "type": "rectangle",
    "id": "1",
    "x": 100,
    "y": 100,
    "width": 250,
    "height": 80,
    "strokeColor": "black",
    "backgroundColor": "#ADD8E6",
    "strokeWidth": 2,
    "label": {
      "text": "Photosynthesis Overview",
      "fontSize": 16,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
  },
  {
    "type": "rectangle",
    "id": "2",
    "x": 100,
    "y": 280,
    "width": 250,
    "height": 80,
    "strokeColor": "black",
    "backgroundColor": "#ADD8E6",
    "strokeWidth": 2,
    "label": {
      "text": "Light Energy Conversion",
      "fontSize": 16,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
  },
  {
    "type": "arrow",
    "id": "a1",
    "x": 100,
    "y": 240,
    "label": {
      "text": "Converts",
      "fontSize": 12,
      "textAlign": "center",
      "verticalAlign": "middle"
    },
    "start": {
      "id": "1"
    },
    "end": {
      "id": "2"
    }
  },
]
)

// quick helpers for this schema
const center = (el: any) => ({
  cx: el.x + (el.width ?? 0) / 2,
  cy: el.y + (el.height ?? 0) / 2,
});

const rect1 = {
  type: "rectangle",
  id: "1",
  x: 100,
  y: 100,
  width: 250,
  height: 80,
  strokeColor: "black",
  backgroundColor: "#ADD8E6",
  strokeWidth: 2,
  label: { text: "Photosynthesis Overview", fontSize: 16, textAlign: "center", verticalAlign: "middle" },
};

const rect2 = {
  type: "rectangle",
  id: "2",
  x: 100,
  y: 280,
  width: 250,
  height: 80,
  strokeColor: "black",
  backgroundColor: "#ADD8E6",
  strokeWidth: 2,
  label: { text: "Light Energy Conversion", fontSize: 16, textAlign: "center", verticalAlign: "middle" },
};

const c1 = center(rect1);
const c2 = center(rect2);

export const graph3 = convertToExcalidrawElements([
  {
  type: "rectangle",
  id: "1",
  x: 100,
  y: 100,
  width: 250,
  height: 80,
  strokeColor: "black",
  backgroundColor: "#ADD8E6",
  strokeWidth: 2,
  label: { text: "Photosynthesis Overview", fontSize: 16, textAlign: "center", verticalAlign: "middle" },
  },
  {
  type: "rectangle",
  id: "2",
  x: 100,
  y: 280,
  width: 250,
  height: 80,
  strokeColor: "black",
  backgroundColor: "#ADD8E6",
  strokeWidth: 2,
  label: { text: "Light Energy Conversion", fontSize: 16, textAlign: "center", verticalAlign: "middle" },
  },
  {
    type: "arrow",
    id: "a1",
    // start at rect1 center
    x: c1.cx,
    y: c1.cy,
    // vector to rect2 center
    width: c2.cx - c1.cx + 10,
    height: c2.cy - c1.cy,
    label: { text: "Converts", fontSize: 12, textAlign: "center", verticalAlign: "middle" },
    start: { id: "1" },
    end: { id: "2" },
  },
]);
