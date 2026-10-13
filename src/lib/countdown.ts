export function countdownParts(date: string, now: number) {
  const target = Date.parse(date)
  const remaining = Number.isFinite(target) ? Math.max(0, Math.floor((target - now) / 1000)) : 0
  return {
    started: remaining === 0,
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  }
}
