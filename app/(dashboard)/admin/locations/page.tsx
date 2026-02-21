import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Edit, MapPin, Users, Clock } from "lucide-react"
import { AddLocationModal } from "@/components/locations/AddLocationModal"
import type { Location, LocationAssignment, LocationCertification } from "@prisma/client"

type LocationWithRelations = Location & {
  managers: (LocationAssignment & {
    manager: {
      id: string
      name: string
      email: string
    }
  })[]
  certifications: (LocationCertification & {
    user: {
      id: string
      name: string
    }
  })[]
  _count: {
    shifts: number
  }
}

export default async function AdminLocationsPage() {
  const session = await auth()
  
  const locations: LocationWithRelations[] = await prisma.location.findMany({
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Location Management</h1>
          <p className="text-slate-500 mt-1">Manage restaurant locations</p>
        </div>
        <AddLocationModal />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {locations.map((location) => (
          <Card key={location.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900">{location.name}</CardTitle>
                    <CardDescription className="text-slate-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location.address}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timezone */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-slate-600">{location.timezone}</span>
                </div>

                {/* Managers */}
                {location.managers.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">Managers</p>
                    <div className="flex flex-wrap gap-2">
                      {location.managers.map((m) => (
                        <Badge key={m.id} variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">
                          {m.manager.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff count */}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
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
          <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No locations found</p>
              <p className="text-slate-400 text-sm mt-1">Add your first location to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
