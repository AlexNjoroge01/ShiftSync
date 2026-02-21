"use client"

import { useState, useEffect } from "react"
import { MapPin, Clock, Users, RefreshCw, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRealtime } from "@/hooks/useRealtime"
import { cn } from "@/lib/utils"

interface OnDutyStaff {
  userId: string
  userName: string
  shiftId: string
  shiftStart: Date
  shiftEnd: Date
  skill?: string
}

interface LocationOnDuty {
  locationId: string
  locationName: string
  timezone: string
  staff: OnDutyStaff[]
}

interface OnDutyDashboardProps {
  initialData?: LocationOnDuty[]
}

export function OnDutyDashboard({ initialData = [] }: OnDutyDashboardProps) {
  const [locations, setLocations] = useState<LocationOnDuty[]>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/onduty")
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch on-duty data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Real-time updates
  useRealtime({
    onOndutyUpdate: (payload) => {
      if (payload.locationId && payload.currentStaff) {
        setLocations((prev) =>
          prev.map((loc) =>
            loc.locationId === payload.locationId
              ? { ...loc, staff: payload.currentStaff as OnDutyStaff[] }
              : loc
          )
        )
        setLastUpdated(new Date())
      }
    },
  })

  // Fallback polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getTimeRemaining = (end: Date | string) => {
    const now = new Date()
    const endTime = new Date(end)
    const diff = endTime.getTime() - now.getTime()

    if (diff <= 0) return "Ended"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  const totalOnDuty = locations.reduce((sum, loc) => sum + loc.staff.length, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            On-Duty Dashboard
          </CardTitle>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {formatTime(lastUpdated)}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b">
          <div className="text-center">
            <p className="text-3xl font-bold">{totalOnDuty}</p>
            <p className="text-xs text-muted-foreground">Staff On Duty</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{locations.length}</p>
            <p className="text-xs text-muted-foreground">Locations</p>
          </div>
        </div>

        {/* Locations */}
        {isLoading && locations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No staff currently on duty
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {locations.map((location) => (
                <div
                  key={location.locationId}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Location Header */}
                  <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{location.locationName}</span>
                    </div>
                    <Badge variant="secondary">
                      {location.staff.length} on duty
                    </Badge>
                  </div>

                  {/* Staff List */}
                  <div className="divide-y">
                    {location.staff.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No staff currently on duty
                      </div>
                    ) : (
                      location.staff.map((staff) => (
                        <div
                          key={staff.userId + staff.shiftId}
                          className="px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{staff.userName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTime(staff.shiftStart)} - {formatTime(staff.shiftEnd)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {staff.skill && (
                              <Badge variant="outline" className="text-xs mb-1">
                                {staff.skill}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {getTimeRemaining(staff.shiftEnd)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
