import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz"
import { format, parse, startOfWeek, addDays, getDay } from "date-fns"

/**
 * Convert a UTC date to a specific timezone
 */
export function utcToTimezone(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone)
}

/**
 * Convert a date in a specific timezone to UTC
 */
export function timezoneToUtc(localDate: Date, timezone: string): Date {
  return fromZonedTime(localDate, timezone)
}

/**
 * Format a UTC date in a specific timezone
 */
export function formatInTimezone(
  utcDate: Date,
  timezone: string,
  formatStr: string = "MMM d, yyyy h:mm a"
): string {
  return formatInTimeZone(utcDate, timezone, formatStr)
}

/**
 * Get the day of week (0-6) for a UTC date in a specific timezone
 */
export function getDayOfWeekInTimezone(utcDate: Date, timezone: string): number {
  const zonedDate = toZonedTime(utcDate, timezone)
  return getDay(zonedDate)
}

/**
 * Get the time string (HH:mm) for a UTC date in a specific timezone
 */
export function getTimeInTimezone(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, "HH:mm")
}

/**
 * Create a UTC date from date string and time string in a specific timezone
 */
export function createUtcDateTime(
  dateString: string, // YYYY-MM-DD
  timeString: string, // HH:mm
  timezone: string
): Date {
  const localDateTime = parse(
    `${dateString} ${timeString}`,
    "yyyy-MM-dd HH:mm",
    new Date()
  )
  return fromZonedTime(localDateTime, timezone)
}

/**
 * Check if a shift is an overnight shift (crosses midnight in location timezone)
 */
export function isOvernightShift(
  startTimeUtc: Date,
  endTimeUtc: Date,
  timezone: string
): boolean {
  const startZoned = toZonedTime(startTimeUtc, timezone)
  const endZoned = toZonedTime(endTimeUtc, timezone)
  
  return format(startZoned, "yyyy-MM-dd") !== format(endZoned, "yyyy-MM-dd")
}

/**
 * Check if a shift is a premium shift (Fri/Sat evening 17:00-23:59)
 */
export function isPremiumShift(
  startTimeUtc: Date,
  timezone: string
): boolean {
  const zonedStart = toZonedTime(startTimeUtc, timezone)
  const dayOfWeek = getDay(zonedStart)
  const hour = zonedStart.getHours()
  
  // Friday = 5, Saturday = 6
  const isFriOrSat = dayOfWeek === 5 || dayOfWeek === 6
  const isEvening = hour >= 17 && hour <= 23
  
  return isFriOrSat && isEvening
}

/**
 * Get the start and end of a week for a given date in a specific timezone
 */
export function getWeekBounds(
  date: Date,
  timezone: string,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0 // Sunday = 0
): { start: Date; end: Date } {
  const zonedDate = toZonedTime(date, timezone)
  const weekStart = startOfWeek(zonedDate, { weekStartsOn })
  const weekEnd = addDays(weekStart, 7)
  
  return {
    start: fromZonedTime(weekStart, timezone),
    end: fromZonedTime(weekEnd, timezone),
  }
}

/**
 * Check if a shift falls within staff availability
 * 
 * @param shiftStartUtc - Shift start time in UTC
 * @param shiftEndUtc - Shift end time in UTC
 * @param availability - Staff availability record
 * @param staffTimezone - Staff's reference timezone
 * @param locationTimezone - Location's timezone
 */
export function isShiftWithinAvailability(
  shiftStartUtc: Date,
  shiftEndUtc: Date,
  availability: {
    dayOfWeek: number
    startTime: string // HH:mm
    endTime: string // HH:mm
  },
  staffTimezone: string,
  locationTimezone: string
): boolean {
  // Convert shift times to staff's timezone for comparison
  const shiftStartInStaffTz = toZonedTime(shiftStartUtc, staffTimezone)
  const shiftEndInStaffTz = toZonedTime(shiftEndUtc, staffTimezone)
  
  // Get the day of week in staff's timezone
  const shiftDayOfWeek = getDay(shiftStartInStaffTz)
  
  // Check if the day matches
  if (shiftDayOfWeek !== availability.dayOfWeek) {
    return false
  }
  
  // Parse availability times
  const availStart = parse(availability.startTime, "HH:mm", new Date())
  const availEnd = parse(availability.endTime, "HH:mm", new Date())
  
  // Get shift times as HH:mm strings
  const shiftStartTime = format(shiftStartInStaffTz, "HH:mm")
  const shiftEndTime = format(shiftEndInStaffTz, "HH:mm")
  
  // Parse shift times
  const shiftStartParsed = parse(shiftStartTime, "HH:mm", new Date())
  const shiftEndParsed = parse(shiftEndTime, "HH:mm", new Date())
  
  // Check if shift is within availability window
  return shiftStartParsed >= availStart && shiftEndParsed <= availEnd
}

/**
 * Format shift duration in hours
 */
export function formatShiftDuration(startTimeUtc: Date, endTimeUtc: Date): string {
  const durationMs = endTimeUtc.getTime() - startTimeUtc.getTime()
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes}m`
}

/**
 * Calculate hours between two dates
 */
export function calculateHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

/**
 * Get common IANA timezones
 */
export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
]
