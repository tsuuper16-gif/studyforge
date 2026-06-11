export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const { type, notes, question, answer, student } = req.body;

  let systemPrompt, userPrompt;

  if (type === 'flashcards') {
    systemPrompt = `You are a JSON API. You output ONLY raw JSON. No prose, no markdown, no explanation.`;
    userPrompt = `Return a JSON object with a "flashcards" array. Each item has "front" (a question) and "back" (the answer). Make exactly 10 items based on these notes.

Example of required output format:
{"flashcards":[{"front":"What is an element?","back":"A substance made of one type of atom that cannot be broken down further."},{"front":"What is a compound?","back":"A substance made of two or more different atoms chemically joined together."}]}

Study notes to use:
${(notes || '').slice(0, 2500)}

Now output the JSON object:`;

  } else if (type === 'questions') {
    systemPrompt = `You are a JSON API. You output ONLY raw JSON. No prose, no markdown, no explanation.`;
    userPrompt = `Return a JSON object with a "questions" array containing exactly 6 items: 3 multiple choice and 3 short answer, based on these notes.

Example of required output format:
{"questions":[{"type":"mcq","question":"What is the law of conservation of mass?","options":["A. Matter can be created","B. Matter cannot be created or destroyed","C. Mass increases in reactions","D. Atoms are destroyed"],"correct":1,"explanation":"Matter cannot be created or destroyed in a chemical reaction."},{"type":"short","question":"Define an isotope.","keywords":["protons","neutrons","same element"],"modelAnswer":"An isotope is an atom of the same element with the same number of protons but a different number of neutrons."}]}

Study notes to use:
${(notes || '').slice(0, 2500)}

Now output the JSON object:`;

  } else if (type === 'blurt') {
    systemPrompt = `You are a JSON API. You output ONLY raw JSON. No prose, no markdown, no explanation.`;
    userPrompt = `Return a JSON object scoring a student answer.

Example of required output format:
{"score":"good","feedback":"You correctly identified X and Y. You missed Z. Tip: remember that..."}

score must be exactly one of: "good", "ok", "bad"

Question: ${question}
Model answer: ${answer}
Student wrote: ${student}

Now output the JSON object:`;

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
        model: 'deepseek-r1-distill-llama-70b',
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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
