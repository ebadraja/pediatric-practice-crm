"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import AddAppointmentModal from "@/components/add-appointment-modal";

interface Appointment {
  id: string;
  time: string; // "09:00", "14:30", etc.
  duration: number; // minutes
  patientName: string;
  type: "well-child" | "sick" | "vaccination" | "follow-up";
  provider: string;
  status: "completed" | "upcoming" | "cancelled";
  day: number; // 0-6 for Mon-Sun
}

const appointments: Appointment[] = [
  { id: "1", time: "09:00", duration: 30, patientName: "Emma Wilson", type: "well-child", provider: "Dr. Tamas", status: "completed", day: 0 },
  { id: "2", time: "09:45", duration: 30, patientName: "Lucas Brown", type: "sick", provider: "Dr. Tamas", status: "completed", day: 0 },
  { id: "3", time: "10:30", duration: 30, patientName: "Olivia Davis", type: "vaccination", provider: "Nurse Jennifer", status: "completed", day: 0 },
  { id: "4", time: "02:00", duration: 45, patientName: "Noah Martinez", type: "follow-up", provider: "Dr. Richards", status: "upcoming", day: 0 },
  { id: "5", time: "03:00", duration: 30, patientName: "Ava Thompson", type: "sick", provider: "Dr. Tamas", status: "cancelled", day: 0 },
  
  { id: "6", time: "08:30", duration: 30, patientName: "Ethan Garcia", type: "well-child", provider: "Dr. Richards", status: "upcoming", day: 1 },
  { id: "7", time: "09:30", duration: 30, patientName: "Mia Rodriguez", type: "vaccination", provider: "Nurse Jennifer", status: "upcoming", day: 1 },
  { id: "8", time: "11:00", duration: 45, patientName: "Liam Johnson", type: "sick", provider: "Dr. Tamas", status: "upcoming", day: 1 },
  { id: "9", time: "02:30", duration: 30, patientName: "Sophia Lee", type: "follow-up", provider: "Dr. Richards", status: "upcoming", day: 1 },
  
  { id: "10", time: "10:00", duration: 30, patientName: "Mason Chen", type: "well-child", provider: "Dr. Tamas", status: "upcoming", day: 2 },
  { id: "11", time: "11:00", duration: 30, patientName: "Isabella Moore", type: "sick", provider: "Dr. Richards", status: "upcoming", day: 2 },
  { id: "12", time: "03:00", duration: 30, patientName: "Jacob Taylor", type: "vaccination", provider: "Nurse Jennifer", status: "upcoming", day: 2 },
  
  { id: "13", time: "09:00", duration: 45, patientName: "Charlotte Anderson", type: "follow-up", provider: "Dr. Tamas", status: "upcoming", day: 3 },
  { id: "14", time: "10:30", duration: 30, patientName: "Amelia Thomas", type: "sick", provider: "Dr. Richards", status: "upcoming", day: 3 },
  { id: "15", time: "02:00", duration: 30, patientName: "Benjamin White", type: "well-child", provider: "Dr. Tamas", status: "upcoming", day: 3 },
  { id: "16", time: "03:30", duration: 30, patientName: "Harper Martinez", type: "vaccination", provider: "Nurse Jennifer", status: "upcoming", day: 3 },
  
  { id: "17", time: "08:30", duration: 30, patientName: "Elijah Jackson", type: "well-child", provider: "Dr. Richards", status: "upcoming", day: 4 },
  { id: "18", time: "02:00", duration: 45, patientName: "Abigail Martinez", type: "sick", provider: "Dr. Tamas", status: "upcoming", day: 4 },
  { id: "19", time: "04:00", duration: 30, patientName: "Michael Garcia", type: "follow-up", provider: "Dr. Richards", status: "upcoming", day: 4 },
];

const getDayName = (index: number) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days[index];
};

const getDayDate = (index: number) => {
  // January 13-19, 2026
  return 13 + index;
};

const getAppointmentColor = (type: string) => {
  switch (type) {
    case "well-child":
      return "bg-blue-500";
    case "sick":
      return "bg-green-500";
    case "vaccination":
      return "bg-purple-500";
    case "follow-up":
      return "bg-orange-500";
    default:
      return "bg-slate-500";
  }
};

const getAppointmentTypeLabel = (type: string) => {
  switch (type) {
    case "well-child":
      return "Well-child";
    case "sick":
      return "Sick visit";
    case "vaccination":
      return "Vaccination";
    case "follow-up":
      return "Follow-up";
    default:
      return type;
  }
};

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

const timeToPixels = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes - 8 * 60; // 8 AM is the start
  return totalMinutes * 1.5; // 1.5px per minute
};

const getTodayAppointments = () => {
  return appointments
    .filter((apt) => apt.day === 1) // Tuesday is "today" for this week
    .sort((a, b) => a.time.localeCompare(b.time));
};

export default function AppointmentsPage() {
  const [viewType, setViewType] = useState<"day" | "week" | "month">("week");
  const [provider, setProvider] = useState("all");
  const [appointmentType, setAppointmentType] = useState("all");
  const [status, setStatus] = useState("all");
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);

  // Filter appointments based on selected filters
  const filteredAppointments = appointments.filter((apt) => {
    const matchesProvider = provider === "all" || 
      (provider === "tamas" && apt.provider === "Dr. Tamas") ||
      (provider === "richards" && apt.provider === "Dr. Richards") ||
      (provider === "jennifer" && apt.provider === "Nurse Jennifer");
    
    const matchesType = appointmentType === "all" || apt.type === appointmentType;
    
    const matchesStatus = status === "all" || apt.status === status;
    
    return matchesProvider && matchesType && matchesStatus;
  });

  const getTodayFilteredAppointments = () => {
    return filteredAppointments
      .filter((apt) => apt.day === 1) // Tuesday is "today"
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const todayAppointments = getTodayFilteredAppointments();
  const weekStats = {
    today: filteredAppointments.filter((apt) => apt.day === 1).length,
    week: filteredAppointments.length,
    noShows: filteredAppointments.filter((apt) => apt.status === "cancelled").length,
  };

  return (
    <div className="pt-4 pb-8 space-y-5 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Appointments</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Manage all patient appointments and schedules</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* View Toggle - hidden on mobile */}
          <div className="hidden sm:flex border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800">
            {["day", "week", "month"].map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type as "day" | "week" | "month")}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewType === type
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={() => setNewAppointmentOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 md:h-10 text-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">New </span>Appointment
          </Button>
        </div>
      </div>

      {/* Sub-header: Date Navigation & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="px-2 h-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-50 whitespace-nowrap">
            Jan 13 – 19, 2026
          </span>
          <Button variant="outline" size="sm" className="px-2 h-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Calendar className="h-3.5 w-3.5" />
            Today
          </Button>
        </div>

        {/* Filters - horizontally scrollable on small screens */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {/* Provider Filter */}
          <div className="flex gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            {["all", "tamas", "richards", "jennifer"].map((prov) => (
              <button
                key={prov}
                onClick={() => setProvider(prov)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  provider === prov
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                }`}
              >
                {prov === "all" ? "All" : prov === "tamas" ? "Dr. Tamas" : prov === "richards" ? "Dr. Richards" : "Nurse"}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            {["all", "well-child", "sick", "vaccination", "follow-up"].map((type) => (
              <button
                key={type}
                onClick={() => setAppointmentType(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  appointmentType === type
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                }`}
              >
                {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            {["all", "completed", "upcoming", "cancelled"].map((stat) => (
              <button
                key={stat}
                onClick={() => setStatus(stat)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  status === stat
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                }`}
              >
                {stat === "all" ? "All" : stat.charAt(0).toUpperCase() + stat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet List View — shown below lg */}
      <div className="lg:hidden space-y-4">
        <Card>
          <CardHeader className="pb-3 px-4 py-4">
            <CardTitle className="text-base">This Week's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {filteredAppointments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No appointments match the current filters</p>
            ) : (
              <div className="space-y-5">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const dayAppts = filteredAppointments
                    .filter((apt) => apt.day === dayIndex)
                    .sort((a, b) => a.time.localeCompare(b.time));
                  if (dayAppts.length === 0) return null;
                  return (
                    <div key={dayIndex}>
                      <div className={`flex items-center gap-2 mb-2.5 pb-1.5 border-b ${dayIndex === 1 ? "border-blue-200 dark:border-blue-800" : "border-slate-100 dark:border-slate-800"}`}>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${dayIndex === 1 ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>
                          {getDayName(dayIndex)}, Jan {getDayDate(dayIndex)}
                        </span>
                        {dayIndex === 1 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">Today</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {dayAppts.map((apt) => (
                          <div
                            key={apt.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              apt.status === "cancelled"
                                ? "border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 opacity-60"
                                : apt.status === "completed"
                                ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${getAppointmentColor(apt.type)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium truncate ${apt.status === "cancelled" ? "line-through text-slate-400 dark:text-slate-600" : "text-slate-900 dark:text-slate-100"}`}>
                                  {apt.patientName}
                                </p>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                                  {apt.time}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {getAppointmentTypeLabel(apt.type)} · {apt.provider} · {apt.duration} min
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini stats for mobile */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", value: weekStats.today, color: "text-slate-900 dark:text-slate-50" },
            { label: "This Week", value: weekStats.week, color: "text-slate-900 dark:text-slate-50" },
            { label: "Cancelled", value: weekStats.noShows, color: "text-red-600 dark:text-red-400" },
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

      {/* Desktop Week View — hidden on mobile/tablet */}
      <div className="hidden lg:grid grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Week View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-0 border-b border-slate-200 dark:border-slate-700">
                  {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <div key={dayIndex} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 p-4 text-center">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getDayName(dayIndex)}</p>
                      <p className={`text-lg font-bold ${dayIndex === 1 ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>
                        {getDayDate(dayIndex)}
                      </p>
                      {dayIndex === 1 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Today</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Time Slots Grid */}
                <div className="relative">
                  {/* Time column header and all slots */}
                  <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-0">
                    {/* Time column */}
                    <div className="border-r border-slate-200 dark:border-slate-700">
                      {timeSlots.map((time) => (
                        <div
                          key={time}
                          className="h-12 border-b border-slate-100 dark:border-slate-800 p-2 text-xs text-slate-400 dark:text-slate-600 flex items-start justify-center font-medium"
                        >
                          {time}
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {Array.from({ length: 7 }).map((_, dayIndex) => (
                      <div key={dayIndex} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 relative">
                        {timeSlots.map((time, slotIndex) => {
                          const isLunchBreak = time >= "12:30" && time <= "13:00";
                          return (
                            <div
                              key={`${dayIndex}-${time}`}
                              className={`h-12 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors ${
                                isLunchBreak ? "bg-slate-50 dark:bg-slate-800/60" : ""
                              }`}
                            />
                          );
                        })}

                        {/* Appointment blocks for this day */}
                        <div className="absolute inset-0">
                          {filteredAppointments
                            .filter((apt) => apt.day === dayIndex)
                            .map((apt) => {
                              const startPixels = timeToPixels(apt.time);
                              const heightPixels = apt.duration * 1.5;
                              const isCompleted = apt.status === "completed";
                              const isCancelled = apt.status === "cancelled";

                              return (
                                <div
                                  key={apt.id}
                                  className={`absolute left-0 right-0 mx-1 rounded-md p-2 text-white text-xs font-medium overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer ${getAppointmentColor(
                                    apt.type
                                  )} ${isCompleted ? "opacity-60" : ""} ${
                                    isCancelled ? "line-through opacity-50" : ""
                                  }`}
                                  style={{
                                    top: `${startPixels}px`,
                                    height: `${heightPixels}px`,
                                    minHeight: "40px",
                                  }}
                                  title={`${apt.patientName} - ${apt.type}`}
                                >
                                  <div className="whitespace-nowrap truncate">{apt.patientName}</div>
                                  <div className="whitespace-nowrap truncate text-xs opacity-90">
                                    {getAppointmentTypeLabel(apt.type)}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Today */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{apt.patientName}</p>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex-shrink-0">
                        {apt.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                      {getAppointmentTypeLabel(apt.type)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{apt.provider}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No appointments today</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Today's Appointments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{weekStats.today}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">This Week</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{weekStats.week}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{weekStats.noShows}</p>
              </div>
            </CardContent>
          </Card>

          {/* Color Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appointment Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { type: "well-child", label: "Well-child Visit" },
                { type: "sick", label: "Sick Visit" },
                { type: "vaccination", label: "Vaccination" },
                { type: "follow-up", label: "Follow-up" },
              ].map((item) => (
                <div key={item.type} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getAppointmentColor(item.type)}`} />
                  <p className="text-sm text-slate-700 dark:text-slate-300">{item.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Appointment Modal */}
      <AddAppointmentModal
        open={newAppointmentOpen}
        onOpenChange={setNewAppointmentOpen}
        onAppointmentSaved={(appointment) => {
          console.log("Appointment created:", appointment);
        }}
      />
    </div>
  );
}
