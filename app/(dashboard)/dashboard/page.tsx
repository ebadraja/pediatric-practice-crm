"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="pt-4 pb-8 space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Good afternoon, Dr. Tamas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Here's a summary of your practice today</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg self-start sm:self-auto whitespace-nowrap flex-shrink-0">
          <Clock className="h-3.5 w-3.5" />
          <span>Updated just now</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {/* Total Calls Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Calls Today</p>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1 md:mt-2">23</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">+12%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">vs yesterday</span>
          </div>
        </div>

        {/* Appointments Booked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Appointments Booked</p>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1 md:mt-2">18</p>
            </div>
            <div className="p-2.5 bg-green-50 dark:bg-green-950/40 rounded-lg">
              <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">78% conversion</span>
          </div>
        </div>

        {/* Active Patients */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Patients</p>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1 md:mt-2">1,247</p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">+8 this week</span>
          </div>
        </div>

        {/* No-Show Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">No-Show Rate</p>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1 md:mt-2">3.2%</p>
            </div>
            <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">-1.1% vs last week</span>
          </div>
        </div>
      </div>

      {/* Recent Activity & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 md:py-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Recent Calls</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Latest interactions handled by the AI voice agent</p>
          </div>
          <div className="p-3 md:p-6">
            <div className="space-y-1 md:space-y-3">
              {[
                { name: "Sarah Johnson", time: "2 min ago", duration: "3:24", outcome: "Booked", status: "success" },
                { name: "Michael Chen", time: "15 min ago", duration: "2:18", outcome: "Booked", status: "success" },
                { name: "Unknown Caller", time: "32 min ago", duration: "4:51", outcome: "Transferred", status: "warning" },
                { name: "Emily Rodriguez", time: "1 hr ago", duration: "1:47", outcome: "Info Only", status: "neutral" },
                { name: "David Patel", time: "1 hr ago", duration: "2:33", outcome: "Booked", status: "success" },
              ].map((call, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{call.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{call.time} · {call.duration}</p>
                    </div>
                  </div>
                  <div className={`text-xs font-medium px-2.5 py-0.5 rounded-md border ${
                    call.status === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-700/60"
                      : call.status === "warning"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-700/60"
                      : "bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-600/60"
                  }`}>
                    {call.outcome}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 md:py-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Today's Schedule</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Upcoming appointments</p>
          </div>
          <div className="p-3 md:p-6">
            <div className="space-y-1 md:space-y-3">
              {[
                { time: "9:00 AM", patient: "Emma Wilson", type: "Well-child visit" },
                { time: "10:30 AM", patient: "Lucas Brown", type: "Sick visit" },
                { time: "11:15 AM", patient: "Olivia Davis", type: "Vaccination" },
                { time: "2:00 PM", patient: "Noah Martinez", type: "Follow-up" },
                { time: "3:30 PM", patient: "Ava Thompson", type: "Well-child visit" },
              ].map((apt, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md whitespace-nowrap flex-shrink-0">
                    {apt.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{apt.patient}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{apt.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Chatbot Conversations</p>
              <p className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50 mt-1">47</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">today</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Avg Call Duration</p>
              <p className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50 mt-1">2.4 min</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">per call</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-lg flex-shrink-0">
              <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Escalated to Staff</p>
              <p className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50 mt-1">5</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">today</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
