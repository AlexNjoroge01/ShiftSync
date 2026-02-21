import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, User, Mail, Clock, Award, TrendingUp, Eye } from "lucide-react"
import type { User as PrismaUser, LocationCertification, UserSkill } from "@prisma/client"

type StaffMember = PrismaUser & {
  certifications: (LocationCertification & {
    location: {
      id: string
      name: string
      timezone: string
    }
  })[]
  skills: (UserSkill & {
    skill: {
      id: string
      name: string
    }
  })[]
  _count: {
    shiftAssignments: number
  }
}

export default async function ManagerStaffPage() {
  const session = await auth()
  
  // Get manager's locations
  const managedLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  
  const locationIds = managedLocations.map((l) => l.locationId)
  
  // Get staff certified at manager's locations
  const staff: StaffMember[] = await prisma.user.findMany({
    where: {
      role: "STAFF",
      certifications: {
        some: {
          locationId: { in: locationIds },
          revokedAt: null,
        },
      },
    },
    include: {
      certifications: {
        where: {
          locationId: { in: locationIds },
          revokedAt: null,
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              timezone: true,
            },
          },
        },
      },
      skills: {
        include: {
          skill: true,
        },
      },
      _count: {
        select: {
          shiftAssignments: {
            where: {
              status: "ASSIGNED",
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff Overview</h1>
          <p className="text-slate-500 mt-1">View staff certified at your locations</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {staff.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-sm md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No staff found</p>
              <p className="text-slate-400 text-sm mt-1">Staff certified at your locations will appear here</p>
            </CardContent>
          </Card>
        ) : (
          staff.map((member) => (
            <Card key={member.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-slate-900">{member.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Certifications */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-medium flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Certified at
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.certifications.map((cert) => (
                      <Badge
                        key={cert.id}
                        variant="outline"
                        className="border-blue-200 text-blue-600 bg-blue-50 text-xs"
                      >
                        {cert.location.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                {member.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.skills.map((s) => (
                        <Badge
                          key={s.skillId}
                          variant="outline"
                          className="border-slate-200 text-slate-600 text-xs"
                        >
                          {s.skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>
                      {member.desiredHoursPerWeek || "—"} hrs/wk desired
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <span>{member._count.shiftAssignments} shifts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
