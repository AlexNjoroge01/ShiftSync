"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, MapPin, User, Check, X, AlertCircle } from "lucide-react"
import { formatInTimezone } from "@/lib/timezone"
import type { SwapRequestWithDetails } from "@/types"

interface SwapRequestCardProps {
  swapRequest: SwapRequestWithDetails
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onAccept?: (id: string) => void
  onCancel?: (id: string) => void
  showActions?: boolean
  userRole?: "STAFF" | "MANAGER" | "ADMIN"
}

const statusColors = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  STAFF_ACCEPTED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MANAGER_APPROVED: "bg-green-500/10 text-green-400 border-green-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  EXPIRED: "bg-red-500/10 text-red-400 border-red-500/20",
}

export function SwapRequestCard({
  swapRequest,
  onApprove,
  onReject,
  onAccept,
  onCancel,
  showActions = false,
  userRole,
}: SwapRequestCardProps) {
  const isDrop = swapRequest.type === "DROP"
  const isPending = swapRequest.status === "PENDING"
  const isStaffAccepted = swapRequest.status === "STAFF_ACCEPTED"
  const canStaffAccept = isPending && isDrop && userRole === "STAFF"
  const canManagerApprove = (isPending || isStaffAccepted) && userRole === "MANAGER"
  const canCancel = isPending && userRole === "STAFF"

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={isDrop ? "border-orange-500/50 text-orange-400" : "border-blue-500/50 text-blue-400"}
            >
              {swapRequest.type}
            </Badge>
            <Badge className={statusColors[swapRequest.status]}>
              {swapRequest.status.replace("_", " ")}
            </Badge>
          </div>
          {swapRequest.expiresAt && isPending && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              Expires: {new Date(swapRequest.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Shift details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-500" />
            <span className="text-white">{swapRequest.shift.location.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-slate-300">
              {formatInTimezone(
                swapRequest.shift.startTimeUtc,
                swapRequest.shift.location.timezone,
                "MMM d, yyyy h:mm a"
              )}
              {" - "}
              {formatInTimezone(
                swapRequest.shift.endTimeUtc,
                swapRequest.shift.location.timezone,
                "h:mm a"
              )}
            </span>
          </div>
        </div>

        {/* Requester info */}
        <div className="flex items-center gap-2 text-sm mb-3">
          <User className="h-4 w-4 text-slate-500" />
          <span className="text-slate-400">Requested by:</span>
          <span className="text-white">{swapRequest.requester.name}</span>
        </div>

        {/* SWAP type: show target user */}
        {!isDrop && swapRequest.targetUser && (
          <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-slate-700/50 rounded">
            <ArrowRight className="h-4 w-4 text-blue-500" />
            <span className="text-slate-400">Swap with:</span>
            <span className="text-white">{swapRequest.targetUser.name}</span>
          </div>
        )}

        {/* DROP type: show claim button for qualified staff */}
        {isDrop && isPending && (
          <div className="p-2 bg-orange-900/20 border border-orange-700/50 rounded mb-3">
            <div className="flex items-center gap-2 text-sm text-orange-300">
              <AlertCircle className="h-4 w-4" />
              <span>Looking for coverage</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t border-slate-700">
            {canStaffAccept && onAccept && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => onAccept(swapRequest.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                Claim Shift
              </Button>
            )}
            {canManagerApprove && onApprove && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onApprove(swapRequest.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            {(canManagerApprove || canCancel) && onReject && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                onClick={() => onReject(swapRequest.id)}
              >
                <X className="h-4 w-4 mr-1" />
                {userRole === "MANAGER" ? "Reject" : "Cancel"}
              </Button>
            )}
            {canCancel && onCancel && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => onCancel(swapRequest.id)}
              >
                Cancel Request
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
