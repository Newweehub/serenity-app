export function markStepDone(userId, step) {
  const key  = `serenity-today-${userId}-${getLocalDateString()}`;
  const done = JSON.parse(localStorage.getItem(key) || "{}");
  if (!done[step]) {
    done[step] = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit"
    });
    localStorage.setItem(key, JSON.stringify(done));
  }
}

export function getTodayProgress(userId) {
  const key = `serenity-today-${userId}-${getLocalDateString()}`;
  return JSON.parse(localStorage.getItem(key) || "{}");
}

// Uses local date, not UTC
export function getLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${
    String(d.getMonth() + 1).padStart(2, "0")}-${
    String(d.getDate()).padStart(2, "0")}`;
}