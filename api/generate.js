export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const KEY = process.env.GROQ_API_KEY;
  if (!KEY) return res.status(500).json({ error: "GROQ_API_KEY is not configured in Vercel environment variables." });

  const { type, notes, question, answer, student } = req.body || {};

  let userMessage;

  if (type === "flashcards") {
    userMessage = `Create 10 flashcards from the study notes below.
Respond with ONLY a JSON object. No thinking, no explanation, no markdown.

Required format:
{"flashcards":[{"front":"What is an element?","back":"A pure substance made of one type of atom only."},{"front":"What is a compound?","back":"Two or more elements chemically bonded together."}]}

Study notes:
${(notes || "").slice(0, 2000)}`;

  } else if (type === "questions") {
    userMessage = `Create 6 exam questions (3 multiple choice, 3 short answer) from the study notes below.
Respond with ONLY a JSON object. No thinking, no explanation, no markdown.

Required format:
{"questions":[{"type":"mcq","question":"What is X?","options":["A. one","B. two","C. three","D. four"],"correct":1,"explanation":"Because two is correct."},{"type":"short","question":"Define Y.","keywords":["atom","bond"],"modelAnswer":"Y is a bond between atoms."}]}

Study notes:
${(notes || "").slice(0, 2000)}`;

  } else if (type === "blurt") {
    userMessage = `Score the student answer below.
Respond with ONLY a JSON object. No thinking, no explanation, no markdown.

Required format:
{"score":"good","feedback":"You correctly identified X. You missed Y. Tip: remember Z."}

score must be exactly one of: "good" "ok" "bad"

Question: ${question || ""}
Model answer: ${answer || ""}
Student wrote: ${student || ""}`;

  } else {
    return res.status(400).json({ error: "Invalid type. Must be flashcards, questions, or blurt." });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a JSON API. You output ONLY valid JSON objects. No prose, no markdown, no code fences, no thinking out loud."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await groqRes.json();

    // Guard: Groq returned an error object instead of choices
    if (!groqRes.ok) {
      const detail = data?.error?.message || JSON.stringify(data);
      return res.status(groqRes.status).json({ error: `Groq API error: ${detail}` });
    }

    // Guard: unexpected response shape
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: `Groq returned no choices. Full response: ${JSON.stringify(data)}` });
    }

    let content = data.choices[0].message?.content ?? "";

    // Strip any <think>...</think> blocks
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Guard: empty content
    if (!content) {
      return res.status(500).json({ error: "Groq returned empty content. Check your API key and model availability." });
    }

    // Guard: validate it's actually JSON before sending to frontend
    try {
      JSON.parse(content);
    } catch {
      // Try to extract JSON from the string as a last resort
      const s = content.indexOf("{"), e = content.lastIndexOf("}");
      if (s === -1 || e === -1 || e <= s) {
        return res.status(500).json({ error: `Model did not return valid JSON. Got: ${content.slice(0, 200)}` });
      }
      content = content.slice(s, e + 1);
    }

    return res.status(200).json({ content });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
