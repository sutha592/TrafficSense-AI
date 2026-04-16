/**
 * Standard 80 classes of the COCO dataset used by YOLOv8.
 */
export const yoloClasses = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse",
  "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie",
  "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon",
  "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut",
  "cake", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book",
  "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  prob: number;
  classId: number;
  className: string;
}

/**
 * Preprocess image for YOLOv8 (640x640, normalized).
 */
export function preprocessImage(img: HTMLCanvasElement | HTMLVideoElement): { tensorData: Float32Array; scale: number; xPad: number; yPad: number } {
  let w = 0, h = 0;
  if (img instanceof HTMLVideoElement) {
    w = img.videoWidth;
    h = img.videoHeight;
  } else {
    w = img.width;
    h = img.height;
  }

  // Calculate scaling factor to fit 640x640 while maintaining aspect ratio
  const scale = Math.min(640 / w, 640 / h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);
  
  // Padding to reach 640
  const xPad = (640 - newW) / 2;
  const yPad = (640 - newH) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context");

  // Fill with standard YOLO padding color (grey)
  ctx.fillStyle = "#747474";
  ctx.fillRect(0, 0, 640, 640);
  
  // Draw scaled image centered
  ctx.drawImage(img, xPad, yPad, newW, newH);

  const imgData = ctx.getImageData(0, 0, 640, 640);
  const data = imgData.data;

  // YOLOv8 expects NCHW float32 tensor [1, 3, 640, 640] normalized to 0-1
  const tensorData = new Float32Array(3 * 640 * 640);
  
  for (let i = 0; i < 640 * 640; i++) {
    // RGB channels
    tensorData[i] = data[i * 4] / 255.0;                   // R
    tensorData[640 * 640 + i] = data[i * 4 + 1] / 255.0;   // G
    tensorData[2 * 640 * 640 + i] = data[i * 4 + 2] / 255.0; // B
  }

  return { tensorData, scale, xPad, yPad };
}

/**
 * Filter outputs, apply NMS, and return bounding boxes.
 */
export function processYoloOutput(output: Float32Array, scale: number, xPad: number, yPad: number, confThreshold = 0.25, iouThreshold = 0.45): BoundingBox[] {
  // Output shape is [1, 84, 8400]
  // 84 = 4 bounding box coordinates (cx, cy, w, h) + 80 class confidences
  const numCoords = 4;
  const numClasses = 80;
  const numPredictions = 8400;

  const boxes: BoundingBox[] = [];

  for (let i = 0; i < numPredictions; i++) {
    // Find class with max probability
    let maxProb = 0;
    let classId = -1;
    for (let c = 0; c < numClasses; c++) {
      const prob = output[(numCoords + c) * numPredictions + i];
      if (prob > maxProb) {
        maxProb = prob;
        classId = c;
      }
    }

    if (maxProb < confThreshold) continue;

    // Get box (center_x, center_y, width, height) relative to 640x640
    let cx = output[0 * numPredictions + i];
    let cy = output[1 * numPredictions + i];
    let w = output[2 * numPredictions + i];
    let h = output[3 * numPredictions + i];

    // Remove padding and scale back to original image coordinates
    cx = (cx - xPad) / scale;
    cy = (cy - yPad) / scale;
    w = w / scale;
    h = h / scale;

    const x = cx - w / 2;
    const y = cy - h / 2;

    boxes.push({ x, y, w, h, prob: maxProb, classId, className: yoloClasses[classId] });
  }

  return runNMS(boxes, iouThreshold);
}

function runNMS(boxes: BoundingBox[], iouThreshold: number): BoundingBox[] {
  // Sort boxes by confidence
  const sorted = boxes.slice().sort((a, b) => b.prob - a.prob);
  const result: BoundingBox[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const box1 = sorted[i];
    let keep = true;
    for (let j = 0; j < result.length; j++) {
      const box2 = result[j];
      // Perform NMS per class to allow boxes of different classes to overlap
      if (box1.classId === box2.classId && computeIOU(box1, box2) > iouThreshold) {
        keep = false;
        break;
      }
    }
    if (keep) result.push(box1);
  }
  return result;
}

function computeIOU(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.w, box2.x + box2.w);
  const y2 = Math.min(box1.y + box1.h, box2.y + box2.h);

  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  const inter = w * h;

  const area1 = box1.w * box1.h;
  const area2 = box2.w * box2.h;

  return inter / (area1 + area2 - inter);
}
