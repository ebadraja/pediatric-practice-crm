"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function typeColor(type: string): string {
  if (type === "form_submitted") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (type === "error") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (type === "patient_matched") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    form_submitted: "Intake Form",
    patient_matched: "Patient Matched",
    draft_approved: "Draft Approved",
    error: "Error",
    info: "Info",
  };
  return map[type] ?? type;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const includeRead = filter === "all" ? "true" : "false";
      const res = await fetch(`/api/notifications?includeRead=${includeRead}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PUT" });
    fetchNotifications();
  };

  const markAllRead = async () => {
    await fetch(`/api/notifications`, { method: "PATCH" });
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    fetchNotifications();
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.actionUrl && n.actionUrl !== "/intake-forms" || n.actionUrl?.startsWith("/intake-forms/")) {
      router.push(n.actionUrl);
    }
  };

  return (
    <div className="pt-4 pb-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Notifications
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            All system notifications and form submission alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === f
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {f === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Bell className="h-10 w-10 opacity-30" />
              <p className="text-sm">No {filter === "unread" ? "unread " : ""}notifications</p>
            </div>
          ) : (
            <ul>
              {notifications.map((n, idx) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors ${
                    n.isRead
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      : "bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100/60 dark:hover:bg-blue-900/20"
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    {n.isRead
                      ? <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                      : <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className={`text-xs px-1.5 py-0 border-0 ${typeColor(n.type)}`}>
                        {typeLabel(n.type)}
                      </Badge>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{formatTime(n.createdAt)}</span>
                    </div>
                    <p className={`text-sm ${n.isRead ? "text-slate-700 dark:text-slate-300" : "font-medium text-slate-900 dark:text-slate-50"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    {n.actionUrl && n.actionUrl !== "/intake-forms" && (
                      <button
                        onClick={() => handleClick(n)}
                        className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View details
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        title="Mark as read"
                        className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      title="Delete"
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
