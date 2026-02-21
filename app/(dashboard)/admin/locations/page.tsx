import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Edit, MapPin, Users, Clock } from "lucide-react"

export default async function AdminLocationsPage() {
  const session = await auth()
  
  const locations = await prisma.location.findMany({
    include: {
      managers: {
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      certifications: {
        where: { revokedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          shifts: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Location Management</h1>
          <p className="text-slate-400 mt-1">Manage restaurant locations</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {locations.map((location) => (
          <Card key={location.id} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{location.name}</CardTitle>
                    <CardDescription className="text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {location.address}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timezone */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-400">{location.timezone}</span>
                </div>

                {/* Managers */}
                {location.managers.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Managers</p>
                    <div className="flex flex-wrap gap-2">
                      {location.managers.map((m) => (
                        <Badge key={m.id} variant="outline" className="border-blue-600/50 text-blue-400">
                          {m.manager.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff count */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400">
                      {location.certifications.length} certified staff
                    </span>
                  </div>
                  <span className="text-slate-500">
                    {location._count.shifts} shifts
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {locations.length === 0 && (
          <Card className="bg-slate-800 border-slate-700 md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No locations found</p>
              <p className="text-slate-500 text-sm">Add your first location to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
