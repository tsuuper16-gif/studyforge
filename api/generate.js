export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const { type, notes } = req.body;

  const prompts = {
    flashcards: `You are a study assistant. Using the notes below, create 10 flashcards.
You MUST respond with ONLY this JSON and nothing else:
{"flashcards":[{"front":"question","back":"answer"},{"front":"question","back":"answer"}]}

Notes:
${notes}`,

    questions: `You are an exam question generator. Using the notes below, create 3 multiple choice and 3 short answer questions.
You MUST respond with ONLY this JSON and nothing else:
{"questions":[{"type":"mcq","question":"q","options":["A. a","B. b","C. c","D. d"],"correct":0,"explanation":"e"},{"type":"short","question":"q","keywords":["k1","k2"],"modelAnswer":"a"}]}

Notes:
${notes}`,

    blurt: `You are a study tutor. Score this student response.
You MUST respond with ONLY this JSON and nothing else:
{"score":"good","feedback":"your feedback here"}
score must be exactly "good", "ok", or "bad".

Question: ${req.body.question}
Model answer: ${req.body.answer}
Student wrote: ${req.body.student}`
  };

  const prompt = prompts[type];
  if (!prompt) return res.status(400).json({ error: 'Invalid type' });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(groqRes.status).json({ error: err });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ content });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}