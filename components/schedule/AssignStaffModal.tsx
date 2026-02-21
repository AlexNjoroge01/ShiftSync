"use client"

import { useState, useEffect } from "react"
import { X, Search, User, AlertTriangle, Check, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSchedule } from "@/hooks/useSchedule"
import { WhatIfPanel } from "./WhatIfPanel"
import { cn } from "@/lib/utils"
import type { ShiftWithDetails, Suggestion } from "@/types"

interface AssignStaffModalProps {
  shift: ShiftWithDetails
  onClose: () => void
  onAssigned: () => void
}

interface StaffSuggestion {
  userId: string
  name: string
  currentWeekHours: number
  certifications: string[]
  skills: string[]
  score: number
  warnings: string[]
}

export function AssignStaffModal({ shift, onClose, onAssigned }: AssignStaffModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<StaffSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [overrideReason, setOverrideReason] = useState("")
  const [showOverrideInput, setShowOverrideInput] = useState(false)

  const { assignStaff, isAssigning } = useSchedule({ locationId: shift.locationId })

  // Fetch suggestions when modal opens
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true)
      try {
        const response = await fetch(
          `/api/shifts/${shift.id}/suggestions`
        )
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error)
      } finally {
        setIsLoadingSuggestions(false)
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

    await assignStaff({
      shiftId: shift.id,
      userId: selectedUserId,
      overrideReason: showOverrideInput ? overrideReason : undefined,
    })

    onAssigned()
    onClose()
  }

  const handleSelectStaff = (userId: string) => {
    setSelectedUserId(userId)
    const suggestion = suggestions.find((s) => s.userId === userId)
    if (suggestion?.warnings.length) {
      setShowOverrideInput(true)
    } else {
      setShowOverrideInput(false)
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
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Assign Staff to Shift</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shift Details */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{shift.location.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatTime(shift.startTimeUtc)} - {formatTime(shift.endTimeUtc)}
              </span>
              {shift.isPremium && (
                <Badge variant="default" className="ml-2">
                  Premium
                </Badge>
              )}
            </div>
            {shift.requiredSkill && (
              <div className="text-sm text-muted-foreground">
                Required skill: <Badge variant="outline">{shift.requiredSkill.name}</Badge>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Headcount: {shift.assignments.length} / {shift.headcount}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff by name or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Staff List */}
          <ScrollArea className="h-[250px]">
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No qualified staff available
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
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSelectStaff(suggestion.userId)}
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

          {/* What-If Panel */}
          {selectedUserId && (
            <WhatIfPanel
              userId={selectedUserId}
              shiftId={shift.id}
              startTimeUtc={shift.startTimeUtc}
              endTimeUtc={shift.endTimeUtc}
            />
          )}

          {/* Override Reason Input */}
          {showOverrideInput && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                Override Reason (required)
              </label>
              <Input
                placeholder="Enter reason for override..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || isAssigning || (showOverrideInput && !overrideReason)}
            >
              {isAssigning ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
