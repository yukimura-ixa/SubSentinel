import { addMonths, addWeeks } from "date-fns";
import { formatInTimeZone, utcToZonedTime } from "date-fns-tz";

export const DEFAULT_TZ = "Asia/Bangkok";

export function zonedDate(date: Date | string, tz: string = DEFAULT_TZ) {
  return utcToZonedTime(typeof date === "string" ? new Date(date) : date, tz);
}

export function nextChargeDate(current: Date, cycle: "weekly" | "monthly" | "yearly", tz: string = DEFAULT_TZ) {
  const zoned = zonedDate(current, tz);
  switch (cycle) {
    case "weekly":
      return addWeeks(zoned, 1);
    case "monthly":
      return addMonths(zoned, 1);
    case "yearly":
      return addMonths(zoned, 12);
    default:
      return addMonths(zoned, 1);
  }
}

export function monthlySpendFromSubscription(amount: number, cycle: "weekly" | "monthly" | "yearly") {
  if (cycle === "monthly") return amount;
  if (cycle === "yearly") return amount / 12;
  if (cycle === "weekly") return (amount * 52) / 12;
  return amount;
}

export function formatBangkok(date: Date | string, pattern: string = "yyyy-MM-dd'T'HH:mm:ssXXX") {
  return formatInTimeZone(typeof date === "string" ? new Date(date) : date, DEFAULT_TZ, pattern);
}
