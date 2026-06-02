'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Users,
  Phone,
  Activity,
  Clock,
  AlertCircle,
  Target,
  DollarSign,
  Loader2,
} from 'lucide-react';

const CALLS_OVER_TIME = [
  { day: 'Jan 1', aiHandled: 24, escalated: 8 },
  { day: 'Jan 2', aiHandled: 28, escalated: 6 },
  { day: 'Jan 3', aiHandled: 31, escalated: 9 },
  { day: 'Jan 4', aiHandled: 25, escalated: 7 },
  { day: 'Jan 5', aiHandled: 35, escalated: 5 },
  { day: 'Jan 6', aiHandled: 32, escalated: 8 },
  { day: 'Jan 7', aiHandled: 28, escalated: 6 },
  { day: 'Jan 8', aiHandled: 29, escalated: 7 },
  { day: 'Jan 9', aiHandled: 34, escalated: 9 },
  { day: 'Jan 10', aiHandled: 31, escalated: 5 },
];

const CALL_OUTCOMES = [
  { name: 'Booked', value: 521, color: '#10b981' },
  { name: 'Transferred', value: 89, color: '#f97316' },
  { name: 'Info Only', value: 52, color: '#3b82f6' },
  { name: 'Hung Up', value: 25, color: '#9ca3af' },
];

const APPOINTMENT_TYPES = [
  { name: 'Well-child visits', value: 245 },
  { name: 'Sick visits', value: 167 },
  { name: 'Vaccinations', value: 78 },
  { name: 'Follow-ups', value: 31 },
];

const PEAK_HOURS = [
  { hour: '8 AM', calls: 8 },
  { hour: '9 AM', calls: 24 },
  { hour: '10 AM', calls: 32 },
  { hour: '11 AM', calls: 28 },
  { hour: '12 PM', calls: 15 },
  { hour: '1 PM', calls: 18 },
  { hour: '2 PM', calls: 26 },
  { hour: '3 PM', calls: 31 },
  { hour: '4 PM', calls: 22 },
  { hour: '5 PM', calls: 9 },
];

const TOP_FAQS = [
  { question: "What are your hours?", count: 89, percentage: 12 },
  { question: "Do you accept [insurance]?", count: 67, percentage: 9 },
  { question: "When can I book?", count: 54, percentage: 7 },
  { question: "Are you taking new patients?", count: 43, percentage: 6 },
  { question: "What's the cost for [service]?", count: 32, percentage: 4 },
  { question: "Can I reschedule my appointment?", count: 28, percentage: 4 },
  { question: "Do you offer virtual visits?", count: 24, percentage: 3 },
  { question: "How do I pay?", count: 19, percentage: 3 },
  { question: "Is walk-in available?", count: 15, percentage: 2 },
  { question: "What forms do I need?", count: 12, percentage: 2 },
];

const ENGAGEMENT_CHANNELS = [
  { name: 'Phone Calls', value: 60 },
  { name: 'Website Chatbot', value: 30 },
  { name: 'Walk-ins', value: 8 },
  { name: 'Email', value: 2 },
];

const PROVIDER_PERFORMANCE = [
  { name: 'Dr. Jonathan Tamas', appointments: 287, rating: 4.9, noShowRate: 2.1 },
  { name: 'Dr. Peaches Richards', appointments: 234, rating: 4.8, noShowRate: 3.4 },
];

const KPI_DATA = [
  { label: 'Total Calls', value: '687', change: '+12%', trend: 'up', iconColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-950/40', icon: Phone },
  { label: 'Appointments Booked', value: '521', change: '76% success', trend: 'up', iconColor: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-50 dark:bg-green-950/40', icon: Calendar },
  { label: 'Total Patients', value: '1,247', change: '+47 new', trend: 'up', iconColor: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-50 dark:bg-purple-950/40', icon: Users },
  { label: 'Revenue Impact', value: '$43,200', change: 'This month', trend: 'up', iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: Activity },
  { label: 'No-Show Rate', value: '3.2%', change: '-1.1%', trend: 'down', iconColor: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-50 dark:bg-orange-950/40', icon: AlertCircle },
  { label: 'Avg Call Duration', value: '2.4 min', change: '-18 sec', trend: 'down', iconColor: 'text-slate-600 dark:text-slate-400', iconBg: 'bg-slate-100 dark:bg-slate-800', icon: Clock },
];

const INSIGHTS = [
  { icon: TrendingUp, iconColor: 'text-green-600 dark:text-green-400', title: 'Bookings Increased', description: 'Bookings increased 12% compared to last month' },
  { icon: Clock, iconColor: 'text-orange-600 dark:text-orange-400', title: 'Peak Hours', description: 'Most calls happen between 9-11 AM' },
  { icon: Target, iconColor: 'text-blue-600 dark:text-blue-400', title: 'AI Performance', description: 'AI agent handles 84% of bookings without escalation' },
  { icon: DollarSign, iconColor: 'text-emerald-600 dark:text-emerald-400', title: 'Revenue Impact', description: 'Estimated $43,200 in revenue from AI-booked appointments' },
  { icon: AlertCircle, iconColor: 'text-red-600 dark:text-red-400', title: 'Follow-ups Needed', description: '5 patients flagged for follow-up this month' },
];

const card = "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm";
const cardHeader = "px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 dark:border-slate-700";
const cardTitle = "text-base font-semibold text-slate-900 dark:text-slate-50";
const tableHeaderRow = "border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60";
const tableHeaderCell = "text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider";
const tableRow = "border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";

interface MetricsData {
  summary: {
    totalForms: number;
    totalReceived: number;
    statusBreakdown: Record<string, number>;
    averageMatchConfidence: number;
    matchRateOver85: number;
    averageProcessingTimeMinutes: number;
  };
  trends: {
    submissionTrend: Array<{ date: string; count: number }>;
    formTypeBreakdown: Array<{ title: string; count: number }>;
    confidenceDistribution: Record<string, number>;
  };
  reference: {
    uniqueFormTypes: string[];
  };
}

function KPICard({ kpi }: { kpi: (typeof KPI_DATA)[number] }) {
  const Icon = kpi.icon;
  return (
    <div key={kpi.label} className={`${card} p-4 md:p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</p>
          <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1.5">{kpi.value}</p>
        </div>
        <div className={`p-2.5 rounded-lg flex-shrink-0 ${kpi.iconBg}`}>
          <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
        </div>
      </div>
      <div className="flex items-center gap-1 pt-3 border-t border-slate-100 dark:border-slate-800">
        {kpi.trend === 'up'
          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          : <TrendingDown className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
        }
        <span className={`text-xs font-medium ${kpi.trend === 'up' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {kpi.change}
        </span>
      </div>
    </div>
  );
}

export default function ReportsAnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState('30days');
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);
        const response = await fetch("/api/metrics/intake-forms");
        if (!response.ok) {
          throw new Error("Failed to fetch metrics");
        }
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        setMetricsError("Failed to load metrics");
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="pt-4 pb-8 space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Track performance metrics and operational insights</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
            <option>This year</option>
          </select>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 h-9 text-sm">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="outline" className="gap-2 h-9 text-sm dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            <Calendar className="w-4 h-4" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Time Period Tabs */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {[
          { label: 'Today', value: 'today' },
          { label: 'This Week', value: 'week' },
          { label: 'This Month', value: 'month' },
          { label: 'Last 30 Days', value: '30days' },
          { label: 'This Quarter', value: 'quarter' },
          { label: 'This Year', value: 'year' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTimePeriod(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              timePeriod === tab.value
                ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {KPI_DATA.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls Over Time */}
        {loading ? (
          <div className={`${card} animate-pulse`}>
            <div className={cardHeader}><div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" /></div>
            <div className="p-4 md:p-6"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded" /></div>
          </div>
        ) : (
          <div className={card}>
            <div className={cardHeader}><h2 className={cardTitle}>Calls Over Time</h2></div>
            <div className="p-4 md:p-6">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={CALLS_OVER_TIME}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="aiHandled" stroke="#3b82f6" strokeWidth={2} dot={false} name="AI Handled" />
                  <Line type="monotone" dataKey="escalated" stroke="#f97316" strokeWidth={2} dot={false} name="Escalated" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Call Outcomes */}
        {loading ? (
          <div className={`${card} animate-pulse`}>
            <div className={cardHeader}><div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" /></div>
            <div className="p-4 md:p-6"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded" /></div>
          </div>
        ) : (
          <div className={card}>
            <div className={cardHeader}><h2 className={cardTitle}>Call Outcomes</h2></div>
            <div className="p-4 md:p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={CALL_OUTCOMES} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {CALL_OUTCOMES.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Appointment Types */}
        {loading ? (
          <div className={`${card} animate-pulse`}>
            <div className={cardHeader}><div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" /></div>
            <div className="p-4 md:p-6"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded" /></div>
          </div>
        ) : (
          <div className={card}>
            <div className={cardHeader}><h2 className={cardTitle}>Appointment Types</h2></div>
            <div className="p-4 md:p-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={APPOINTMENT_TYPES} layout="vertical" margin={{ top: 5, right: 30, left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Peak Call Hours */}
        {loading ? (
          <div className={`${card} animate-pulse`}>
            <div className={cardHeader}><div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" /></div>
            <div className="p-4 md:p-6"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded" /></div>
          </div>
        ) : (
          <div className={card}>
            <div className={cardHeader}><h2 className={cardTitle}>Peak Call Hours</h2></div>
            <div className="p-4 md:p-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={PEAK_HOURS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Top Insights */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>Top Insights</h2></div>
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {INSIGHTS.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.title} className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <div className="mb-2">
                    <Icon className={`w-5 h-5 ${insight.iconColor}`} />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">{insight.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{insight.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top FAQs */}
        <div className={card}>
          <div className={cardHeader}><h2 className={cardTitle}>Top Customer Questions</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeaderRow}>
                  <th className={tableHeaderCell}>Question</th>
                  <th className={`${tableHeaderCell} text-center`}>Count</th>
                  <th className={`${tableHeaderCell} text-center`}>%</th>
                </tr>
              </thead>
              <tbody>
                {TOP_FAQS.map((faq, idx) => (
                  <tr key={idx} className={tableRow}>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{faq.question}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-900 dark:text-slate-100">{faq.count}</td>
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{faq.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Engagement */}
        <div className={card}>
          <div className={cardHeader}><h2 className={cardTitle}>Patient Engagement by Channel</h2></div>
          <div className="p-4 md:p-6 space-y-4">
            {ENGAGEMENT_CHANNELS.map((channel) => (
              <div key={channel.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{channel.name}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{channel.value}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: `${channel.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Provider Performance */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>Provider Performance</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeaderRow}>
                <th className={tableHeaderCell}>Provider</th>
                <th className={`${tableHeaderCell} text-center`}>Appointments</th>
                <th className={`${tableHeaderCell} text-center`}>Rating</th>
                <th className={`${tableHeaderCell} text-center`}>No-Show Rate</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDER_PERFORMANCE.map((provider, idx) => (
                <tr key={idx} className={tableRow}>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{provider.name}</td>
                  <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{provider.appointments}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300">
                      {provider.rating} ⭐
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${
                      provider.noShowRate < 3
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300'
                        : 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300'
                    }`}>
                      {provider.noShowRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Intake Form Metrics Section */}
      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 mb-6">Intake Form Metrics</h2>
        
        {metricsLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-400">Loading intake form metrics...</p>
          </div>
        ) : metricsError || !metrics ? (
          <div className={`${card} border-red-200 dark:border-red-800`}>
            <div className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-300">{metricsError || "Failed to load metrics"}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className={card + " p-4"}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Forms</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.summary.totalForms.toLocaleString()}</p>
              </div>
              <div className={card + " p-4"}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Received (30d)</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.summary.totalReceived}</p>
              </div>
              <div className={card + " p-4"}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Avg Match Conf.</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.summary.averageMatchConfidence.toFixed(1)}%</p>
              </div>
              <div className={card + " p-4"}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Match Rate 85%+</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.summary.matchRateOver85}</p>
              </div>
              <div className={card + " p-4"}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Processing Time</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.summary.averageProcessingTimeMinutes.toFixed(1)}m</p>
              </div>
              <div className={card + " p-4"}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Form Types</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.reference.uniqueFormTypes.length}</p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className={card}>
              <div className={cardHeader}><h3 className={cardTitle}>Status Breakdown</h3></div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(metrics.summary.statusBreakdown).map(([status, count]) => {
                    const colors: Record<string, string> = {
                      RECEIVED: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300",
                      MATCHED: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300",
                      DRAFT: "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300",
                      LINKED: "bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300",
                      ARCHIVED: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300",
                    };
                    return (
                      <div key={status} className="text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{count}</p>
                        <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-md mt-2 ${colors[status]}`}>{status}</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {((count / metrics.summary.totalForms) * 100).toFixed(0)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Form Types */}
            <div className={card}>
              <div className={cardHeader}><h3 className={cardTitle}>Forms by Type</h3></div>
              <div className="p-6 space-y-4">
                {metrics.trends.formTypeBreakdown.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No form types found</p>
                ) : (
                  metrics.trends.formTypeBreakdown.map((form, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{form.title}</p>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{form.count} forms</p>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${(form.count / Math.max(...metrics.trends.formTypeBreakdown.map(f => f.count), 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
