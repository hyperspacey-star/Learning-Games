import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, word, attempt } = req.body;

  try {
    // ---------------------------------------------------------
    // ACTION 1: DICTATE THE WORD
    // ---------------------------------------------------------
    if (action === 'dictate') {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova", // Changed to a warmer, more natural voice
        input: word,
        speed: 0.75 // SLOWED DOWN for spelling dictation!
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      return res.status(200).json({ audio: buffer.toString('base64') });
    }

    // ---------------------------------------------------------
    // ACTION 2: MISS AI TUTOR HINT
    // ---------------------------------------------------------
    if (action === 'hint') {
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

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova", // Matches the dictate voice
        input: hintText,
        speed: 0.9 // Slightly slowed down for clarity
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
