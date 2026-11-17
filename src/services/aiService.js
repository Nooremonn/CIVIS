const fs = require('fs');

const HAZARDS = ['pothole', 'open_manhole', 'broken_streetlight'];

// Fake detector so you can build/test the whole flow before YOLO is ready
const mockDetect = () => {
  const hazardType = HAZARDS[Math.floor(Math.random() * HAZARDS.length)];
  const confidence = Number((0.6 + Math.random() * 0.39).toFixed(2));
  const severity = confidence > 0.9 ? 'high' : confidence > 0.75 ? 'medium' : 'low';
  return { detected: true, hazardType, confidence, severity };
};

/**
 * Sends the image to the Python AI service.
 * Expected response from POST {AI_SERVICE_URL}/detect:
 *   { "detected": true, "hazardType": "pothole", "confidence": 0.91, "severity": "high" }
 */
exports.detectHazard = async (filePath, mimeType) => {
  if (process.env.AI_MOCK === 'true') return mockDetect();

  const form = new FormData();
  form.append('image', new Blob([fs.readFileSync(filePath)], { type: mimeType }), 'report.jpg');

  const res = await fetch(`${process.env.AI_SERVICE_URL}/detect`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = new Error('AI service error');
    err.status = 502;
    throw err;
  }
  return res.json();
};
