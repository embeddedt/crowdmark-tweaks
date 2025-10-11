import express from 'express';
import fetch from 'node-fetch';

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
// Get the current directory
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' })); // increase if large images

// Helper: fetch image and convert to base64
async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

app.post('/vision', async (req, res) => {
  let prompt = readFileSync(path.join(__dirname, "transcribe.txt")).toString('utf-8');
  let mathQuestion = readFileSync(path.join(__dirname, "question.txt")).toString('utf-8');
  prompt = prompt.replace("{{question}}", mathQuestion);

  const { imageUrl, model = 'qwen2.5vl:3b' } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  try {
    console.log("getting image");
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    console.log("submitting to ollama");

    const payload = {
      model,
      stream: true,
      prompt,
      images: [ imageBase64 ]
    };

    // Forward request to local Ollama with streaming
    const ollamaResp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    if (!ollamaResp.ok) {
        const text = await ollamaResp.text();
        console.error("error from ollama", text);
        return res.status(ollamaResp.status).send(text);
    }

    console.log("starting to stream");

    // Set headers for streaming JSON
    res.setHeader('Content-Type', 'application/json');

    // Pipe Ollama response directly to the client
    ollamaResp.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});