import { CronExpressionParser } from "cron-parser";

// --- Natural language → cron ---

const DAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function parseTime(str: string): { hour: number; minute: number } | null {
  // "9am", "9:30pm", "14:00", "2pm", "9:30am"
  const match = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toLowerCase();

  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function parseToCron(input: string): string | null {
  const s = input.trim().toLowerCase();

  // Already a cron expression? (starts with a number or *)
  if (/^[\d*]/.test(s) && validateCron(s).valid) return s;

  // "every minute"
  if (s === "every minute") return "* * * * *";

  // "every N minutes"
  let m = s.match(/^every (\d+) minutes?$/);
  if (m) return `*/${m[1]} * * * *`;

  // "every hour"
  if (s === "every hour" || s === "hourly") return "0 * * * *";

  // "every N hours"
  m = s.match(/^every (\d+) hours?$/);
  if (m) return `0 */${m[1]} * * *`;

  // "every day at TIME"
  m = s.match(/^(?:every day|daily)(?: at (.+))?$/);
  if (m) {
    const time = parseTime(m[1] ?? "9:00am");
    if (!time) return null;
    return `${time.minute} ${time.hour} * * *`;
  }

  // "every weekday at TIME"
  m = s.match(/^every weekday(?: at (.+))?$/);
  if (m) {
    const time = parseTime(m[1] ?? "9:00am");
    if (!time) return null;
    return `${time.minute} ${time.hour} * * 1-5`;
  }

  // "every weekend at TIME"
  m = s.match(/^every weekend(?: at (.+))?$/);
  if (m) {
    const time = parseTime(m[1] ?? "9:00am");
    if (!time) return null;
    return `${time.minute} ${time.hour} * * 0,6`;
  }

  // "every monday at TIME", "every tue at TIME"
  m = s.match(/^every (\w+)(?: at (.+))?$/);
  if (m && DAYS[m[1]] !== undefined) {
    const time = parseTime(m[2] ?? "9:00am");
    if (!time) return null;
    return `${time.minute} ${time.hour} * * ${DAYS[m[1]]}`;
  }

  return null;
}

// --- Cron description (human-readable) ---

export function describeCron(expression: string): string {
  const parts = expression.split(" ");
  if (parts.length !== 5) return expression;

  const [min, hour, , , dow] = parts;

  if (expression === "* * * * *") return "every minute";
  if (min.startsWith("*/")) return `every ${min.slice(2)} minutes`;
  if (hour === "*" && min === "0") return "every hour";
  if (hour.startsWith("*/") && min === "0") return `every ${hour.slice(2)} hours`;

  const timeStr = formatTimeOfDay(parseInt(hour), parseInt(min));

  if (dow === "*") return `daily at ${timeStr}`;
  if (dow === "1-5") return `weekdays at ${timeStr}`;
  if (dow === "0,6") return `weekends at ${timeStr}`;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNum = parseInt(dow);
  if (dayNum >= 0 && dayNum <= 6) return `${dayNames[dayNum]} at ${timeStr}`;

  return expression;
}

function formatTimeOfDay(hour: number, minute: number): string {
  const period = hour >= 12 ? "pm" : "am";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return minute === 0 ? `${h}${period}` : `${h}:${minute.toString().padStart(2, "0")}${period}`;
}

// --- Validation + next run ---

export function validateCron(expression: string): {
  valid: boolean;
  error?: string;
} {
  try {
    CronExpressionParser.parse(expression);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

export function nextRun(expression: string): Date {
  const interval = CronExpressionParser.parse(expression);
  return interval.next().toDate();
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;

  if (diff < 0) return "now";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `in ${days}d ${remainingHours}h` : `in ${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `in ${hours}h ${remainingMinutes}m`
      : `in ${hours}h`;
  }
  if (minutes > 0) return `in ${minutes}m`;
  return `in ${seconds}s`;
}
