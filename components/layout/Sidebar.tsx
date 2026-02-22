"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Calendar,
  Clock,
  Home,
  Settings,
  Users,
  BarChart3,
  ArrowLeftRight,
  Shield,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
}

const adminLinks = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/locations", label: "Locations", icon: Building2 },
  { href: "/admin/audit", label: "Audit Log", icon: Shield },
]

const managerLinks = [
  { href: "/manager", label: "Dashboard", icon: Home },
  { href: "/manager/schedule", label: "Schedule", icon: Calendar },
  { href: "/manager/shifts", label: "Shifts", icon: Clock },
  { href: "/manager/staff", label: "Staff", icon: Users },
  { href: "/manager/swaps", label: "Swap Requests", icon: ArrowLeftRight },
  { href: "/manager/overtime", label: "Overtime", icon: BarChart3 },
  { href: "/manager/fairness", label: "Fairness", icon: BarChart3 },
  { href: "/manager/audit", label: "Audit Log", icon: Shield },
]

const staffLinks = [
  { href: "/staff", label: "Dashboard", icon: Home },
  { href: "/staff/schedule", label: "My Schedule", icon: Calendar },
  { href: "/staff/availability", label: "Availability", icon: Clock },
  { href: "/staff/swaps", label: "Swap Requests", icon: ArrowLeftRight },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const links = session?.user?.role === "ADMIN"
    ? adminLinks
    : session?.user?.role === "MANAGER"
    ? managerLinks
    : staffLinks

  return (
    <aside
      className={cn(
        "flex flex-col w-64 bg-white border-r border-slate-200",
        className
      )}
    >
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
          <Calendar className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900">ShiftSync</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
