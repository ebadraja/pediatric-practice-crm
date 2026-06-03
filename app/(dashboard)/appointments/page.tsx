"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isToday,
  isSameDay,
  parseISO,
} from "date-fns";
import Link from "next/link";
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  User, ExternalLink, Edit2, Ban, RefreshCw, Loader2,
} from "lucide-react";

// ─── Google Calendar event type ───────────────────────────────────────────────

interface GCalEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string;
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import AddAppointmentModal from "@/components/add-appointment-modal";
import { AddAppointmentDialog } from "@/components/add-appointment-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  firstName: string;
  lastName: string;
  phone: string | null;
}

interface Appointment {
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

// ─── Grid constants ───────────────────────────────────────────────────────────

const SLOT_HEIGHT  = 40;   // px per 30-min slot
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

// ─── Styling maps ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { block: string; text: string; dot: string; label: string }> = {
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

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:   "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  CONFIRMED:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  COMPLETED:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CANCELLED:   "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  NO_SHOW:     "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  RESCHEDULED: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label])
);

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled", CONFIRMED: "Confirmed", COMPLETED: "Completed",
  CANCELLED: "Cancelled", NO_SHOW: "No-show", RESCHEDULED: "Rescheduled",
};

// ─── AppointmentBlock ─────────────────────────────────────────────────────────

function AppointmentBlock({
  appt,
  onClick,
}: {
  appt: Appointment;
  onClick: () => void;
}) {
  const start      = parseISO(appt.startTime);
  const topMin     = start.getHours() * 60 + start.getMinutes() - DAY_START * 60;
  const top        = topMin * PX_PER_MIN;
  const height     = Math.max(appt.duration * PX_PER_MIN, 22);
  const cfg        = TYPE_CONFIG[appt.type] ?? TYPE_CONFIG.OTHER;
  const isCancelled = appt.status === "CANCELLED" || appt.status === "NO_SHOW";
  const isCompleted = appt.status === "COMPLETED";

  if (top < 0 || top >= TOTAL_HEIGHT) return null;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ top, height, position: "absolute", left: 3, right: 3, zIndex: 10 }}
      className={`rounded-md px-2 py-0.5 cursor-pointer border transition-all hover:brightness-95 hover:shadow-sm select-none overflow-hidden
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

function GCalEventBlock({ event }: { event: GCalEvent }) {
  if (event.allDay) return null;

  const start   = new Date(event.start);
  const end     = new Date(event.end);
  const topMin  = start.getHours() * 60 + start.getMinutes() - DAY_START * 60;
  const durMin  = Math.max((end.getTime() - start.getTime()) / 60_000, 15);
  const top     = topMin * PX_PER_MIN;
  const height  = Math.max(durMin * PX_PER_MIN, 18);

  if (top < 0 || top >= TOTAL_HEIGHT) return null;

  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noopener noreferrer"
      style={{ top, height, position: "absolute", left: 3, right: 3, zIndex: 8 }}
      className="rounded-md px-2 py-0.5 border border-blue-300 dark:border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 overflow-hidden cursor-pointer hover:brightness-95 transition-all select-none"
      title={`Google Calendar: ${event.summary}`}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 truncate leading-tight">
        <span className="mr-0.5 opacity-60">G</span>{event.summary}
      </p>
      {height > 28 && (
        <p className="text-[9px] text-blue-600 dark:text-blue-400 opacity-80 truncate">
          {format(start, "h:mm a")}
        </p>
      )}
    </a>
  );
}

// ─── AppointmentDetailDialog ──────────────────────────────────────────────────

function AppointmentDetailDialog({
  appt,
  onClose,
  onCancelled,
  onEdit,
}: {
  appt: Appointment | null;
  onClose: () => void;
  onCancelled: () => void;
  onEdit: (appt: Appointment) => void;
}) {
  const [cancelling, setCancelling] = useState(false);

  if (!appt) return null;

  const start = parseISO(appt.startTime);
  const end   = parseISO(appt.endTime);
  const cfg   = TYPE_CONFIG[appt.type] ?? TYPE_CONFIG.OTHER;
  const statusClass = STATUS_BADGE[appt.status] ?? "";
  const isCancellable = !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appt.status);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        onCancelled();
        onClose();
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={!!appt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            {appt.patient.firstName} {appt.patient.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Patient link */}
          <Link
            href={`/patients/${appt.patientId}`}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            onClick={onClose}
          >
            <User className="h-3.5 w-3.5" />
            View Patient Record
            <ExternalLink className="h-3 w-3" />
          </Link>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Date & Time</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {format(start, "EEE, MMM d")}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {format(start, "h:mm a")} – {format(end, "h:mm a")}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusClass}`}>
                {STATUS_LABEL[appt.status] ?? appt.status}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Type</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {TYPE_LABEL[appt.type] ?? appt.type}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Duration</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {appt.duration} min
              </p>
            </div>

            {appt.provider && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Provider</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{appt.provider}</p>
              </div>
            )}
          </div>

          {appt.reason && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Reason for visit</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                {appt.reason}
              </p>
            </div>
          )}

          {appt.notes && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                {appt.notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          {isCancellable && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 gap-1.5"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Cancel
            </Button>
          )}
          {isCancellable && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { onEdit(appt); onClose(); }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reschedule
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 ml-auto"
            onClick={() => { onEdit(appt); onClose(); }}
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter pill helper ───────────────────────────────────────────────────────

function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
      {options.map(({ value: v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
            value === v
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PROVIDER_FILTERS = [
  { value: "all",             label: "All" },
  { value: "Dr. Tamas",       label: "Dr. Tamas" },
  { value: "Dr. Richards",    label: "Dr. Richards" },
  { value: "Nurse Jennifer",  label: "Nurse" },
];

const TYPE_FILTERS = [
  { value: "all",              label: "All Types" },
  { value: "WELL_CHILD_VISIT", label: "Well-child" },
  { value: "SICK_VISIT",       label: "Sick Visit" },
  { value: "VACCINATION",      label: "Vaccination" },
  { value: "FOLLOW_UP",        label: "Follow-up" },
];

const STATUS_FILTERS = [
  { value: "all",        label: "All" },
  { value: "SCHEDULED",  label: "Scheduled" },
  { value: "CONFIRMED",  label: "Confirmed" },
  { value: "COMPLETED",  label: "Completed" },
  { value: "CANCELLED",  label: "Cancelled" },
];

const LEGEND = [
  { type: "WELL_CHILD_VISIT", label: "Well-child" },
  { type: "SICK_VISIT",       label: "Sick Visit" },
  { type: "VACCINATION",      label: "Vaccination" },
  { type: "FOLLOW_UP",        label: "Follow-up" },
  { type: "CONSULTATION",     label: "Consultation" },
  { type: "PROCEDURE",        label: "Procedure" },
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentWeek, setCurrentWeek]   = useState<Date>(() => new Date());
  const [viewMode, setViewMode]         = useState<"day" | "week" | "month">("week");
  const [filters, setFilters]           = useState({ provider: "all", type: "all", status: "all" });
  const [selected, setSelected]         = useState<Appointment | null>(null);
  const [newApptOpen, setNewApptOpen]   = useState(false);
  const [prefill, setPrefill]           = useState<{ date: string; time: string } | null>(null);
  const [editTarget, setEditTarget]     = useState<Appointment | null>(null);
  const [nowTop, setNowTop]             = useState<number | null>(null);

  // Google Calendar overlay
  const [gcalEvents, setGcalEvents]         = useState<GCalEvent[]>([]);
  const [gcalEnabled, setGcalEnabled]       = useState(false);
  const [gcalConnected, setGcalConnected]   = useState(false);
  const [showGcal, setShowGcal]             = useState(false);
  const [gcalLoading, setGcalLoading]       = useState(false);

  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekEnd   = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekDays  = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate:   weekEnd.toISOString(),
        limit:     "200",
        page:      "1",
      });
      if (filters.provider !== "all") p.set("provider", filters.provider);
      if (filters.type     !== "all") p.set("type",     filters.type);
      if (filters.status   !== "all") p.set("status",   filters.status);

      const res = await fetch(`/api/appointments?${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAppointments(json.data ?? []);
    } catch (err) {
      console.error("[appointments/page] fetch failed", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, filters.provider, filters.type, filters.status]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Google Calendar ─────────────────────────────────────────────────────────

  // On mount: check if GCal is enabled in settings
  useEffect(() => {
    fetch('/api/settings/google-calendar')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setGcalConnected(d.connected);
          setGcalEnabled(d.enabled);
          if (d.connected && d.enabled) setShowGcal(true);
        }
      })
      .catch(() => {/* silent */});
  }, []);

  // Fetch GCal events whenever the toggle is on and the week changes
  useEffect(() => {
    if (!showGcal) { setGcalEvents([]); return; }
    setGcalLoading(true);
    const params = new URLSearchParams({
      timeMin: weekStart.toISOString(),
      timeMax: weekEnd.toISOString(),
    });
    fetch(`/api/google-calendar/events?${params}`)
      .then((r) => r.ok ? r.json() : { events: [] })
      .then((d) => setGcalEvents(d.events ?? []))
      .catch(() => setGcalEvents([]))
      .finally(() => setGcalLoading(false));
  }, [showGcal, weekStart, weekEnd]);

  // ── Current-time indicator ──────────────────────────────────────────────────

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h   = now.getHours();
      const m   = now.getMinutes();
      setNowTop(h >= DAY_START && h < DAY_END
        ? (h * 60 + m - DAY_START * 60) * PX_PER_MIN
        : null);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const today = useMemo(() => new Date(), []);
  const todayCount = useMemo(
    () => appointments.filter((a) => isSameDay(parseISO(a.startTime), today)).length,
    [appointments, today],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSlotClick = (day: Date, slot: string) => {
    const [h, m] = slot.split(":").map(Number);
    if (h * 60 + m >= 12 * 60 && h * 60 + m < 13 * 60) return; // lunch
    setPrefill({ date: format(day, "yyyy-MM-dd"), time: slot });
    setEditTarget(null);
    setNewApptOpen(true);
  };

  const handleEdit = (appt: Appointment) => {
    setEditTarget(appt);
    setPrefill(null);
    setNewApptOpen(true);
  };

  const handleSaved = () => {
    setNewApptOpen(false);
    setEditTarget(null);
    setPrefill(null);
    fetchAppointments();
  };

  const editModalData = editTarget
    ? {
        id:               editTarget.id,
        patientName:      `${editTarget.patient.firstName} ${editTarget.patient.lastName}`,
        patientPhone:     editTarget.patient.phone ?? "",
        appointmentDate:  format(parseISO(editTarget.startTime), "yyyy-MM-dd"),
        appointmentTime:  format(parseISO(editTarget.startTime), "HH:mm"),
        appointmentType:  editTarget.type.toLowerCase().replace(/_/g, "-"),
        provider:         editTarget.provider ?? "",
        reason:           editTarget.reason ?? "",
        notes:            editTarget.notes ?? "",
        status:           editTarget.status.toLowerCase() as "scheduled" | "confirmed" | "cancelled" | "completed",
      }
    : prefill
    ? {
        ...{ patientName: "", patientPhone: "", appointmentType: "checkup", provider: "Dr. Tamas", reason: "", notes: "", status: "scheduled" as const },
        appointmentDate: prefill.date,
        appointmentTime: prefill.time,
      }
    : undefined;

  // ── Render ───────────────────────────────────────────────────────────────────

  const rangeLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="pt-4 pb-8 space-y-5 md:space-y-8">

      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
            Appointments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Manage all patient appointments and schedules
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* View toggle */}
          <div className="hidden sm:flex border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === v
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {gcalConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGcal((v) => !v)}
              className={`gap-1.5 h-9 text-xs border ${showGcal ? 'border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'dark:border-slate-600 dark:text-slate-300'}`}
              title={showGcal ? 'Hide Google Calendar events' : 'Show Google Calendar events'}
            >
              {gcalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Google Cal</span>
            </Button>
          )}
          <Button
            onClick={() => { setPrefill(null); setEditTarget(null); setNewApptOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 md:h-10 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">New </span>Appointment
          </Button>
        </div>
      </div>

      {/* ── Sub-header: Navigation & Filters ──────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="px-2 h-8"
            onClick={() => setCurrentWeek((w) => subWeeks(w, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-50 whitespace-nowrap min-w-[160px] text-center">
            {rangeLabel}
          </span>
          <Button variant="outline" size="sm" className="px-2 h-8"
            onClick={() => setCurrentWeek((w) => addWeeks(w, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8"
            onClick={() => setCurrentWeek(new Date())}
          >
            <Calendar className="h-3.5 w-3.5" />
            Today
          </Button>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          <FilterPills options={PROVIDER_FILTERS} value={filters.provider}
            onChange={(v) => setFilters((f) => ({ ...f, provider: v }))} />
          <FilterPills options={TYPE_FILTERS}     value={filters.type}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))} />
          <FilterPills options={STATUS_FILTERS}   value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
        </div>
      </div>

      {/* ── Mobile / Tablet list ───────────────────────────────────────────────── */}
      <div className="lg:hidden space-y-4">
        <Card>
          <CardHeader className="pb-3 px-4 py-4">
            <CardTitle className="text-base">This Week's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No appointments match the current filters
              </p>
            ) : (
              <div className="space-y-5">
                {weekDays.map((day) => {
                  const dayAppts = appointments
                    .filter((a) => isSameDay(parseISO(a.startTime), day))
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  if (dayAppts.length === 0) return null;
                  return (
                    <div key={day.toISOString()}>
                      <div className={`flex items-center gap-2 mb-2.5 pb-1.5 border-b ${
                        isToday(day) ? "border-blue-200 dark:border-blue-800" : "border-slate-100 dark:border-slate-800"
                      }`}>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          isToday(day) ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                        }`}>
                          {format(day, "EEE, MMM d")}
                        </span>
                        {isToday(day) && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {dayAppts.map((appt) => {
                          const start = parseISO(appt.startTime);
                          const cfg   = TYPE_CONFIG[appt.type] ?? TYPE_CONFIG.OTHER;
                          const isCancelled = appt.status === "CANCELLED" || appt.status === "NO_SHOW";
                          return (
                            <div
                              key={appt.id}
                              onClick={() => setSelected(appt)}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isCancelled
                                  ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-60"
                                  : appt.status === "COMPLETED"
                                  ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${cfg.dot}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-sm font-medium truncate ${
                                    isCancelled
                                      ? "line-through text-slate-400 dark:text-slate-600"
                                      : "text-slate-900 dark:text-slate-100"
                                  }`}>
                                    {appt.patient.firstName} {appt.patient.lastName}
                                  </p>
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                                    {format(start, "h:mm a")}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {cfg.label} · {appt.provider ?? "—"} · {appt.duration} min
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Today",     value: todayCount,           color: "text-slate-900 dark:text-slate-50" },
            { label: "This Week", value: appointments.length,  color: "text-slate-900 dark:text-slate-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4 px-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Desktop: Week Grid + Sidebar ───────────────────────────────────────── */}
      <div className="hidden lg:grid grid-cols-4 gap-6">

        {/* Calendar — 3 cols */}
        <div className="lg:col-span-3">
          {loading && appointments.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 h-96 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">

              {/* Day-header row */}
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
                    <p className={`text-base font-semibold mt-0.5 ${
                      isToday(day)
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-800 dark:text-slate-100"
                    }`}>
                      {format(day, "d")}
                    </p>
                    {isToday(day) && (
                      <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                ))}
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto" style={{ maxHeight: "620px" }}>
                <div className="flex">

                  {/* Time labels */}
                  <div className="w-16 flex-shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
                    {TIME_SLOTS.map((slot, i) => (
                      <div
                        key={slot}
                        style={{ position: "absolute", top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                        className="w-full flex items-start justify-end pr-2.5"
                      >
                        {i % 2 === 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2 font-medium">
                            {format(new Date(0, 0, 0, ...slot.split(":").map(Number)), "h a")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dayAppts = appointments.filter((a) =>
                      isSameDay(parseISO(a.startTime), day)
                    );

                    return (
                      <div
                        key={day.toISOString()}
                        className="flex-1 min-w-[100px] border-l border-slate-200 dark:border-slate-700 relative"
                        style={{ height: TOTAL_HEIGHT }}
                      >
                        {/* Clickable slot rows */}
                        {TIME_SLOTS.map((slot, i) => {
                          const [h, m] = slot.split(":").map(Number);
                          const isLunch = h * 60 + m >= 12 * 60 && h * 60 + m < 13 * 60;
                          return (
                            <div
                              key={slot}
                              onClick={() => !isLunch && handleSlotClick(day, slot)}
                              style={{
                                position: "absolute",
                                top:      i * SLOT_HEIGHT,
                                height:   SLOT_HEIGHT,
                                left: 0, right: 0,
                              }}
                              className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                                isLunch
                                  ? "cursor-default"
                                  : "cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                              }`}
                            />
                          );
                        })}

                        {/* Lunch break overlay */}
                        <div
                          style={{
                            position: "absolute",
                            top:    LUNCH_TOP,
                            height: LUNCH_HEIGHT,
                            left: 0, right: 0,
                            zIndex: 5,
                          }}
                          className="bg-slate-50/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700 pointer-events-none flex items-center justify-center"
                        >
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">
                            Lunch
                          </span>
                        </div>

                        {/* Current-time indicator */}
                        {isToday(day) && nowTop !== null && (
                          <div
                            style={{ position: "absolute", top: nowTop, left: 0, right: 0, zIndex: 20 }}
                            className="flex items-center pointer-events-none"
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 flex-shrink-0 shadow-sm" />
                            <div className="flex-1 h-px bg-red-500" />
                          </div>
                        )}

                        {/* Appointment blocks */}
                        {dayAppts.map((appt) => (
                          <AppointmentBlock
                            key={appt.id}
                            appt={appt}
                            onClick={() => setSelected(appt)}
                          />
                        ))}

                        {/* Google Calendar events */}
                        {showGcal && gcalEvents
                          .filter((e) => !e.allDay && isSameDay(new Date(e.start), day))
                          .map((e) => <GCalEventBlock key={e.id} event={e} />)
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">

          {/* Stats */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { label: "Today",         value: todayCount,          icon: Clock },
                { label: "Total",         value: appointments.length, icon: Calendar },
                { label: "Completed",
                  value: appointments.filter((a) => a.status === "COMPLETED").length,
                  icon: User },
                { label: "Cancelled",
                  value: appointments.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW").length,
                  icon: Ban },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {loading ? "…" : value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Color legend */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Appointment Types
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {LEGEND.map(({ type, label }) => (
                <div key={type} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TYPE_CONFIG[type].dot}`} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
                </div>
              ))}
              {gcalConnected && (
                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-blue-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Google Calendar</span>
                  <button
                    onClick={() => setShowGcal((v) => !v)}
                    className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium ${showGcal ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                  >
                    {showGcal ? 'On' : 'Off'}
                  </button>
                </div>
              )}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-300 dark:bg-slate-600" />
                  <span className="text-xs text-slate-500 dark:text-slate-500">Cancelled / No-show</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's upcoming list */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Today's Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
              ) : (() => {
                const upcoming = appointments
                  .filter((a) =>
                    isSameDay(parseISO(a.startTime), today) &&
                    !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(a.status)
                  )
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .slice(0, 4);
                return upcoming.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                    No upcoming appointments
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.map((appt) => {
                      const cfg = TYPE_CONFIG[appt.type] ?? TYPE_CONFIG.OTHER;
                      return (
                        <button
                          key={appt.id}
                          onClick={() => setSelected(appt)}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                              {appt.patient.firstName} {appt.patient.lastName}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {format(parseISO(appt.startTime), "h:mm a")} · {cfg.label}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Appointment detail dialog ──────────────────────────────────────────── */}
      <AppointmentDetailDialog
        appt={selected}
        onClose={() => setSelected(null)}
        onCancelled={fetchAppointments}
        onEdit={handleEdit}
      />

      {/* ── New appointment dialog ────────────────────────────────────────────── */}
      {!editTarget && (
        <AddAppointmentDialog
          isOpen={newApptOpen && !editTarget}
          onClose={() => { setNewApptOpen(false); setPrefill(null); }}
          onSuccess={fetchAppointments}
          defaultDate={prefill ? new Date(prefill.date + "T00:00:00") : undefined}
        />
      )}

      {/* ── Edit / Reschedule modal (existing) ────────────────────────────────── */}
      {editTarget && (
        <AddAppointmentModal
          open={newApptOpen && !!editTarget}
          onOpenChange={(o) => {
            if (!o) { setNewApptOpen(false); setEditTarget(null); setPrefill(null); }
          }}
          appointment={editModalData}
          onAppointmentSaved={handleSaved}
        />
      )}
    </div>
  );
}
