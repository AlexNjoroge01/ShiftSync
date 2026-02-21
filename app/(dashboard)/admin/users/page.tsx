import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Plus, Edit, Shield, UserCog, User } from "lucide-react"

const roleColors = {
  ADMIN: "bg-red-500/10 text-red-400 border-red-500/20",
  MANAGER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  STAFF: "bg-green-500/10 text-green-400 border-green-500/20",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-1">Create and manage user accounts</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => {
          const RoleIcon = roleIcons[user.role]
          return (
            <Card key={user.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center">
                      <RoleIcon className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                        <Badge className={roleColors[user.role]}>
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                      
                      {/* Manager locations */}
                      {user.role === "MANAGER" && user.managedLocations.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Manages:</p>
                          <div className="flex flex-wrap gap-1">
                            {user.managedLocations.map((ml) => (
                              <Badge key={ml.id} variant="outline" className="text-xs border-slate-600 text-slate-300">
                                {ml.location.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Staff certifications */}
                      {user.role === "STAFF" && user.certifications.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Certified at:</p>
                          <div className="flex flex-wrap gap-1">
                            {user.certifications.map((cert) => (
                              <Badge key={cert.id} variant="outline" className="text-xs border-slate-600 text-slate-300">
                                {cert.location.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Staff skills */}
                      {user.role === "STAFF" && user.skills.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {user.skills.map((skill) => (
                              <Badge key={skill.skillId} variant="outline" className="text-xs border-blue-600/50 text-blue-400">
                                {skill.skill.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {user.desiredHoursPerWeek && (
                        <p className="text-xs text-slate-500 mt-2">
                          Desired hours: {user.desiredHoursPerWeek}h/week
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {users.length === 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No users found</p>
              <p className="text-slate-500 text-sm">Add your first user to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
