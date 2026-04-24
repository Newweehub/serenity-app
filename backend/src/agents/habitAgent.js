import { openaiClient, MODEL } from './openaiClient.js';
import { prompts } from './prompts.js';

/**
 * Generate a reframing message for a missed habit.
 * Rotates through strategies so the user never sees the same message twice.
 */
export async function generateReframe(habit, context) {
  const usedStrategies = habit.aiMeta?.reframingStrategies ?? [];

  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 80,
    temperature: 0.8,
    messages: [
      { role: 'system', content: prompts.habitCoach(context) },
      {
        role: 'user',
        content: `The user missed their habit: "${habit.name}".
Write ONE short, warm reframing message (1-2 sentences). 
Do NOT use any of these already-used messages: ${usedStrategies.join(' | ') || 'none'}.
Reply with only the message — no preamble.`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "Missing once doesn't break your progress — tomorrow is a fresh start.";
}

/**
 * Suggest a new habit based on the user's stated goal or journal mention.
 * Returns a structured suggestion the controller can confirm with the user.
 */
export async function suggestHabit(userMessage, context) {
  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    temperature: 0.6,
    messages: [
      { role: 'system', content: prompts.habitCoach(context) },
      {
        role: 'user',
        content: `Based on this message, suggest ONE specific habit. Return JSON only:
{
  "name": "...",
  "category": "sleep|movement|mindfulness|nutrition|social|other",
  "goal": "...",
  "suggestedTime": "HH:MM",
  "timeReason": "...",
  "confirmationMessage": "..."
}

User message: "${userMessage}"`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  try {
    const clean = raw.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}