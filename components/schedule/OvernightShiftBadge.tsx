"use client"

import { Badge } from "@/components/ui/badge"
import { Moon } from "lucide-react"

export function OvernightShiftBadge() {
  return (
    <Badge
      variant="outline"
      className="text-xs border-purple-200 text-purple-600 bg-purple-50 ml-1"
    >
      <Moon className="h-3 w-3 mr-1" />
      Overnight
    </Badge>
  )
}
