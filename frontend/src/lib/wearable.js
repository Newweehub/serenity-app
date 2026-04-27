/**
 * Mock wearable data — mimics what a real Fitbit / Garmin / Apple Health API
 * would return after OAuth integration.
 *
 * In production, replace getMockWearableData() with a real API call to
 * Azure Functions which proxies the wearable provider's REST API.
 */

function seededRandom(seed) {
  // Simple deterministic pseudo-random based on date seed
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function todaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function getMockWearableData() {
  const seed    = todaySeed();
  const r       = (offset) => seededRandom(seed + offset);
  const hour    = new Date().getHours();

  // Steps: ramp up through the day
  const maxSteps    = 4000 + Math.floor(r(1) * 6000); // 4k–10k daily goal
  const stepsFactor = Math.min(1, hour / 16);          // full by 4pm
  const steps       = Math.floor(maxSteps * stepsFactor * (0.85 + r(2) * 0.3));

  // Heart rate: between 58–90 bpm, slightly elevated in afternoon
  const baseHR     = 62 + Math.floor(r(3) * 16);
  const hrVariance = hour > 10 && hour < 18 ? 8 : 2;
  const heartRate  = baseHR + Math.floor(r(4) * hrVariance);

  // Sleep: last night's data
  const sleepHours    = 5.5 + r(5) * 3.5;              // 5.5–9 hours
  const deepSleepPct  = 0.15 + r(6) * 0.10;
  const remSleepPct   = 0.20 + r(7) * 0.10;

  // Stress score: 1–100 (lower = less stressed)
  const stressScore   = 20 + Math.floor(r(8) * 50);

  // SpO2
  const spo2          = 95 + Math.floor(r(9) * 4);

  // 7-day history for sparklines
  const weeklySteps = Array.from({ length: 7 }, (_, i) => {
    const daySeed = seed - (6 - i);
    return Math.floor((4000 + seededRandom(daySeed) * 6000) * (0.6 + seededRandom(daySeed + 1) * 0.8));
  });

  const weeklyHR = Array.from({ length: 7 }, (_, i) => {
    return 60 + Math.floor(seededRandom(seed - (6 - i) + 20) * 25);
  });

  const weeklySleep = Array.from({ length: 7 }, (_, i) => {
    return +(5.5 + seededRandom(seed - (6 - i) + 40) * 3).toFixed(1);
  });

  return {
    source:     'Mock (Fitbit-compatible)',
    updatedAt:  new Date().toISOString(),
    today: {
      steps,
      stepGoal:    8000,
      heartRate,
      hrZone:      heartRate < 70 ? 'Resting' : heartRate < 85 ? 'Fat burn' : 'Cardio',
      sleep: {
        totalHours:  +sleepHours.toFixed(1),
        deepHours:   +(sleepHours * deepSleepPct).toFixed(1),
        remHours:    +(sleepHours * remSleepPct).toFixed(1),
        lightHours:  +(sleepHours * (1 - deepSleepPct - remSleepPct)).toFixed(1),
        quality:     sleepHours >= 7 ? 'Good' : sleepHours >= 6 ? 'Fair' : 'Poor',
      },
      stress:      stressScore,
      stressLevel: stressScore < 35 ? 'Low' : stressScore < 60 ? 'Moderate' : 'High',
      spo2,
      calories:    Math.floor(1400 + r(10) * 600),
    },
    history: {
      steps:  weeklySteps,
      hr:     weeklyHR,
      sleep:  weeklySleep,
      labels: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86_400_000);
        return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      }),
    },
  };
}

/**
 * Maps wearable stress + sleep data to a suggested mindfulness exercise ID.
 * This is the "wearable → mindfulness recommendation" integration point.
 */
export function getWearableExerciseSuggestion(wearable) {
  const { stress, sleep } = wearable.today;
  if (stress >= 60)               return { exerciseId: 'breathing_478',   reason: 'Your stress level is high — 4-7-8 breathing can help.' };
  if (sleep.totalHours < 6)       return { exerciseId: 'body_scan_5min',  reason: 'You slept under 6 hours — a body scan can restore calm.' };
  if (sleep.quality === 'Poor')   return { exerciseId: 'grounding_54321', reason: 'Poor sleep can leave you feeling disconnected — try grounding.' };
  return { exerciseId: 'mindful_breath', reason: 'A quick mindful breath sets a good tone for the day.' };
}
