import { openaiClient, MODEL } from './openaiClient.js';
import { prompts } from './prompts.js';

/**
 * Given a session's chat history, extract a memoryContext patch and return it.
 * The caller (userService) is responsible for persisting the patch.
 */
export async function extractMemoryPatch(history) {
  if (!history || history.length === 0) return null;

  const transcript = history
    .map(m => `${m.role === 'user' ? 'User' : 'Serenity'}: ${m.content}`)
    .join('\n');

  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    temperature: 0.2,
    messages: [
      { role: 'system', content: prompts.memoryAgent() },
      {
        role: 'user',
        content: `Session transcript:\n\n${transcript}\n\nReturn only the JSON patch for memoryContext.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  try {
    const clean = raw.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.error('[memoryAgent] Failed to parse patch:', raw);
    return null;
  }
}