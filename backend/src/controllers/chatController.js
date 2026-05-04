import { orchestrate } from '../agents/orchestrator.js';
import { buildContext, updateMemoryAfterSession } from '../services/userService.js';

/**
 * POST /api/chat
 * Body: { message, history?, endSession? }
 */
export async function chat(req, res) {
  const userId = req.userId;
  const { message, history = [], endSession = false } = req.body;

  // Session end — update memory and return
  if (endSession) {
    updateMemoryAfterSession(userId, history).catch(err =>
      console.error('[chatController] Memory update failed:', err)
    );
    return res.json({ ok: true });
  }

  const context = await buildContext(userId);
  const { reply, intent } = await orchestrate({ message, history, context });

  // Update memory every 10 turns (non-blocking)
  const fullHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: reply }];
  if (fullHistory.length % 10 === 0) {
    updateMemoryAfterSession(userId, fullHistory).catch(err =>
      console.error('[chatController] Background memory update failed:', err)
    );
  }

  res.json({ reply, intent });
}

/**
 * POST /api/chat/journal
 * Dedicated journal follow-up endpoint — always uses journalingReflection prompt.
 * Never routes to mindfulnessCoach regardless of message content.
 * Body: { message, history? }
 */
export async function journalChat(req, res) {
  const userId = req.userId;
  const { message, history = [] } = req.body;

  const context = await buildContext(userId);

  // Import here to avoid circular dependency
  const { openaiClient, MODEL } = await import('../agents/openaiClient.js');
  const { prompts } = await import('../agents/prompts.js');

  const messages = [
    { role: 'system', content: prompts.journalingReflection(context) },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    temperature: 0.7,
    messages,
  });

  let reply = response.choices[0]?.message?.content ?? "I'm here. Tell me more.";

  // Safety net — if model returns JSON despite prompt, intercept it
  if (reply.trim().startsWith('{') || reply.trim().startsWith('[')) {
    reply = "I'm here with you. What else is on your mind?";
  }

  res.json({ reply });
}
