import { openaiClient, MODEL } from './openaiClient.js';
import { prompts } from './prompts.js';

const FALLBACK_ANALYSIS = {
  emotions: ['unknown'],
  themes: ['general'],
  moodScore: 5,
  summary: 'User wrote a journal entry.',
  suggestedExerciseIds: [],
  reflectionOffered: 'Thank you for sharing that. How does it feel to have written it out?',
};

function parseJSON(raw) {
  try {
    const clean = raw.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

/**
 * Analyse a completed journal entry and return structured AI insights.
 */
export async function analyzeEntry(freeText, context) {
  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 400,
    temperature: 0.3,
    messages: [
      { role: 'system', content: prompts.journalingReflection(context) },
      {
        role: 'user',
        content: `The user has finished their journal entry. Return only the JSON analysis block.\n\nEntry:\n${freeText}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  return parseJSON(raw) ?? FALLBACK_ANALYSIS;
}

/**
 * Generate a single contextual journaling prompt for the user.
 */
export async function generatePrompt(context, timeOfDay = 'anytime') {
  const timeHint = {
    morning: 'It is morning. Offer an intention-setting or goals prompt.',
    evening: 'It is evening. Offer a reflection or gratitude prompt.',
    anytime: 'Offer a general reflection prompt.',
  }[timeOfDay] ?? 'Offer a general reflection prompt.';

  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 80,
    temperature: 0.9,
    messages: [
      { role: 'system', content: prompts.journalingReflection(context) },
      {
        role: 'user',
        content: `Generate ONE journaling prompt. ${timeHint} Recent themes: ${context.recentThemes.join(', ') || 'none'}. Reply with only the prompt sentence — no preamble.`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "What's on your mind right now?";
}