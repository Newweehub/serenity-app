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