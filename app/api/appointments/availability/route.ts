import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

type BusinessHourEntry = { day: string; open: string; close: string; enabled: boolean }
type LunchBreak        = { start: string; end: string; enabled: boolean }

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function toTotalMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// ── GET /api/appointments/availability ───────────────────────────────────────
// Query params:
//   date     – YYYY-MM-DD (required)
//   provider – string (optional; case-insensitive exact match)
//   duration – minutes per slot (default 30)

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const dateParam     = searchParams.get("date")
  const providerParam = searchParams.get("provider") ?? undefined
  const rawDuration   = parseInt(searchParams.get("duration") ?? "30", 10)
  const duration      = isNaN(rawDuration) || rawDuration <= 0 ? 30 : rawDuration

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: "Missing or invalid 'date' parameter. Expected YYYY-MM-DD." },
      { status: 400 }
    )
  }

  try {
    const [year, month, day] = dateParam.split("-").map(Number)

    // Construct local-time boundaries for the requested calendar date
    const dayStart = new Date(year, month - 1, day,  0,  0,  0,   0)
    const dayEnd   = new Date(year, month - 1, day, 23, 59, 59, 999)

    const dayOfWeek = DAY_NAMES[dayStart.getDay()]

    const [settings, bookedAppointments] = await Promise.all([
      prisma.settings.findFirst({
        select: { businessHours: true, lunchBreak: true },
      }),
      prisma.appointment.findMany({
        where: {
          startTime: { gte: dayStart, lte: dayEnd },
          status:    { notIn: ["CANCELLED", "NO_SHOW"] },
          ...(providerParam && {
            provider: { equals: providerParam, mode: "insensitive" },
          }),
        },
        select: { startTime: true, endTime: true },
      }),
    ])

    // Look up this day's hours from Settings
    const businessHours = settings?.businessHours as BusinessHourEntry[] | null
    const dayHours = businessHours?.find(
      (h) => h.day.toLowerCase() === dayOfWeek.toLowerCase()
    )

    if (!dayHours || !dayHours.enabled) {
      return NextResponse.json({
        date:           dateParam,
        provider:       providerParam ?? null,
        availableSlots: [],
      })
    }

    const openMin  = toTotalMinutes(dayHours.open)
    const closeMin = toTotalMinutes(dayHours.close)

    // Lunch break — use Settings value, fall back to spec default
    const rawLunch   = settings?.lunchBreak as LunchBreak | null
    const lunch      = rawLunch ?? { start: "12:30", end: "13:00", enabled: true }
    const lunchStart = lunch.enabled ? toTotalMinutes(lunch.start) : -1
    const lunchEnd   = lunch.enabled ? toTotalMinutes(lunch.end)   : -1

    // For today, skip any slot that has already started
    const now     = new Date()
    const isToday = (
      now.getFullYear() === year &&
      now.getMonth()    === month - 1 &&
      now.getDate()     === day
    )
    const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1

    const availableSlots: { startTime: string; endTime: string }[] = []

    for (let slotStart = openMin; slotStart + duration <= closeMin; slotStart += duration) {
      const slotEnd = slotStart + duration

      // Skip past slots when date is today
      if (isToday && slotStart <= nowMinutes) continue

      // Skip if slot overlaps with lunch break
      if (lunch.enabled && slotStart < lunchEnd && slotEnd > lunchStart) continue

      // Check against every non-cancelled booked appointment
      const slotStartDate = new Date(year, month - 1, day, Math.floor(slotStart / 60), slotStart % 60, 0)
      const slotEndDate   = new Date(year, month - 1, day, Math.floor(slotEnd   / 60), slotEnd   % 60, 0)

      const isBooked = bookedAppointments.some(
        (appt) => appt.startTime < slotEndDate && appt.endTime > slotStartDate
      )

      if (!isBooked) {
        availableSlots.push({
          startTime: minutesToHHMM(slotStart),
          endTime:   minutesToHHMM(slotEnd),
        })
      }
    }

    return NextResponse.json({
      date:           dateParam,
      provider:       providerParam ?? null,
      availableSlots,
    })
  } catch (error) {
    console.error("[GET /api/appointments/availability]", error)
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    )
  }
}
