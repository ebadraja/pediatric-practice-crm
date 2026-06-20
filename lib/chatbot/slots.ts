import { addDaysToDateString, getDayAvailability } from "@/lib/appointments/availability"

export type SlotOption = {
  date: string
  dateLabel: string
  times: { time: string; label: string }[]
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h >= 12 ? "pm" : "am"
  const hour   = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")}${suffix}`
}

function dateLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

/** Fetch upcoming open slots for clickable UI chips (matches voice tool data source). */
export async function getUpcomingSlotOptions(rangeDays = 7): Promise<SlotOption[]> {
  const start = todayStr()
  const options: SlotOption[] = []

  for (let i = 0; i < rangeDays; i++) {
    const date = addDaysToDateString(start, i)
    const day  = await getDayAvailability({ date, duration: 30 })
    if (!day.availableSlots.length) continue

    options.push({
      date,
      dateLabel: dateLabel(date),
      times: day.availableSlots.slice(0, 12).map((s) => ({
        time:  s.startTime,
        label: to12Hour(s.startTime),
      })),
    })
  }

  return options
}

export function replyMentionsAvailability(reply: string): boolean {
  const t = reply.toLowerCase()
  return (
    /\bavailable on\b/.test(t) ||
    /\b(next available|availability|open slot|time slot)\b/.test(t) ||
    /\b\d{1,2}:\d{2}\s*(am|pm)\b/.test(t)
  )
}
