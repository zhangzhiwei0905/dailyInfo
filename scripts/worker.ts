import "./_env";

import { todayKey } from "../lib/utils";
import { currentLocale } from "../lib/web/report-persistence";
import { runGeneration } from "../lib/web/run-service";

function parseRunTime(): { hour: number; minute: number } {
  const [hourText, minuteText] = (process.env.DAILY_RUN_TIME ?? "07:30").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: 7, minute: 30 };
  }
  return { hour, minute };
}

function msUntilNextRun(): number {
  const now = new Date();
  const { hour, minute } = parseRunTime();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function runOnce() {
  const date = todayKey();
  console.log(`[worker] generating ${date}`);
  await runGeneration({ date, locale: currentLocale(), trigger: "schedule" });
  console.log(`[worker] generated ${date}`);
}

function scheduleNext() {
  const delay = msUntilNextRun();
  console.log(`[worker] next run in ${(delay / 1000 / 60).toFixed(1)} minutes`);
  setTimeout(async () => {
    try {
      await runOnce();
    } catch (error) {
      console.error("[worker] generation failed", error);
    } finally {
      scheduleNext();
    }
  }, delay);
}

scheduleNext();
