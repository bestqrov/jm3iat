const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const scanMeterReading = async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ message: 'OCR service not configured (ANTHROPIC_API_KEY missing)' });
    }

    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ message: 'imageBase64 required' });

    // Strip data URI prefix and detect media type
    const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ message: 'Invalid image format' });

    const mediaType = matches[1]; // e.g. "image/jpeg"
    const base64Data = matches[2];

    // Save image to uploads folder
    const ext = mediaType.split('/')[1] || 'jpg';
    const filename = `meter-${uuid()}.${ext}`;
    const uploadDir = process.env.UPLOAD_DIR || path.resolve('./uploads');
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    const imageUrl = `/uploads/${filename}`;

    // Send to Claude Vision
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `You are a water meter reading assistant. Look at this image of a water meter and extract the numeric reading shown on the counter display.
Return ONLY a JSON object in this exact format (no other text):
{"reading": 1234.56, "confidence": "high"}

Rules:
- "reading" must be a number (use decimal point if visible, otherwise integer)
- "confidence" must be "high", "medium", or "low"
- If you cannot read the meter clearly, return {"reading": null, "confidence": "low"}
- Do NOT include any explanation or extra text, only the JSON object`,
            },
          ],
        },
      ],
    });

    let reading = null;
    let confidence = 'low';

    try {
      const text = response.content[0]?.text?.trim() || '';
      // Extract JSON from response (Claude sometimes wraps it)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        reading = parsed.reading;
        confidence = parsed.confidence || 'medium';
      }
    } catch {
      // JSON parse failed — reading stays null
    }

    res.json({ reading, confidence, imageUrl });
  } catch (err) {
    console.error('[OCR] Error scanning meter:', err.message);
    res.status(500).json({ message: 'OCR scan failed: ' + err.message });
  }
};

module.exports = { scanMeterReading };
