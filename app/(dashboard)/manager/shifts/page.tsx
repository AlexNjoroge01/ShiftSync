import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateShiftModal } from "@/components/shifts/CreateShiftModal"
import { ShiftsList } from "@/components/shifts/ShiftsList"
import type { ShiftWithDetails } from "@/types"

export default async function ManagerShiftsPage() {
  const session = await auth()
  
  // Get manager's locations
  const managedLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  
  const locationIds = managedLocations.map((l) => l.locationId)
  
  // Get locations for the modal
  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, name: true, timezone: true },
  })
  
  // Get skills for the modal
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true },
  })
  
  // Get shifts with all required data
  const shifts = await prisma.shift.findMany({
    where: {
      locationId: { in: locationIds },
    },
    include: {
      location: true,
      assignments: {
        where: { status: "ASSIGNED" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      requiredSkill: true,
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { date: "asc" },
      { startTimeUtc: "asc" },
    ],
    take: 50,
  })

  // Transform shifts to match ShiftWithDetails type
  const transformedShifts: ShiftWithDetails[] = shifts.map((shift) => ({
    id: shift.id,
    locationId: shift.locationId,
    location: {
      id: shift.location.id,
      name: shift.location.name,
      timezone: shift.location.timezone,
      address: shift.location.address,
    },
    date: shift.date,
    startTimeUtc: shift.startTimeUtc,
    endTimeUtc: shift.endTimeUtc,
    requiredSkillId: shift.requiredSkillId,
    requiredSkill: shift.requiredSkill,
    headcount: shift.headcount,
    isPublished: shift.isPublished,
    publishedAt: shift.publishedAt,
    editCutoffHours: shift.editCutoffHours,
    isPremium: shift.isPremium,
    createdBy: shift.createdBy,
    assignments: shift.assignments.map((a) => ({
      id: a.id,
      shiftId: shift.id,
      userId: a.userId,
      status: a.status as "ASSIGNED" | "CANCELLED" | "SWAPPED",
      assignedBy: a.assignedBy,
      assignedAt: a.assignedAt,
      user: a.user,
    })),
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shift Management</h1>
          <p className="text-slate-500 mt-1">Create and manage shifts at your locations</p>
        </div>
        <CreateShiftModal locations={locations} skills={skills} />
      </div>

      <ShiftsList shifts={transformedShifts} skills={skills} />
    </div>
  )
}
