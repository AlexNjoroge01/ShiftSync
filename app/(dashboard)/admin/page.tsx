import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Calendar, Shield, ArrowRight } from "lucide-react"
import Link from "next/link"

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
    { label: "Total Users", value: userCount, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Locations", value: locationCount, icon: Building2, color: "bg-green-50 text-green-600" },
    { label: "Total Shifts", value: shiftCount, icon: Calendar, color: "bg-purple-50 text-purple-600" },
    { label: "Audit Logs", value: auditCount, icon: Shield, color: "bg-orange-50 text-orange-600" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage users, locations, and system settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Quick Actions</CardTitle>
          <CardDescription className="text-slate-500">
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/users"
            className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Manage Users</p>
              <p className="text-sm text-slate-500">Create, edit, or deactivate users</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/admin/locations"
            className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Manage Locations</p>
              <p className="text-sm text-slate-500">Add or edit restaurant locations</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/admin/audit"
            className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">View Audit Log</p>
              <p className="text-sm text-slate-500">Track all system changes</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
