"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut, User, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationCenter } from "@/components/notifications/NotificationCenter"
import { toast } from "sonner"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { data: session } = useSession()

  const roleLabel = {
    ADMIN: "Administrator",
    MANAGER: "Manager",
    STAFF: "Staff Member",
  }

  return (
    <header
      className={`flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 ${className || ""}`}
    >
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Welcome back, {session?.user?.name}
        </h1>
        <p className="text-sm text-slate-500">
          {session?.user?.role && roleLabel[session.user.role]}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <NotificationBell />
          <NotificationCenter />
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full px-3"
            >
              <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="hidden md:inline font-medium">{session?.user?.name}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-lg">
            <DropdownMenuLabel className="text-slate-900">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-slate-500">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer focus:bg-slate-50 focus:text-slate-900"
              onClick={() => {
                toast.success("Signed out successfully")
                signOut({ callbackUrl: "/login" })
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
