"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface HeaderNotification {
  id: number;
  message: string;
  time: string;
  type: "success" | "error" | "info";
}

const defaultNotifications: HeaderNotification[] = [
  { id: 1, message: "New patient Emma Wilson added", time: "2 mins ago", type: "success" },
  { id: 2, message: "Appointment with Dr. Tamas in 30 minutes", time: "5 mins ago", type: "info" },
  { id: 3, message: "Document upload failed for patient ID 5", time: "1 hour ago", type: "error" },
];

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState<HeaderNotification[]>(defaultNotifications);
  const pathname = usePathname();

  const titleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/patients": "Patients",
    "/appointments": "Appointments",
    "/call-logs": "Call Logs",
    "/chat-logs": "Chat Logs",
    "/staff": "Staff",
    "/reports": "Reports",
    "/settings": "Settings",
  };

  return (
    <div className="hidden lg:flex fixed top-0 right-0 left-64 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 items-center justify-between px-6 z-40 gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-50">{titleMap[pathname || "/dashboard"] || "Dashboard"}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
          >
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors last:border-b-0">
                      <p className="text-sm text-slate-900 dark:text-slate-50">{n.message}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{n.time}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={toggleTheme} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? <Moon className="h-5 w-5 text-slate-600 dark:text-slate-400" /> : <Sun className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
        </button>
      </div>
    </div>
  );
}
 
