import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health & connection testing endpoint
app.get('/api/gemini/health', async (req, res) => {
  const test = req.query.test === 'true';
  const hasKey = Boolean(process.env.GEMINI_API_KEY);

  if (!test) {
    return res.json({
      status: hasKey ? 'ready' : 'missing_key',
      hasKey,
      model: 'gemini-3.8-flash',
    });
  }

  if (!hasKey) {
    return res.status(500).json({
      status: 'error',
      message: 'GEMINI_API_KEY is not configured in the environment.',
    });
  }

  try {
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let text = 'OK';
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: 'Reply with exactly the word: OK',
        });
        text = response.text ? response.text.trim() : 'OK';
        break;
      } catch (e) {
        // try next
      }
    }
    return res.json({
      status: 'connected',
      text,
    });
  } catch (err: any) {
    console.error('Gemini health test failed:', err);
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Connection test failed',
    });
  }
});

async function generateWithFallback(options: {
  contents: any;
  config?: any;
  tier?: string;
}) {
  const candidateModels =
    options.tier === 'quick'
      ? ['gemini-3.1-flash-lite', 'gemini-3.8-flash']
      : ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed, trying fallback:`, err?.message || err);
    }
  }
  throw lastError;
}

async function streamWithFallback(options: {
  contents: any;
  config?: any;
  tier?: string;
}) {
  const candidateModels =
    options.tier === 'quick'
      ? ['gemini-3.1-flash-lite', 'gemini-3.8-flash']
      : ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: options.contents,
        config: options.config,
      });
      return stream;
    } catch (err: any) {
      lastError = err;
      console.warn(`Streaming with model ${model} failed, trying fallback:`, err?.message || err);
    }
  }
  throw lastError;
}

// Unary generation endpoint
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, images, tier, systemInstruction, jsonMode } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const parts: any[] = [];
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img?.data) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.data,
            },
          });
        }
      }
    }
    parts.push({ text: prompt });

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (jsonMode) {
      config.responseMimeType = 'application/json';
    }

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;
    let resultText = '';

    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: Object.keys(config).length ? config : undefined,
          });
          resultText = response.text || '';
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} attempt ${attempt + 1} failed:`, err?.message || err);
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }
      if (!lastError) break;
    }

    if (lastError) {
      throw lastError;
    }

    return res.json({
      text: resultText,
    });
  } catch (err: any) {
    console.error('Generation error:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate content',
      code: err?.status || 'upstream_error',
    });
  }
});

// Streaming generation endpoint (SSE)
app.post('/api/gemini/stream', async (req, res) => {
  try {
    const { prompt, images, tier, systemInstruction, jsonMode } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const parts: any[] = [];
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img?.data) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.data,
            },
          });
        }
      }
    }
    parts.push({ text: prompt });

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (jsonMode) {
      config.responseMimeType = 'application/json';
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let streamedAny = false;
    let streamSuccess = false;

    for (const model of candidateModels) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents: { parts },
          config: Object.keys(config).length ? config : undefined,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text || '';
          if (text) {
            streamedAny = true;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        streamSuccess = true;
        break;
      } catch (err: any) {
        console.warn(`Model ${model} streaming error:`, err?.message || err);
        if (streamedAny) {
          throw err;
        }
      }
    }

    if (!streamSuccess) {
      throw new Error('All models failed to stream content');
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Streaming error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: err?.message || 'Failed to stream content',
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`);
      res.end();
    }
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (mode: ${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer();
