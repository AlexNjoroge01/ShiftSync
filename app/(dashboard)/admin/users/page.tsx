import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, UserCog, User } from "lucide-react"
import { AddUserModal } from "@/components/users/AddUserModal"
import { EditUserModal } from "@/components/users/EditUserModal"
import { DeleteUserButton } from "@/components/users/DeleteUserButton"

const roleColors = {
  ADMIN: "bg-red-50 text-red-600 border-red-100",
  MANAGER: "bg-blue-50 text-blue-600 border-blue-100",
  STAFF: "bg-green-50 text-green-600 border-green-100",
}

const roleIconColors = {
  ADMIN: "bg-red-100 text-red-600",
  MANAGER: "bg-blue-100 text-blue-600",
  STAFF: "bg-green-100 text-green-600",
}

const roleIcons = {
  ADMIN: Shield,
  MANAGER: UserCog,
  STAFF: User,
}

export default async function AdminUsersPage() {
  const session = await auth()
  
  const users = await prisma.user.findMany({
    include: {
      managedLocations: {
        include: {
          location: true,
        },
      },
      certifications: {
        where: { revokedAt: null },
        include: {
          location: true,
        },
      },
      skills: {
        include: {
          skill: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { name: "asc" },
    ],
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Create and manage user accounts</p>
        </div>
        <AddUserModal />
      </div>

      <div className="grid gap-4">
        {users.map((user) => {
          const RoleIcon = roleIcons[user.role]
          return (
            <Card key={user.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${roleIconColors[user.role]}`}>
                      <RoleIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                        <Badge className={roleColors[user.role]}>
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-sm">{user.email}</p>
                      
                      {/* Manager locations */}
                      {user.role === "MANAGER" && user.managedLocations.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 mb-1.5 font-medium">Manages:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {user.managedLocations.map((ml) => (
                              <Badge key={ml.id} variant="outline" className="text-xs border-slate-200 text-slate-600 bg-slate-50">
                                {ml.location.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Staff certifications */}
                      {user.role === "STAFF" && user.certifications.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 mb-1.5 font-medium">Certified at:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {user.certifications.map((cert) => (
                              <Badge key={cert.id} variant="outline" className="text-xs border-slate-200 text-slate-600 bg-slate-50">
                                {cert.location.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Staff skills */}
                      {user.role === "STAFF" && user.skills.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 mb-1.5 font-medium">Skills:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {user.skills.map((skill) => (
                              <Badge key={skill.skillId} variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">
                                {skill.skill.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {user.desiredHoursPerWeek && (
                        <p className="text-xs text-slate-500 mt-3">
                          Desired hours: <span className="font-medium text-slate-700">{user.desiredHoursPerWeek}h/week</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <EditUserModal user={user} />
                    <DeleteUserButton userId={user.id} userName={user.name} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {users.length === 0 && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No users found</p>
              <p className="text-slate-400 text-sm mt-1">Add your first user to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
