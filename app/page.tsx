import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Users, MapPin, Clock } from "lucide-react"

export default async function HomePage() {
  const session = await auth()

  // Redirect authenticated users to their dashboard
  if (session?.user) {
    switch (session.user.role) {
      case "ADMIN":
        redirect("/admin")
      case "MANAGER":
        redirect("/manager")
      case "STAFF":
        redirect("/staff")
      default:
        redirect("/")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold text-white">ShiftSync</span>
          </div>
          <Link href="/login">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-6">
            Multi-Location Staff Scheduling Made Simple
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            ShiftSync helps Coastal Eats manage staff scheduling across multiple locations
            with intelligent conflict detection, overtime management, and real-time updates.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <Calendar className="h-10 w-10 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Smart Scheduling
            </h3>
            <p className="text-slate-400">
              Create and manage shifts with automatic conflict detection and skill matching.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <Users className="h-10 w-10 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Staff Management
            </h3>
            <p className="text-slate-400">
              Track certifications, skills, and availability across all locations.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <MapPin className="h-10 w-10 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Multi-Location
            </h3>
            <p className="text-slate-400">
              Manage schedules for multiple restaurant locations with timezone support.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <Clock className="h-10 w-10 text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Overtime Control
            </h3>
            <p className="text-slate-400">
              Monitor and manage overtime with warnings and labor law compliance.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-20">
        <div className="container mx-auto px-4 py-6 text-center text-slate-400">
          <p>ShiftSync - Multi-Location Staff Scheduling Platform</p>
        </div>
      </footer>
    </div>
  )
}
