"use client"

import { useState, useEffect } from "react"
import { X, Search, User, Clock, AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ShiftWithDetails } from "@/types"

interface CoverageModalProps {
  shift: ShiftWithDetails
  onClose: () => void
  onAssign: (userId: string) => Promise<void>
}

interface StaffSuggestion {
  userId: string
  name: string
  currentWeekHours: number
  skills: string[]
  isAvailable: boolean
  hasConflict: boolean
  warnings: string[]
}

export function CoverageModal({ shift, onClose, onAssign }: CoverageModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<StaffSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/shifts/${shift.id}/suggestions?coverage=true`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuggestions()
  }, [shift.id])

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleAssign = async () => {
    if (!selectedUserId) return
    setIsAssigning(true)
    try {
      await onAssign(selectedUserId)
      onClose()
    } catch (error) {
      console.error("Failed to assign:", error)
    } finally {
      setIsAssigning(false)
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Find Coverage</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shift Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <p className="font-medium">{shift.location.name}</p>
            <p className="text-muted-foreground">
              {formatTime(shift.startTimeUtc)} - {formatTime(shift.endTimeUtc)}
            </p>
            {shift.requiredSkill && (
              <Badge variant="outline" className="mt-1">
                {shift.requiredSkill.name}
              </Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Staff List */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available staff found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.userId}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedUserId === suggestion.userId
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                      suggestion.hasConflict && "opacity-50"
                    )}
                    onClick={() => !suggestion.hasConflict && setSelectedUserId(suggestion.userId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{suggestion.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {suggestion.currentWeekHours.toFixed(1)}h this week
                          </div>
                        </div>
                      </div>
                      {selectedUserId === suggestion.userId && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {suggestion.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {!suggestion.isAvailable && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-500">
                        Not available during this time
                      </div>
                    )}

                    {suggestion.hasConflict && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-500">
                        Has conflicting shift
                      </div>
                    )}

                    {suggestion.warnings.length > 0 && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-500">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{suggestion.warnings[0]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Assign Coverage"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
