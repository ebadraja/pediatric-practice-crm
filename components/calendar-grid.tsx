"use client";

import { useMemo } from "react";
import { format, isSameDay, isToday, parseISO } from "date-fns";
import { Calendar, ChevronRight, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GCalEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string;
}

export interface Patient {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient: Patient;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  status: string;
  provider: string | null;
  reason: string | null;
  notes: string | null;
}

export type GcalVisitType = "WELL" | "SICK" | "BH" | "NEW" | "NURSE" | "VIRTUAL" | "OTHER";

export interface EnrichedGCalEvent extends GCalEvent {
  visitType: GcalVisitType;
  noShow: boolean;
  cleanTitle: string;
}

export type CalendarViewMode = "day" | "week" | "list";
export type CalendarVariant = "classic" | "advanced";

// ─── Grid constants ───────────────────────────────────────────────────────────

const SLOT_HEIGHT  = 52;   // px per 30-min slot
const DAY_START    = 8;    // 08:00
const DAY_END      = 17;   // 17:00
const PX_PER_MIN   = SLOT_HEIGHT / 30;
const TOTAL_HEIGHT = (DAY_END - DAY_START) * 2 * SLOT_HEIGHT; // 720 px

const TIME_SLOTS: string[] = [];
for (let h = DAY_START; h < DAY_END; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function slotTop(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m - DAY_START * 60) * PX_PER_MIN;
}

const LUNCH_TOP    = slotTop("12:00");
const LUNCH_HEIGHT = slotTop("13:00") - LUNCH_TOP;

const UNASSIGNED_PROVIDER = "Unassigned";

// ─── Collision layout ─────────────────────────────────────────────────────────

function computeLayout(
  items: Array<{ id: string; startMin: number; endMin: number }>,
): Map<string, { col: number; totalCols: number }> {
  if (items.length === 0) return new Map();

  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const result = new Map<string, { col: number; totalCols: number }>();

  const groups: typeof sorted[] = [];
  let current: typeof sorted = [];
  let groupEnd = -Infinity;

  for (const item of sorted) {
    if (item.startMin >= groupEnd && current.length > 0) {
      groups.push(current);
      current = [];
      groupEnd = -Infinity;
    }
    current.push(item);
    groupEnd = Math.max(groupEnd, item.endMin);
  }
  if (current.length > 0) groups.push(current);

  for (const group of groups) {
    const colEnds: number[] = [];
    for (const item of group) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= item.startMin) {
          colEnds[c] = item.endMin;
          result.set(item.id, { col: c, totalCols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        colEnds.push(item.endMin);
        result.set(item.id, { col: colEnds.length - 1, totalCols: 0 });
      }
    }
    const numCols = colEnds.length;
    for (const item of group) {
      const r = result.get(item.id)!;
      result.set(item.id, { ...r, totalCols: numCols });
    }
  }

  return result;
}

// ─── Styling maps ─────────────────────────────────────────────────────────────

export const TYPE_CONFIG: Record<string, { block: string; text: string; dot: string; label: string }> = {
  WELL_CHILD_VISIT: {
    block: "bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700",
    text:  "text-blue-800 dark:text-blue-200",
    dot:   "bg-blue-500",
    label: "Well-child Visit",
  },
  SICK_VISIT: {
    block: "bg-green-100 dark:bg-green-950/60 border-green-300 dark:border-green-700",
    text:  "text-green-800 dark:text-green-200",
    dot:   "bg-green-500",
    label: "Sick Visit",
  },
  VACCINATION: {
    block: "bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700",
    text:  "text-purple-800 dark:text-purple-200",
    dot:   "bg-purple-500",
    label: "Vaccination",
  },
  FOLLOW_UP: {
    block: "bg-orange-100 dark:bg-orange-950/60 border-orange-300 dark:border-orange-700",
    text:  "text-orange-800 dark:text-orange-200",
    dot:   "bg-orange-500",
    label: "Follow-up",
  },
  CONSULTATION: {
    block: "bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700",
    text:  "text-teal-800 dark:text-teal-200",
    dot:   "bg-teal-500",
    label: "Consultation",
  },
  PROCEDURE: {
    block: "bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700",
    text:  "text-rose-800 dark:text-rose-200",
    dot:   "bg-rose-500",
    label: "Procedure",
  },
  OTHER: {
    block: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600",
    text:  "text-slate-700 dark:text-slate-300",
    dot:   "bg-slate-400",
    label: "Other",
  },
};

export const GCAL_TYPE_CONFIG = {
  WELL:    { label: "Well Visit",        dot: "bg-blue-500",    block: "bg-blue-50 dark:bg-blue-950/50",       text: "text-blue-800 dark:text-blue-200",       borderColor: "#3b82f6" },
  SICK:    { label: "Sick Visit",        dot: "bg-green-500",   block: "bg-green-50 dark:bg-green-950/50",     text: "text-green-800 dark:text-green-200",     borderColor: "#22c55e" },
  BH:      { label: "Behavioral Health", dot: "bg-fuchsia-500", block: "bg-fuchsia-50 dark:bg-fuchsia-950/50", text: "text-fuchsia-800 dark:text-fuchsia-200", borderColor: "#d946ef" },
  NEW:     { label: "New Patient",       dot: "bg-teal-500",    block: "bg-teal-50 dark:bg-teal-950/50",       text: "text-teal-800 dark:text-teal-200",       borderColor: "#14b8a6" },
  NURSE:   { label: "Nurse Visit",       dot: "bg-orange-500",  block: "bg-orange-50 dark:bg-orange-950/50",   text: "text-orange-800 dark:text-orange-200",   borderColor: "#f97316" },
  VIRTUAL: { label: "Virtual",           dot: "bg-indigo-500",  block: "bg-indigo-50 dark:bg-indigo-950/50",   text: "text-indigo-800 dark:text-indigo-200",   borderColor: "#6366f1" },
  OTHER:   { label: "Other",             dot: "bg-sky-400",     block: "bg-sky-50 dark:bg-sky-950/40",         text: "text-sky-800 dark:text-sky-200",         borderColor: "#38bdf8" },
} as const;

export const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label])
);

function cleanSummary(raw: string): string {
  return raw
    .replace(/\*{1,2}[^*]*\*{1,2}/g, "")
    .replace(/\+[^+]+\+/g, "")
    .replace(/\s*[-–]\s*(BH|WELL|SICK|NEW|GAC|NURSE|MIGDAS|Migdas|VIRTUAL|Virtual Visit|Virtual)\b.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGcal(e: GCalEvent): EnrichedGCalEvent {
  const raw = e.summary ?? "";
  let visitType: GcalVisitType = "OTHER";
  if      (/[-–]\s*WELL\b/i.test(raw))  visitType = "WELL";
  else if (/[-–]\s*SICK\b/i.test(raw))  visitType = "SICK";
  else if (/[-–]\s*BH\b/i.test(raw))    visitType = "BH";
  else if (/[-–]\s*NEW\b/i.test(raw))   visitType = "NEW";
  else if (/[-–]\s*NURSE\b/i.test(raw)) visitType = "NURSE";
  else if (/virtual/i.test(raw))        visitType = "VIRTUAL";
  return {
    ...e,
    visitType,
    noShow: /no[\s-]*show/i.test(raw),
    cleanTitle: cleanSummary(raw) || raw,
  };
}

function providerKey(provider: string | null | undefined): string {
  const trimmed = provider?.trim();
  return trimmed ? trimmed : UNASSIGNED_PROVIDER;
}

// ─── AppointmentBlock ─────────────────────────────────────────────────────────

function AppointmentBlock({
  appt,
  onClick,
  col,
  totalCols,
}: {
  appt: Appointment;
  onClick: () => void;
  col: number;
  totalCols: number;
}) {
  const start      = parseISO(appt.startTime);
  const topMin     = start.getHours() * 60 + start.getMinutes() - DAY_START * 60;
  const top        = topMin * PX_PER_MIN;
  const height     = Math.max(appt.duration * PX_PER_MIN, 22);
  const cfg        = TYPE_CONFIG[appt.type] ?? TYPE_CONFIG.OTHER;
  const isCancelled = appt.status === "CANCELLED" || appt.status === "NO_SHOW";
  const isCompleted = appt.status === "COMPLETED";
  const colW       = 100 / totalCols;
  const leftPct    = col * colW;

  if (top < 0 || top >= TOTAL_HEIGHT) return null;
  if (col >= 3) return null;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        top,
        height,
        position: "absolute",
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${colW}% - 4px)`,
        zIndex: 10,
      }}
      className={`rounded-md shadow-sm px-2 py-0.5 cursor-pointer border transition-all hover:brightness-95 hover:shadow-md select-none overflow-hidden
        ${isCancelled
          ? "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50"
          : isCompleted
          ? `${cfg.block} opacity-70`
          : cfg.block}`}
    >
      <p className={`text-[11px] font-semibold leading-tight truncate
        ${isCancelled ? "line-through text-slate-400 dark:text-slate-500" : cfg.text}`}
      >
        {appt.patient.firstName} {appt.patient.lastName}
      </p>
      {height > 32 && (
        <p className={`text-[10px] leading-tight mt-0.5 truncate
          ${isCancelled ? "text-slate-400 dark:text-slate-500" : `${cfg.text} opacity-80`}`}
        >
          {format(start, "h:mm a")}
          {appt.provider && ` · ${appt.provider}`}
        </p>
      )}
    </div>
  );
}

// ─── GCalEventBlock ───────────────────────────────────────────────────────────

function GCalEventBlock({
  event,
  col,
  totalCols,
  onClick,
}: {
  event: EnrichedGCalEvent;
  col: number;
  totalCols: number;
  onClick: () => void;
}) {
  if (event.allDay) return null;

  const start   = new Date(event.start);
  const end     = new Date(event.end);
  const topMin  = start.getHours() * 60 + start.getMinutes() - DAY_START * 60;
  const durMin  = Math.max((end.getTime() - start.getTime()) / 60_000, 15);
  const top     = topMin * PX_PER_MIN;
  const height  = Math.max(durMin * PX_PER_MIN, 18);
  const colW    = 100 / totalCols;
  const leftPct = col * colW;

  if (top < 0 || top >= TOTAL_HEIGHT) return null;
  if (col >= 3) return null;

  const cfg = GCAL_TYPE_CONFIG[event.visitType];

  return (
    <div
      style={{
        top,
        height,
        position: "absolute",
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${colW}% - 4px)`,
        zIndex: 8,
        borderLeft: `3px solid ${event.noShow ? "#94a3b8" : cfg.borderColor}`,
      }}
      className={`rounded-md shadow-sm px-1.5 py-0.5 overflow-hidden cursor-pointer hover:brightness-95 hover:shadow-md transition-all select-none ${
        event.noShow ? "bg-slate-100 dark:bg-slate-800/60 opacity-60" : cfg.block
      }`}
      title={event.summary}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <p className={`text-[10px] font-semibold truncate leading-tight ${
        event.noShow ? "line-through text-slate-500 dark:text-slate-400" : cfg.text
      }`}>
        {event.cleanTitle}
      </p>
      {height > 30 && (
        <p className={`text-[9px] opacity-75 truncate ${
          event.noShow ? "text-slate-400 dark:text-slate-500" : cfg.text
        }`}>
          {format(start, "h:mm a")}
        </p>
      )}
    </div>
  );
}

// ─── Shared time-label column ─────────────────────────────────────────────────

function TimeLabelColumn() {
  return (
    <div className="w-16 flex-shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
      {TIME_SLOTS.map((slot, i) => (
        <div
          key={slot}
          style={{ position: "absolute", top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
          className="w-full flex items-start justify-end pr-2.5"
        >
          {i % 2 === 0 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2 font-medium">
              {format(new Date(0, 0, 0, ...slot.split(":").map(Number) as [number, number]), "h a")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function SlotRows({
  day,
  onSlotClick,
}: {
  day: Date;
  onSlotClick: (day: Date, slot: string) => void;
}) {
  return (
    <>
      {TIME_SLOTS.map((slot, i) => {
        const [h, m] = slot.split(":").map(Number);
        const isLunch = h * 60 + m >= 12 * 60 && h * 60 + m < 13 * 60;
        return (
          <div
            key={slot}
            onClick={() => !isLunch && onSlotClick(day, slot)}
            style={{
              position: "absolute",
              top: i * SLOT_HEIGHT,
              height: SLOT_HEIGHT,
              left: 0,
              right: 0,
            }}
            className={`border-b ${i % 2 === 0 ? "border-slate-100/70 dark:border-slate-800/40" : "border-slate-200 dark:border-slate-700/60"} transition-colors ${
              isLunch
                ? "cursor-default"
                : "cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
            }`}
          />
        );
      })}
    </>
  );
}

function LunchOverlay({ weekdaysOnly, day }: { weekdaysOnly?: boolean; day?: Date }) {
  if (weekdaysOnly && day && (day.getDay() === 0 || day.getDay() === 6)) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: LUNCH_TOP,
        height: LUNCH_HEIGHT,
        left: 0,
        right: 0,
        zIndex: 5,
      }}
      className="bg-slate-50/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700 pointer-events-none flex items-center justify-center"
    >
      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">
        Lunch
      </span>
    </div>
  );
}

function NowIndicator({ show, nowTop }: { show: boolean; nowTop: number | null }) {
  if (!show || nowTop === null) return null;
  return (
    <div
      style={{ position: "absolute", top: nowTop, left: 0, right: 0, zIndex: 20 }}
      className="flex items-center pointer-events-none"
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 flex-shrink-0 shadow-sm" />
      <div className="flex-1 h-px bg-red-500" />
    </div>
  );
}

function OverflowChip({
  layout,
  apptIds,
  gcalIds,
}: {
  layout: Map<string, { col: number; totalCols: number }>;
  apptIds: string[];
  gcalIds: string[];
}) {
  const hidden =
    apptIds.filter((id) => (layout.get(id)?.col ?? 0) >= 3).length +
    gcalIds.filter((id) => (layout.get(id)?.col ?? 0) >= 3).length;
  if (hidden <= 0) return null;
  return (
    <div
      style={{ position: "absolute", bottom: 6, right: 4, zIndex: 30 }}
      className="text-[9px] font-bold bg-slate-500 dark:bg-slate-600 text-white rounded-full px-1.5 py-0.5 pointer-events-none shadow-sm"
    >
      +{hidden}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CalendarGridProps {
  appointments: Appointment[];
  viewMode: CalendarViewMode;
  variant?: CalendarVariant;
  weekStart: Date;
  weekEnd: Date;
  weekDays: Date[];
  selectedDay: Date;
  nowTop: number | null;
  loading?: boolean;
  showGcal?: boolean;
  gcalEvents?: EnrichedGCalEvent[];
  onSlotClick: (day: Date, slot: string) => void;
  onBlockClick: (appt: Appointment) => void;
  onGcalBlockClick?: (event: EnrichedGCalEvent) => void;
}

// ─── Classic list view ────────────────────────────────────────────────────────

function ClassicListView({
  weekDays,
  appointments,
  showGcal,
  gcalEvents,
  onBlockClick,
  onGcalBlockClick,
}: {
  weekDays: Date[];
  appointments: Appointment[];
  showGcal: boolean;
  gcalEvents: EnrichedGCalEvent[];
  onBlockClick: (appt: Appointment) => void;
  onGcalBlockClick?: (event: EnrichedGCalEvent) => void;
}) {
  const sections = weekDays
    .map((day) => {
      const crm  = appointments.filter((a) => isSameDay(parseISO(a.startTime), day));
      const gcal = showGcal ? gcalEvents.filter((e) => isSameDay(new Date(e.start), day)) : [];
      type ListRow = {
        id: string;
        time: Date;
        end: Date;
        title: string;
        typeLabel: string;
        sub: string | null;
        dot: string;
        struck: boolean;
        open: () => void;
      };
      const rows: ListRow[] = [
        ...crm.map((a): ListRow => {
          const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.OTHER;
          return {
            id: `a-${a.id}`,
            time: parseISO(a.startTime),
            end: parseISO(a.endTime),
            title: `${a.patient.firstName} ${a.patient.lastName}`,
            typeLabel: cfg.label,
            sub: a.provider,
            dot: cfg.dot,
            struck: a.status === "CANCELLED" || a.status === "NO_SHOW",
            open: () => onBlockClick(a),
          };
        }),
        ...gcal.map((e): ListRow => {
          const cfg = GCAL_TYPE_CONFIG[e.visitType];
          return {
            id: `g-${e.id}`,
            time: new Date(e.start),
            end: new Date(e.end),
            title: e.cleanTitle,
            typeLabel: cfg.label,
            sub: null,
            dot: e.noShow ? "bg-slate-300 dark:bg-slate-600" : cfg.dot,
            struck: e.noShow,
            open: () => onGcalBlockClick?.(e),
          };
        }),
      ].sort((x, y) => x.time.getTime() - y.time.getTime());
      return { day, rows };
    })
    .filter((s) => s.rows.length > 0);

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-12 text-center">
          <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No appointments this week</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {sections.map(({ day, rows }) => (
        <div key={day.toISOString()}>
          <div className={`flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 ${
            isToday(day) ? "bg-blue-50 dark:bg-blue-950/30" : "bg-slate-50 dark:bg-slate-800/60"
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                isToday(day) ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"
              }`}>
                {format(day, "EEEE, MMM d")}
              </span>
              {isToday(day) && (
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">
                  Today
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {rows.length} {rows.length === 1 ? "appointment" : "appointments"}
            </span>
          </div>
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={r.open}
              className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-[72px] flex-shrink-0">
                {format(r.time, "h:mm a")}
              </span>
              <span className={`w-1.5 h-8 rounded-full flex-shrink-0 ${r.dot}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  r.struck
                    ? "line-through text-slate-400 dark:text-slate-500"
                    : "text-slate-900 dark:text-slate-100"
                }`}>
                  {r.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {r.typeLabel}
                  {r.sub ? ` · ${r.sub}` : ""}
                  {` · ${format(r.time, "h:mm a")} – ${format(r.end, "h:mm a")}`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Classic day / week columns ───────────────────────────────────────────────

function ClassicDayColumn({
  day,
  appointments,
  gcalEvents,
  showGcal,
  nowTop,
  onSlotClick,
  onBlockClick,
  onGcalBlockClick,
  highlightToday,
  weekendMuted,
}: {
  day: Date;
  appointments: Appointment[];
  gcalEvents: EnrichedGCalEvent[];
  showGcal: boolean;
  nowTop: number | null;
  onSlotClick: (day: Date, slot: string) => void;
  onBlockClick: (appt: Appointment) => void;
  onGcalBlockClick?: (event: EnrichedGCalEvent) => void;
  highlightToday?: boolean;
  weekendMuted?: boolean;
}) {
  const dayAppts = appointments.filter((a) => isSameDay(parseISO(a.startTime), day));
  const dayGcal  = showGcal ? gcalEvents.filter((e) => isSameDay(new Date(e.start), day)) : [];
  const layoutItems = [
    ...dayAppts.map((a) => {
      const s = parseISO(a.startTime);
      const e = parseISO(a.endTime);
      return {
        id: `a-${a.id}`,
        startMin: s.getHours() * 60 + s.getMinutes() - DAY_START * 60,
        endMin: e.getHours() * 60 + e.getMinutes() - DAY_START * 60,
      };
    }),
    ...dayGcal.map((e) => {
      const s = new Date(e.start);
      const end = new Date(e.end);
      return {
        id: `g-${e.id}`,
        startMin: s.getHours() * 60 + s.getMinutes() - DAY_START * 60,
        endMin: end.getHours() * 60 + end.getMinutes() - DAY_START * 60,
      };
    }),
  ];
  const layout = computeLayout(layoutItems);

  return (
    <div
      className={`flex-1 min-w-[100px] border-l border-slate-200 dark:border-slate-700 relative ${
        highlightToday && isToday(day)
          ? "bg-blue-50/40 dark:bg-blue-950/10"
          : weekendMuted && (day.getDay() === 0 || day.getDay() === 6)
          ? "bg-slate-50/70 dark:bg-slate-800/20"
          : ""
      }`}
      style={{ height: TOTAL_HEIGHT }}
    >
      <SlotRows day={day} onSlotClick={onSlotClick} />
      <LunchOverlay weekdaysOnly={weekendMuted} day={day} />
      <NowIndicator show={isToday(day)} nowTop={nowTop} />
      {dayAppts.map((appt) => {
        const lv = layout.get(`a-${appt.id}`) ?? { col: 0, totalCols: 1 };
        return (
          <AppointmentBlock
            key={appt.id}
            appt={appt}
            col={lv.col}
            totalCols={lv.totalCols}
            onClick={() => onBlockClick(appt)}
          />
        );
      })}
      {dayGcal.map((e) => {
        const lv = layout.get(`g-${e.id}`) ?? { col: 0, totalCols: 1 };
        return (
          <GCalEventBlock
            key={e.id}
            event={e}
            col={lv.col}
            totalCols={lv.totalCols}
            onClick={() => onGcalBlockClick?.(e)}
          />
        );
      })}
      <OverflowChip
        layout={layout}
        apptIds={dayAppts.map((a) => `a-${a.id}`)}
        gcalIds={dayGcal.map((e) => `g-${e.id}`)}
      />
    </div>
  );
}

// ─── Advanced provider columns ────────────────────────────────────────────────

function AdvancedProviderGrid({
  appointments,
  gcalEvents,
  showGcal,
  slotDay,
  nowTop,
  onSlotClick,
  onBlockClick,
  onGcalBlockClick,
  headerSubtitle,
}: {
  appointments: Appointment[];
  gcalEvents: EnrichedGCalEvent[];
  showGcal: boolean;
  slotDay: Date;
  nowTop: number | null;
  onSlotClick: (day: Date, slot: string) => void;
  onBlockClick: (appt: Appointment) => void;
  onGcalBlockClick?: (event: EnrichedGCalEvent) => void;
  headerSubtitle?: string;
}) {
  const providers = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) set.add(providerKey(a.provider));
    const list = Array.from(set).sort((a, b) => {
      if (a === UNASSIGNED_PROVIDER) return 1;
      if (b === UNASSIGNED_PROVIDER) return -1;
      return a.localeCompare(b);
    });
    if (list.length === 0) list.push(UNASSIGNED_PROVIDER);
    return list;
  }, [appointments]);

  const gcalColumn = showGcal && gcalEvents.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
        <div className="w-16 flex-shrink-0" />
        {providers.map((provider) => {
          const count = appointments.filter((a) => providerKey(a.provider) === provider).length;
          return (
            <div
              key={provider}
              className="flex-1 min-w-[120px] text-center py-2.5 border-l border-slate-200 dark:border-slate-700 px-1"
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate" title={provider}>
                {provider}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {headerSubtitle ?? `${count} appt${count === 1 ? "" : "s"}`}
              </p>
            </div>
          );
        })}
        {gcalColumn && (
          <div className="flex-1 min-w-[120px] text-center py-2.5 border-l border-slate-200 dark:border-slate-700 px-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" />
              Google Cal
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {gcalEvents.length} event{gcalEvents.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: "780px" }}>
        <div className="flex min-w-max">
          <TimeLabelColumn />
          {providers.map((provider) => {
            const colAppts = appointments.filter((a) => providerKey(a.provider) === provider);
            const layoutItems = colAppts.map((a) => {
              const s = parseISO(a.startTime);
              const e = parseISO(a.endTime);
              return {
                id: `a-${a.id}`,
                startMin: s.getHours() * 60 + s.getMinutes() - DAY_START * 60,
                endMin: e.getHours() * 60 + e.getMinutes() - DAY_START * 60,
              };
            });
            const layout = computeLayout(layoutItems);

            return (
              <div
                key={provider}
                className="flex-1 min-w-[120px] border-l border-slate-200 dark:border-slate-700 relative"
                style={{ height: TOTAL_HEIGHT }}
              >
                <SlotRows day={slotDay} onSlotClick={onSlotClick} />
                <LunchOverlay />
                <NowIndicator show={isToday(slotDay)} nowTop={nowTop} />
                {colAppts.map((appt) => {
                  const lv = layout.get(`a-${appt.id}`) ?? { col: 0, totalCols: 1 };
                  return (
                    <AppointmentBlock
                      key={appt.id}
                      appt={appt}
                      col={lv.col}
                      totalCols={lv.totalCols}
                      onClick={() => onBlockClick(appt)}
                    />
                  );
                })}
                <OverflowChip
                  layout={layout}
                  apptIds={colAppts.map((a) => `a-${a.id}`)}
                  gcalIds={[]}
                />
              </div>
            );
          })}
          {gcalColumn && (() => {
            const layoutItems = gcalEvents.map((e) => {
              const s = new Date(e.start);
              const end = new Date(e.end);
              return {
                id: `g-${e.id}`,
                startMin: s.getHours() * 60 + s.getMinutes() - DAY_START * 60,
                endMin: end.getHours() * 60 + end.getMinutes() - DAY_START * 60,
              };
            });
            const layout = computeLayout(layoutItems);
            return (
              <div
                className="flex-1 min-w-[120px] border-l border-slate-200 dark:border-slate-700 relative bg-sky-50/30 dark:bg-sky-950/10"
                style={{ height: TOTAL_HEIGHT }}
              >
                <SlotRows day={slotDay} onSlotClick={onSlotClick} />
                <LunchOverlay />
                <NowIndicator show={isToday(slotDay)} nowTop={nowTop} />
                {gcalEvents.map((e) => {
                  const lv = layout.get(`g-${e.id}`) ?? { col: 0, totalCols: 1 };
                  return (
                    <GCalEventBlock
                      key={e.id}
                      event={e}
                      col={lv.col}
                      totalCols={lv.totalCols}
                      onClick={() => onGcalBlockClick?.(e)}
                    />
                  );
                })}
                <OverflowChip
                  layout={layout}
                  apptIds={[]}
                  gcalIds={gcalEvents.map((e) => `g-${e.id}`)}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Main CalendarGrid ────────────────────────────────────────────────────────

export function CalendarGrid({
  appointments,
  viewMode,
  variant = "classic",
  weekDays,
  selectedDay,
  nowTop,
  loading = false,
  showGcal = false,
  gcalEvents = [],
  onSlotClick,
  onBlockClick,
  onGcalBlockClick,
}: CalendarGridProps) {
  if (loading && appointments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 h-96 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <ClassicListView
        weekDays={weekDays}
        appointments={appointments}
        showGcal={showGcal}
        gcalEvents={gcalEvents}
        onBlockClick={onBlockClick}
        onGcalBlockClick={onGcalBlockClick}
      />
    );
  }

  // Advanced: one column per distinct provider (day = selected day; week = full week range)
  if (variant === "advanced") {
    const scopedAppts =
      viewMode === "day"
        ? appointments.filter((a) => isSameDay(parseISO(a.startTime), selectedDay))
        : appointments;
    const scopedGcal =
      viewMode === "day"
        ? gcalEvents.filter((e) => isSameDay(new Date(e.start), selectedDay))
        : gcalEvents;
    const slotDay =
      viewMode === "day"
        ? selectedDay
        : weekDays.find((d) => isToday(d)) ?? weekDays[0] ?? selectedDay;

    return (
      <AdvancedProviderGrid
        appointments={scopedAppts}
        gcalEvents={scopedGcal}
        showGcal={showGcal}
        slotDay={slotDay}
        nowTop={nowTop}
        onSlotClick={onSlotClick}
        onBlockClick={onBlockClick}
        onGcalBlockClick={onGcalBlockClick}
        headerSubtitle={
          viewMode === "day"
            ? format(selectedDay, "EEE, MMM d")
            : undefined
        }
      />
    );
  }

  // Classic day view
  if (viewMode === "day") {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="w-16 flex-shrink-0" />
          <div className="flex-1 text-center py-2.5 border-l border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{format(selectedDay, "EEEE")}</p>
            <div className={`mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${
              isToday(selectedDay) ? "bg-blue-600 text-white" : "text-slate-800 dark:text-slate-100"
            }`}>
              {format(selectedDay, "d")}
            </div>
          </div>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "780px" }}>
          <div className="flex">
            <TimeLabelColumn />
            <ClassicDayColumn
              day={selectedDay}
              appointments={appointments}
              gcalEvents={gcalEvents}
              showGcal={showGcal}
              nowTop={nowTop}
              onSlotClick={onSlotClick}
              onBlockClick={onBlockClick}
              onGcalBlockClick={onGcalBlockClick}
            />
          </div>
        </div>
      </div>
    );
  }

  // Classic week view
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="w-16 flex-shrink-0" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="flex-1 min-w-[100px] text-center py-2.5 border-l border-slate-200 dark:border-slate-700"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {format(day, "EEE")}
            </p>
            <div className={`mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${
              isToday(day) ? "bg-blue-600 text-white" : "text-slate-800 dark:text-slate-100"
            }`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "780px" }}>
        <div className="flex">
          <TimeLabelColumn />
          {weekDays.map((day) => (
            <ClassicDayColumn
              key={day.toISOString()}
              day={day}
              appointments={appointments}
              gcalEvents={gcalEvents}
              showGcal={showGcal}
              nowTop={nowTop}
              onSlotClick={onSlotClick}
              onBlockClick={onBlockClick}
              onGcalBlockClick={onGcalBlockClick}
              highlightToday
              weekendMuted
            />
          ))}
        </div>
      </div>
    </div>
  );
}
