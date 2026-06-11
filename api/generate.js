export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const { type, notes, question, answer, student } = req.body;

  let messages;

  if (type === 'flashcards') {
    messages = [
      { role: 'system', content: 'You are a flashcard generator. You only output valid JSON. Never summarise. Never repeat yourself. Always follow the exact format given.' },
      { role: 'user', content: 'Here are my study notes:' },
      { role: 'assistant', content: 'OK, I have read the notes. What would you like me to create?' },
      { role: 'user', content: `Generate 10 flashcards from those notes. Reply with ONLY this JSON format, nothing else:\n{"flashcards":[{"front":"What is X?","back":"X is..."},{"front":"Define Y","back":"Y means..."}]}\n\nNotes:\n${(notes || '').slice(0, 3000)}` }
    ];
  } else if (type === 'questions') {
    messages = [
      { role: 'system', content: 'You are an exam question generator. You only output valid JSON. Never summarise. Never repeat yourself. Always follow the exact format given.' },
      { role: 'user', content: 'Here are my study notes:' },
      { role: 'assistant', content: 'OK, I have read the notes. What would you like me to create?' },
      { role: 'user', content: `Generate 3 multiple choice and 3 short answer questions from those notes. Reply with ONLY this JSON format, nothing else:\n{"questions":[{"type":"mcq","question":"What is X?","options":["A. one","B. two","C. three","D. four"],"correct":0,"explanation":"Because..."},{"type":"short","question":"Explain Y","keywords":["key1","key2"],"modelAnswer":"Y is..."}]}\n\nNotes:\n${(notes || '').slice(0, 3000)}` }
    ];
  } else if (type === 'blurt') {
    messages = [
      { role: 'system', content: 'You are a study tutor. You only output valid JSON. Always follow the exact format given.' },
      { role: 'user', content: `Score this student answer. Reply with ONLY this JSON, nothing else:\n{"score":"good","feedback":"They got X right but missed Y. Tip: Z"}\nscore must be exactly "good", "ok", or "bad".\n\nQuestion: ${question}\nModel answer: ${answer}\nStudent wrote: ${student}` }
    ];
  } else {
    return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        temperature: 0.1,
        max_tokens: 2000,
        messages
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