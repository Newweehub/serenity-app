import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.AZURE_COSMOS_ENDPOINT,
  key: process.env.AZURE_COSMOS_KEY,
});

const db = client.database(
  process.env.COSMOS_DATABASE_NAME || 'serenity'
);

export default async function (context) {
  const now = new Date();

  // Yesterday in UTC-friendly format
  const d = new Date(now.getTime() - 86_400_000);
  const yesterday = `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const yesterdayDay = d.getDay(); // 0=Sun … 6=Sat

  let missed = 0;

  // Use paginated iterator instead of fetchAll()
  const iterator = db
    .container('habits')
    .items.query(
      `SELECT * FROM c WHERE c.status = 'active'`,
      { maxItemCount: 100 }
    );

  while (iterator.hasMoreResults()) {
    const { resources: habits } = await iterator.fetchNext();

    for (const habit of habits) {
      const s = habit.schedule;

      // Skip habits without schedule/time
      if (!s?.targetTime) continue;

      // Check if this habit was scheduled for yesterday
      const dayMatch =
        s.dayOfWeek === null ||
        s.dayOfWeek === undefined ||
        Number(s.dayOfWeek) === yesterdayDay;

      if (!dayMatch) continue;

      // Skip if already checked in yesterday
      const hasEntry = (habit.checkIns || []).some(
        (c) => c.date === yesterday
      );

      if (hasEntry) continue;

      // Add automatic missed check-in
      habit.checkIns = [
        {
          date: yesterday,
          completed: false,
          note: 'Auto-recorded miss',
        },
        ...(habit.checkIns || []),
      ].slice(0, 90);

      // Reset streak
      habit.streak = {
        ...habit.streak,
        current: 0,
      };

      habit.updatedAt = new Date().toISOString();

      // Save updated habit
      await db
        .container('habits')
        .item(habit.id, habit.userId)
        .replace(habit);

      missed++;
    }
  }

  context.log(
    `Midnight auto-miss: wrote ${missed} missed check-ins for ${yesterday}`
  );
}