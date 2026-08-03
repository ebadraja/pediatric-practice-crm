"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import AddAppointmentModal from "@/components/add-appointment-modal";
import { AddAppointmentDialog } from "@/components/add-appointment-dialog";
import {
  CalendarGrid,
  TYPE_CONFIG,
  GCAL_TYPE_CONFIG,
  TYPE_LABEL,
  parseGcal,
  type Appointment,
  type GCalEvent,
  type EnrichedGCalEvent,
  type GcalVisitType,
  type CalendarVariant,
} from "@/components/calendar-grid";

// ─── Status maps (detail dialog) ──────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:   "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  CONFIRMED:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  COMPLETED:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CANCELLED:   "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  NO_SHOW:     "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  RESCHEDULED: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled", CONFIRMED: "Confirmed", COMPLETED: "Completed",
  CANCELLED: "Cancelled", NO_SHOW: "No-show", RESCHEDULED: "Rescheduled",
};

// ─── GCalEventDetailDialog ────────────────────────────────────────────────────

function GCalEventDetailDialog({
  event,
  onClose,
}: {
  event: EnrichedGCalEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const start  = new Date(event.start);
  const end    = new Date(event.end);
  const durMin = Math.round((end.getTime() - start.getTime()) / 60_000);
  const cfg    = GCAL_TYPE_CONFIG[event.visitType];

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            {event.cleanTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {event.noShow && (
            <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 rounded-lg px-3 py-2">
              <Ban className="h-4 w-4 flex-shrink-0" />
              Marked as no-show
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Date & Time</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {format(start, "EEE, MMM d, yyyy")}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {format(start, "h:mm a")} – {format(end, "h:mm a")}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Visit Type</p>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.block} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Duration</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{durMin} min</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Source</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">Google Calendar</p>
            </div>
          </div>

          {event.summary !== event.cleanTitle && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Original event title</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 break-words">
                {event.summary}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(event.htmlLink, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Google Calendar
          </Button>
          <Button size="sm" className="ml-auto" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <Link
            href={`/patients/${appt.patientId}`}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            onClick={onClose}
          >
            <User className="h-3.5 w-3.5" />
            View Patient Record
            <ExternalLink className="h-3 w-3" />
          </Link>

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentWeek, setCurrentWeek]   = useState<Date>(() => new Date());
  const [viewMode, setViewMode]         = useState<"day" | "week" | "list">("week");
  const [calendarVariant, setCalendarVariant] = useState<CalendarVariant>("classic");
  const [activeCats, setActiveCats]     = useState<Set<string>>(new Set());
  const [hideNoShows, setHideNoShows]   = useState(false);
  const [selected, setSelected]         = useState<Appointment | null>(null);
  const [selectedGcal, setSelectedGcal] = useState<EnrichedGCalEvent | null>(null);
  const [newApptOpen, setNewApptOpen]   = useState(false);
  const [prefill, setPrefill]           = useState<{ date: string; time: string } | null>(null);
  const [editTarget, setEditTarget]     = useState<Appointment | null>(null);
  const [nowTop, setNowTop]             = useState<number | null>(null);
  const [selectedDay, setSelectedDay]   = useState<Date>(() => new Date());

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
  }, [weekStart, weekEnd]);

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
    const DAY_START = 8;
    const DAY_END = 17;
    const PX_PER_MIN = 52 / 30;
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

  // ── Enriched GCal events + type filtering ───────────────────────────────────

  const enrichedGcal = useMemo(
    () => gcalEvents.filter((e) => !e.allDay).map(parseGcal),
    [gcalEvents],
  );

  // Legend entries: only types actually present this week, with counts
  const legendEntries = useMemo(() => {
    const entries: Array<{ key: string; label: string; dot: string; count: number }> = [];
    (Object.keys(GCAL_TYPE_CONFIG) as GcalVisitType[]).forEach((t) => {
      const count = enrichedGcal.filter((e) => e.visitType === t).length;
      if (count > 0) entries.push({ key: `g:${t}`, label: GCAL_TYPE_CONFIG[t].label, dot: GCAL_TYPE_CONFIG[t].dot, count });
    });
    Object.entries(TYPE_CONFIG).forEach(([t, cfg]) => {
      const count = appointments.filter((a) => a.type === t).length;
      if (count > 0) entries.push({ key: `c:${t}`, label: cfg.label, dot: cfg.dot, count });
    });
    return entries;
  }, [enrichedGcal, appointments]);

  const toggleCat = useCallback((key: string) => {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const visibleAppts = useMemo(() => {
    let list = appointments;
    if (hideNoShows)        list = list.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW");
    if (activeCats.size > 0) list = list.filter((a) => activeCats.has(`c:${a.type}`));
    return list;
  }, [appointments, activeCats, hideNoShows]);

  const visibleGcal = useMemo(() => {
    let list = enrichedGcal;
    if (hideNoShows)        list = list.filter((e) => !e.noShow);
    if (activeCats.size > 0) list = list.filter((e) => activeCats.has(`g:${e.visitType}`));
    return list;
  }, [enrichedGcal, activeCats, hideNoShows]);

  // ── Stats (CRM + Google Calendar combined) ──────────────────────────────────

  const today = useMemo(() => new Date(), []);
  const todayCount = useMemo(
    () =>
      appointments.filter((a) => isSameDay(parseISO(a.startTime), today)).length +
      enrichedGcal.filter((e) => isSameDay(new Date(e.start), today)).length,
    [appointments, enrichedGcal, today],
  );
  const weekTotal = appointments.length + enrichedGcal.length;
  const noShowCount =
    appointments.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW").length +
    enrichedGcal.filter((e) => e.noShow).length;

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

  const navigateDay = useCallback((delta: number) => {
    setSelectedDay((d) => {
      const next = addDays(d, delta);
      setCurrentWeek(next);
      return next;
    });
  }, []);

  const editModalData = editTarget
    ? {
        id:               editTarget.id,
        patientName:      `${editTarget.patient.firstName} ${editTarget.patient.lastName}`,
        patientPhone:     editTarget.patient.phone ?? "",
        appointmentDate:  format(parseISO(editTarget.startTime), "yyyy-MM-dd"),
        appointmentTime:  format(parseISO(editTarget.startTime), "HH:mm"),
        appointmentType:  editTarget.type,
        duration:         editTarget.duration,
        provider:         editTarget.provider ?? "",
        reason:           editTarget.reason ?? "",
        notes:            editTarget.notes ?? "",
        status:           editTarget.status,
      }
    : prefill
    ? {
        ...{ patientName: "", patientPhone: "", appointmentType: "WELL_CHILD_VISIT", duration: 30, provider: "Dr. Jonathan Tamas", reason: "", notes: "", status: "SCHEDULED" },
        appointmentDate: prefill.date,
        appointmentTime: prefill.time,
      }
    : undefined;

  // ── Render ───────────────────────────────────────────────────────────────────

  const rangeLabel = viewMode === "day"
    ? format(selectedDay, "EEEE, MMM d, yyyy")
    : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

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
          {/* Day / Week / List */}
          <div className="hidden sm:flex border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800">
            {(["day", "week", "list"] as const).map((v) => (
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
          {/* Classic / Advanced layout */}
          <div className="hidden sm:flex border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800">
            {(["classic", "advanced"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setCalendarVariant(v)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  calendarVariant === v
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

      {/* ── Sub-header: Navigation ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="px-2 h-8"
            onClick={() => viewMode === "day" ? navigateDay(-1) : setCurrentWeek((w) => subWeeks(w, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-50 whitespace-nowrap min-w-[160px] text-center">
            {rangeLabel}
          </span>
          <Button variant="outline" size="sm" className="px-2 h-8"
            onClick={() => viewMode === "day" ? navigateDay(1) : setCurrentWeek((w) => addWeeks(w, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8"
            onClick={() => { setCurrentWeek(new Date()); setSelectedDay(new Date()); }}
          >
            <Calendar className="h-3.5 w-3.5" />
            Today
          </Button>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {legendEntries.map(({ key, label, dot, count }) => {
            const active = activeCats.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleCat(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                {label}
                <span className={active ? "opacity-70" : "opacity-50"}>{count}</span>
              </button>
            );
          })}
          <button
            onClick={() => setHideNoShows((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              hideNoShows
                ? "bg-orange-100 dark:bg-orange-950/50 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500"
            }`}
          >
            <Ban className="w-3 h-3" />
            {hideNoShows ? "No-shows hidden" : "Hide no-shows"}
          </button>
          {activeCats.size > 0 && (
            <button
              onClick={() => setActiveCats(new Set())}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile / Tablet list ───────────────────────────────────────────────── */}
      <div className="lg:hidden space-y-4">
        <Card>
          <CardHeader className="pb-3 px-4 py-4">
            <CardTitle className="text-base">This Week&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (() => {
              type MobileRow = {
                id: string;
                time: Date;
                title: string;
                typeLabel: string;
                sub: string | null;
                dot: string;
                struck: boolean;
                durationLabel: string;
                open: () => void;
              };
              const sections = weekDays
                .map((day) => {
                  const crm  = visibleAppts.filter((a) => isSameDay(parseISO(a.startTime), day));
                  const gcal = showGcal ? visibleGcal.filter((e) => isSameDay(new Date(e.start), day)) : [];
                  const rows: MobileRow[] = [
                    ...crm.map((a): MobileRow => {
                      const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.OTHER;
                      return {
                        id: `a-${a.id}`,
                        time: parseISO(a.startTime),
                        title: `${a.patient.firstName} ${a.patient.lastName}`,
                        typeLabel: cfg.label,
                        sub: a.provider,
                        dot: cfg.dot,
                        struck: a.status === "CANCELLED" || a.status === "NO_SHOW",
                        durationLabel: `${a.duration} min`,
                        open: () => setSelected(a),
                      };
                    }),
                    ...gcal.map((e): MobileRow => {
                      const cfg = GCAL_TYPE_CONFIG[e.visitType];
                      const durMin = Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60_000);
                      return {
                        id: `g-${e.id}`,
                        time: new Date(e.start),
                        title: e.cleanTitle,
                        typeLabel: cfg.label,
                        sub: "Google Calendar",
                        dot: e.noShow ? "bg-slate-300 dark:bg-slate-600" : cfg.dot,
                        struck: e.noShow,
                        durationLabel: `${durMin} min`,
                        open: () => setSelectedGcal(e),
                      };
                    }),
                  ].sort((x, y) => x.time.getTime() - y.time.getTime());
                  return { day, rows };
                })
                .filter((s) => s.rows.length > 0);

              if (sections.length === 0) {
                return (
                  <p className="text-sm text-slate-500 text-center py-6">
                    No appointments this week
                  </p>
                );
              }

              return (
                <div className="space-y-5">
                  {sections.map(({ day, rows }) => (
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
                        {rows.map((r) => (
                          <div
                            key={r.id}
                            onClick={r.open}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              r.struck
                                ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-60"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${r.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium truncate ${
                                  r.struck
                                    ? "line-through text-slate-400 dark:text-slate-600"
                                    : "text-slate-900 dark:text-slate-100"
                                }`}>
                                  {r.title}
                                </p>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                                  {format(r.time, "h:mm a")}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {r.typeLabel} · {r.sub ?? "—"} · {r.durationLabel}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Today",     value: todayCount, color: "text-slate-900 dark:text-slate-50" },
            { label: "This Week", value: weekTotal,  color: "text-slate-900 dark:text-slate-50" },
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
          <CalendarGrid
            appointments={visibleAppts}
            viewMode={viewMode}
            variant={calendarVariant}
            weekStart={weekStart}
            weekEnd={weekEnd}
            weekDays={weekDays}
            selectedDay={selectedDay}
            nowTop={nowTop}
            loading={loading}
            showGcal={showGcal}
            gcalEvents={visibleGcal}
            onSlotClick={handleSlotClick}
            onBlockClick={setSelected}
            onGcalBlockClick={setSelectedGcal}
          />
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
                { label: "Today",              value: todayCount,  icon: Clock },
                { label: "Total",              value: weekTotal,   icon: Calendar },
                { label: "No-show / Cancelled", value: noShowCount, icon: Ban },
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

          {/* Visit types — interactive legend / filter */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Visit Types
                </CardTitle>
                {activeCats.size > 0 && (
                  <button
                    onClick={() => setActiveCats(new Set())}
                    className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Click a type to filter the calendar</p>
            </CardHeader>
            <CardContent className="px-2 pb-3 space-y-0.5">
              {legendEntries.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                  No appointments this week
                </p>
              ) : (
                legendEntries.map(({ key, label, dot, count }) => {
                  const active = activeCats.has(key);
                  const dimmed = activeCats.size > 0 && !active;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCat(key)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left ${
                        active
                          ? "bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200 dark:ring-blue-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      } ${dimmed ? "opacity-40" : ""}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1">{label}</span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">
                        {count}
                      </span>
                    </button>
                  );
                })
              )}
              <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-300 dark:bg-slate-600" />
                  <span className="text-xs text-slate-500 dark:text-slate-500">Cancelled / No-show</span>
                </div>
                {gcalConnected && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-2.5 h-2.5 flex-shrink-0 text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Google Calendar</span>
                    <button
                      onClick={() => setShowGcal((v) => !v)}
                      className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium ${showGcal ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                    >
                      {showGcal ? 'On' : 'Off'}
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's upcoming list */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Today&apos;s Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
              ) : (() => {
                const crmUpcoming = appointments
                  .filter((a) =>
                    isSameDay(parseISO(a.startTime), today) &&
                    !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(a.status)
                  )
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                const gcalUpcoming = showGcal
                  ? enrichedGcal
                      .filter((e) => !e.noShow && isSameDay(new Date(e.start), today))
                      .sort((a, b) => a.start.localeCompare(b.start))
                  : [];

                type UpcomingItem =
                  | { kind: "crm"; appt: (typeof crmUpcoming)[0] }
                  | { kind: "gcal"; event: EnrichedGCalEvent };

                const merged: UpcomingItem[] = [
                  ...crmUpcoming.map((appt): UpcomingItem => ({ kind: "crm", appt })),
                  ...gcalUpcoming.map((event): UpcomingItem => ({ kind: "gcal", event })),
                ]
                  .sort((a, b) => {
                    const ta = a.kind === "crm" ? a.appt.startTime : a.event.start;
                    const tb = b.kind === "crm" ? b.appt.startTime : b.event.start;
                    return ta.localeCompare(tb);
                  })
                  .slice(0, 5);

                return merged.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                    No upcoming appointments
                  </p>
                ) : (
                  <div className="space-y-2">
                    {merged.map((item) => {
                      if (item.kind === "crm") {
                        const cfg = TYPE_CONFIG[item.appt.type] ?? TYPE_CONFIG.OTHER;
                        return (
                          <button
                            key={`crm-${item.appt.id}`}
                            onClick={() => setSelected(item.appt)}
                            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                                {item.appt.patient.firstName} {item.appt.patient.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {format(parseISO(item.appt.startTime), "h:mm a")} · {cfg.label}
                              </p>
                            </div>
                          </button>
                        );
                      }
                      const gcfg = GCAL_TYPE_CONFIG[item.event.visitType];
                      const gcalEvent = item.event;
                      return (
                        <button
                          key={`gcal-${gcalEvent.id}`}
                          onClick={() => setSelectedGcal(gcalEvent)}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${gcfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                              {item.event.cleanTitle}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {format(new Date(item.event.start), "h:mm a")} · {gcfg.label}
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

      {/* ── Google Calendar event detail dialog ───────────────────────────────── */}
      <GCalEventDetailDialog
        event={selectedGcal}
        onClose={() => setSelectedGcal(null)}
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
