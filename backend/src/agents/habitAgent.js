import { openaiClient, MODEL } from './openaiClient.js';

/**
 * Generate a reframing message for a missed habit.
 * Uses a dedicated prompt — NOT habitCoach — to avoid the "no JSON" rule conflict.
 */
export async function generateReframe(habit, context) {
  const usedStrategies = habit.aiMeta?.reframingStrategies ?? [];

  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 80,
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content: `You are a warm, supportive habit coach. 
Write ONE short reframing message (1-2 sentences) for someone who missed their habit.
Be encouraging, not guilt-inducing. Plain text only — no JSON, no lists.
Do NOT repeat any of these already-used messages: ${usedStrategies.join(' | ') || 'none'}.`,
      },
      {
        role: 'user',
        content: `The user missed their habit: "${habit.name}". Write the reframing message.`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim()
    ?? "Missing once doesn't break your progress — tomorrow is a fresh start.";
}

/**
 * Suggest a new habit based on the user's stated goal.
 * Uses a dedicated JSON-extraction prompt separate from the conversational habitCoach prompt.
 */
export async function suggestHabit(userMessage, context) {
  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 250,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: `You are a habit suggestion assistant. Given a user's goal, suggest ONE specific, achievable habit.
Return ONLY a valid JSON object — no markdown fences, no explanation, no extra text.
JSON format:
{
  "name": "Short habit name",
  "category": "sleep|movement|mindfulness|nutrition|social|other",
  "goal": "What this habit achieves",
  "suggestedDayOfWeek": null,
  "suggestedTime": "HH:MM",
  "scheduleReason": "Why this day/time works well (e.g. 'Every day at 8am builds a morning routine')",
  "confirmationMessage": "A warm conversational sentence asking if this feels right"
}

dayOfWeek: 0=Sunday,1=Monday,2=Tuesday,3=Wednesday,4=Thursday,5=Friday,6=Saturday. Use null to mean every day.`,
      },
      {
        role: 'user',
        content: `User's goal: "${userMessage}"`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  try {
    const clean = raw.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.error('[habitAgent] Failed to parse suggestion JSON:', raw);
    return null;
  }
}
