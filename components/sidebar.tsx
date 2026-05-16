"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Phone,
  MessageSquare,
  UserCog,
  FileBarChart,
  Settings,
  Stethoscope,
  Menu,
  Moon,
  Sun,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Call Logs", href: "/call-logs", icon: Phone },
  { name: "Chat Logs", href: "/chat-logs", icon: MessageSquare },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Reports", href: "/reports", icon: FileBarChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent({ isMobile = false }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo Area with gradient */}
      <div className={cn(
        "relative border-b border-slate-900/50 bg-gradient-to-b from-slate-900 to-slate-950",
        isMobile ? "p-4" : "p-6"
      )}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight text-white">Kids 0-18</h1>
            <p className="text-xs text-slate-400">Integrated Pediatrics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1",
        isMobile ? "px-2 py-3" : "px-3 py-4"
      )}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                isActive 
                  ? "bg-slate-800 text-white border-l-4 border-blue-500 pl-2" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-colors flex-shrink-0",
                isActive ? "text-white" : "text-slate-400"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={cn(
        "border-t border-slate-800/50",
        isMobile ? "p-3" : "p-4"
      )}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
            JT
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Dr. Jonathan Tamas</p>
            <p className="text-xs text-slate-400 truncate">Admin</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = [
    { id: 1, message: "New patient Emma Wilson added", time: "2 mins ago", type: "success" },
    { id: 2, message: "Appointment with Dr. Tamas in 30 minutes", time: "5 mins ago", type: "info" },
    { id: 3, message: "Document upload failed for patient ID 5", time: "1 hour ago", type: "error" },
  ];

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <aside className="hidden lg:flex w-64 bg-slate-950 text-white h-screen fixed left-0 top-0 flex-col border-r border-slate-900/50">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button - Shown on mobile/tablet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 z-50">
        <Sheet>
          <SheetTrigger className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0">
            <Menu className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-slate-950 text-white p-0 flex flex-col">
            <SidebarContent isMobile={true} />
          </SheetContent>
        </Sheet>

        {/* App logo in center */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-900 dark:text-white">Kids 0-18</span>
        </div>

        {/* Top bar actions - theme toggle and notifications */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
            >
              <Bell className="h-6 w-6 text-slate-900 dark:text-slate-400" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors last:border-b-0"
                    >
                      <p className="text-sm text-slate-900 dark:text-slate-50">{notif.message}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === "light" ? (
              <Moon className="h-6 w-6 text-slate-900 dark:text-slate-400" />
            ) : (
              <Sun className="h-6 w-6 text-slate-900 dark:text-slate-400" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
