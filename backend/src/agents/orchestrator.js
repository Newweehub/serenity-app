import { openaiClient, MODEL } from './openaiClient.js';
import { prompts } from './prompts.js';

const VALID_INTENTS = ['MINDFULNESS', 'JOURNAL', 'HABIT', 'INSIGHT', 'CONVERSATION'];

/**
 * Classify the user's message into one of the 5 intents.
 * Uses a cheap, low-token call before the main response.
 */
async function classifyIntent(message) {
  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 10,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'Classify this message into exactly one word: MINDFULNESS, JOURNAL, HABIT, INSIGHT, or CONVERSATION. Reply with only the word.',
      },
      { role: 'user', content: message },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim().toUpperCase() ?? '';
  return VALID_INTENTS.includes(raw) ? raw : 'CONVERSATION';
}

/**
 * Pick the right system prompt based on classified intent.
 */
function resolveSystemPrompt(intent, context) {
  switch (intent) {
    case 'MINDFULNESS':  return prompts.mindfulnessCoach(context);
    case 'JOURNAL':      return prompts.journalingReflection(context);
    case 'HABIT':        return prompts.habitCoach(context);
    case 'INSIGHT':      return prompts.insightsAnalytics(context);
    default:             return prompts.orchestrator(context);
  }
}

/**
 * Main orchestration call.
 * Classifies intent, picks specialist prompt, and returns the agent reply.
 */
export async function orchestrate({ message, history = [], context }) {
  const intent = await classifyIntent(message);
  const systemPrompt = resolveSystemPrompt(intent, context);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 600,
    temperature: 0.7,
    messages,
  });

  const reply = response.choices[0]?.message?.content ?? "I'm here. Tell me more.";
  return { reply, intent };
}