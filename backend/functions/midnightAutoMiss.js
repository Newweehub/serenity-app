import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.AZURE_COSMOS_ENDPOINT,
  key: process.env.AZURE_COSMOS_KEY,
});
const db = client.database(process.env.COSMOS_DATABASE_NAME);

// Runs at 00:01 every day (UTC)
export default async function(context, myTimer) {
  const yesterday = (() => {
    const d = new Date(Date.now() - 86_400_000);
    return d.toISOString().slice(0, 10);
  })();
  const yesterdayDay = new Date(Date.now() - 86_400_000).getDay();

  const { resources: habits } = await db.container('habits')
    .items.query({
      query: "SELECT * FROM c WHERE c.status = 'active'"
    }).fetchAll();

  let processed = 0;
  for (const habit of habits) {
    const s = habit.schedule;
    if (!s?.targetTime) continue;
    const dayMatch = s.dayOfWeek === null ||
      s.dayOfWeek === undefined ||
      Number(s.dayOfWeek) === yesterdayDay;
    if (!dayMatch) continue;
    const alreadyHas = (habit.checkIns || [])
      .some(c => c.date === yesterday);
    if (alreadyHas) continue;

    habit.checkIns = [
      { date: yesterday, completed: false, note: 'Auto-recorded miss' },
      ...(habit.checkIns || [])
    ].slice(0, 90);
    habit.streak.current = 0;
    habit.updatedAt = new Date().toISOString();

    await db.container('habits')
      .item(habit.id, habit.userId).replace(habit);
    processed++;
  }
  context.log(`Auto-miss: processed ${processed} habits for ${yesterday}`);
}