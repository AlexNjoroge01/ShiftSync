"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, User, AlertCircle, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { SwapRequestWithDetails } from "@/types"

interface DropRequestCardProps {
  request: SwapRequestWithDetails
  currentUserId: string
  userRole: "ADMIN" | "MANAGER" | "STAFF"
  onApprove?: (requestId: string) => Promise<void>
  onReject?: (requestId: string, reason: string) => Promise<void>
  onClaim?: (requestId: string) => Promise<void>
  onCancel?: (requestId: string) => Promise<void>
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  STAFF_ACCEPTED: "bg-blue-500",
  MANAGER_APPROVED: "bg-green-500",
  CANCELLED: "bg-gray-500",
  EXPIRED: "bg-red-500",
}

export function DropRequestCard({
  request,
  currentUserId,
  userRole,
  onApprove,
  onReject,
  onClaim,
  onCancel,
}: DropRequestCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const isRequester = request.requesterId === currentUserId
  const isManager = userRole === "ADMIN" || userRole === "MANAGER"
  const canApprove = isManager && request.status === "STAFF_ACCEPTED"
  const canClaim = userRole === "STAFF" && request.status === "PENDING" && !isRequester
  const canCancel = isRequester && request.status === "PENDING"

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const handleAction = async (action: () => Promise<void> | undefined) => {
    if (!action) return
    setIsProcessing(true)
    try {
      await action()
    } catch (error) {
      console.error("Action failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className={cn("transition-shadow hover:shadow-md", request.status === "EXPIRED" && "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span>Drop Request</span>
            <Badge className={cn("text-white", statusColors[request.status])}>
              {request.status.replace("_", " ")}
            </Badge>
          </CardTitle>
          {request.expiresAt && request.status === "PENDING" && (
            <span className="text-xs text-muted-foreground">
              Expires: {formatDate(request.expiresAt)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Requester Info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{request.requester.name}</span>
          <span className="text-muted-foreground">wants to drop</span>
        </div>

        {/* Shift Details */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{request.shift.location.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(request.shift.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(request.shift.startTimeUtc)} - {formatTime(request.shift.endTimeUtc)}
            </span>
          </div>
        </div>

        {/* Manager Note */}
        {request.managerNote && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Manager Note:</span> {request.managerNote}
          </div>
        )}

        {/* Cancelled Reason */}
        {request.cancelledReason && (
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-500">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Cancelled: {request.cancelledReason}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {canClaim && (
            <Button
              size="sm"
              onClick={() => handleAction(() => onClaim?.(request.id))}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4 mr-1" />
              Claim Shift
            </Button>
          )}

          {canApprove && (
            <>
              <Button
                size="sm"
                onClick={() => handleAction(() => onApprove?.(request.id))}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectInput(true)}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(() => onCancel?.(request.id))}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel Request
            </Button>
          )}
        </div>

        {/* Reject Input */}
        {showRejectInput && (
          <div className="space-y-2 pt-2">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction(() => onReject?.(request.id, rejectReason))}
                disabled={isProcessing || !rejectReason.trim()}
              >
                Confirm Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowRejectInput(false)
                  setRejectReason("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
