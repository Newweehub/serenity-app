import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.AZURE_COSMOS_ENDPOINT,
  key: process.env.AZURE_COSMOS_KEY,
});
const db = client.database(process.env.COSMOS_DATABASE_NAME || 'serenity');

export default async function (context) {
  const now = new Date();
  // yesterday in local-friendly UTC
  const d = new Date(now - 86_400_000);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const yesterdayDay = d.getDay(); // 0=Sun … 6=Sat

  const { resources: habits } = await db.container('habits')
    .items.query(`SELECT * FROM c WHERE c.status = 'active'`)
    .fetchAll();

  let missed = 0;
  for (const habit of habits) {
    const s = habit.schedule;
    if (!s?.targetTime) continue;

    // Check day match
    const dayMatch = s.dayOfWeek === null ||
      s.dayOfWeek === undefined ||
      Number(s.dayOfWeek) === yesterdayDay;
    if (!dayMatch) continue;

    // Already has a check-in for yesterday — skip
    const hasEntry = (habit.checkIns || []).some(c => c.date === yesterday);
    if (hasEntry) continue;

    // Write the missed check-in
    habit.checkIns = [
      { date: yesterday, completed: false, note: 'Auto-recorded miss' },
      ...(habit.checkIns || []),
    ].slice(0, 90);

    habit.streak = { ...habit.streak, current: 0 };
    habit.updatedAt = new Date().toISOString();

    await db.container('habits')
      .item(habit.id, habit.userId)
      .replace(habit);
    missed++;
  }

  context.log(`Midnight auto-miss: wrote ${missed} missed check-ins for ${yesterday}`);
}