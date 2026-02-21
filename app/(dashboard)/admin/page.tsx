import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Calendar, Shield } from "lucide-react"

export default async function AdminPage() {
  const session = await auth()
  
  // Get stats
  const [userCount, locationCount, shiftCount, auditCount] = await Promise.all([
    prisma.user.count(),
    prisma.location.count(),
    prisma.shift.count(),
    prisma.auditLog.count(),
  ])

  const stats = [
    { label: "Total Users", value: userCount, icon: Users, color: "text-blue-500" },
    { label: "Locations", value: locationCount, icon: Building2, color: "text-green-500" },
    { label: "Total Shifts", value: shiftCount, icon: Calendar, color: "text-purple-500" },
    { label: "Audit Logs", value: auditCount, icon: Shield, color: "text-orange-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Manage users, locations, and system settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription className="text-slate-400">
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <a
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium text-white">Manage Users</p>
              <p className="text-sm text-slate-400">Create, edit, or deactivate users</p>
            </div>
          </a>
          <a
            href="/admin/locations"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <Building2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-white">Manage Locations</p>
              <p className="text-sm text-slate-400">Add or edit restaurant locations</p>
            </div>
          </a>
          <a
            href="/admin/audit"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <Shield className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-white">View Audit Log</p>
              <p className="text-sm text-slate-400">Track all system changes</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}