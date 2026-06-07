import OpenAI from 'openai';

// This securely loads your API key from the Environment Variables you added in Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Allow requests from your game
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, word, attempt } = req.body;

  try {
    // ---------------------------------------------------------
    // ACTION 1: DICTATE THE WORD (AI Voice for the spelling word)
    // ---------------------------------------------------------
    if (action === 'dictate') {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer",
        input: word,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      return res.status(200).json({ audio: buffer.toString('base64') });
    }

    // ---------------------------------------------------------
    // ACTION 2: MISS AI TUTOR HINT (Phonics-based clue)
    // ---------------------------------------------------------
    if (action === 'hint') {
      // 1. Ask GPT-4o-mini to analyze the mistake
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are Miss AI, a friendly 3rd-grade spelling tutor. The student just misspelled a word. Give ONE short, simple sentence explaining the phonetic rule mistake they made. Do NOT spell the word for them. Be encouraging and brief." 
          },
          { 
            role: "user", 
            content: `Target word: ${word}. Student typed: ${attempt}.` 
          }
        ],
        max_tokens: 60,
      });

      const hintText = completion.choices[0].message.content;

      // 2. Turn the custom hint text into a spoken human voice
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer",
        input: hintText,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());

      return res.status(200).json({ 
        hint: hintText, 
        audio: buffer.toString('base64') 
      });
    }

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: 'Server Error' });
  }
}
