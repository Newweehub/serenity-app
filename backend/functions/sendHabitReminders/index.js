import { CosmosClient } from '@azure/cosmos';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const client = new CosmosClient({
  endpoint: process.env.AZURE_COSMOS_ENDPOINT,
  key:      process.env.AZURE_COSMOS_KEY,
});
const db = client.database(process.env.COSMOS_DATABASE_NAME || 'serenity');

export default async function (context) {
  const now     = new Date();
  const day     = now.getDay();
  const hh      = String(now.getHours()).padStart(2, '0');
  const mm      = String(now.getMinutes()).padStart(2, '0');
  const time    = `${hh}:${mm}`;
  const today   = now.toISOString().slice(0, 10);

  // Get all active habits with a matching reminder time
  const { resources: habits } = await db.container('habits')
    .items.query(`SELECT * FROM c WHERE c.status = 'active' AND c.schedule.targetTime = '${time}'`)
    .fetchAll();

  let sent = 0;
  for (const habit of habits) {
    const s = habit.schedule;
    const dayMatch = s.dayOfWeek === null || s.dayOfWeek === undefined || Number(s.dayOfWeek) === day;
    if (!dayMatch) continue;

    const done = (habit.checkIns || []).some(c => c.date === today && c.completed);
    if (done) continue;

    // Get the user's push subscription
    try {
      const { resource: sub } = await db.container('pushSubscriptions')
        .item(habit.userId, habit.userId).read();
      if (!sub?.subscription) continue;

      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: `🌿 Time for "${habit.name}"`,
          body:  'Tap to open your Habit Board.',
          url:   '/habits',
        })
      );
      sent++;
    } catch { /* subscription may be expired — skip silently */ }
  }

  context.log(`Push notifications: sent ${sent} for time ${time}`);
}