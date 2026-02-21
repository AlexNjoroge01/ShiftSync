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
  PENDING: "bg-yellow-50 text-yellow-600 border-yellow-200",
  STAFF_ACCEPTED: "bg-blue-50 text-blue-600 border-blue-200",
  MANAGER_APPROVED: "bg-green-50 text-green-600 border-green-200",
  CANCELLED: "bg-slate-50 text-slate-500 border-slate-200",
  EXPIRED: "bg-red-50 text-red-600 border-red-200",
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
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={isDrop ? "border-orange-200 text-orange-600 bg-orange-50" : "border-blue-200 text-blue-600 bg-blue-50"}
            >
              {swapRequest.type}
            </Badge>
            <Badge className={statusColors[swapRequest.status]}>
              {swapRequest.status.replace("_", " ")}
            </Badge>
          </div>
          {swapRequest.expiresAt && isPending && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Expires: {new Date(swapRequest.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Shift details */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-slate-900 font-medium">{swapRequest.shift.location.name}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-slate-600">
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
        <div className="flex items-center gap-2.5 text-sm mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <User className="h-4 w-4 text-slate-500" />
          </div>
          <span className="text-slate-500">Requested by:</span>
          <span className="text-slate-900 font-medium">{swapRequest.requester.name}</span>
        </div>

        {/* SWAP type: show target user */}
        {!isDrop && swapRequest.targetUser && (
          <div className="flex items-center gap-2.5 text-sm mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <ArrowRight className="h-4 w-4 text-blue-600" />
            <span className="text-slate-600">Swap with:</span>
            <span className="text-slate-900 font-medium">{swapRequest.targetUser.name}</span>
          </div>
        )}

        {/* DROP type: show claim button for qualified staff */}
        {isDrop && isPending && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl mb-4">
            <div className="flex items-center gap-2 text-sm text-orange-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Looking for coverage</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-4 border-t border-slate-100">
            {canStaffAccept && onAccept && (
              <Button
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5"
                onClick={() => onAccept(swapRequest.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                Claim Shift
              </Button>
            )}
            {canManagerApprove && onApprove && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white rounded-full px-5"
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
                className="border-red-200 text-red-600 hover:bg-red-50 rounded-full px-5"
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
                className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-full px-5"
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
