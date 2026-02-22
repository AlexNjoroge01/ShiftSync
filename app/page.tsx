import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Check, 
  X, 
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Globe,
  ChevronRight
} from "lucide-react"

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
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">ShiftSync</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
            <a href="#difference" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">The Difference</a>
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
          </div>
          <Link href="/login">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-sm text-slate-600 mb-8">
                <Sparkles className="h-4 w-4" />
                <span>Built for multi-location restaurants</span>
              </div>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-8">
                Scheduling
                <br />
                <span className="text-slate-400">reimagined.</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 leading-relaxed mb-12">
                ShiftSync transforms how Coastal Eats manages staff across locations. 
                No more conflicts. No more overtime surprises. Just seamless scheduling.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8 h-14 text-base">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="rounded-full px-8 h-14 text-base border-slate-200">
                    See how it works
                  </Button>
                </a>
              </div>
            </div>
            <div className="hidden lg:flex justify-center items-center">
              <img 
                src="/hero-illustration.svg" 
                alt="ShiftSync scheduling dashboard showing weekly shifts across multiple restaurant locations" 
                className="w-full max-w-lg h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Brands/Trust Bar */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-sm text-slate-500">Trusted by restaurant teams across locations</p>
            <div className="flex items-center gap-12 text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span className="text-sm font-medium">5+ Locations</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">100+ Staff</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">1000+ Shifts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Three steps to scheduling bliss
            </h2>
            <p className="text-lg text-slate-500">
              From chaos to clarity in minutes. Our intelligent system handles the complexity so you can focus on running your restaurants.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-2xl font-semibold mb-4">Set up locations</h3>
              <p className="text-slate-500 leading-relaxed">
                Add your restaurant locations, each with their own operating hours, timezone, and staffing requirements. Our system adapts to your unique setup.
              </p>
            </div>
            <div className="group">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-2xl font-semibold mb-4">Add your team</h3>
              <p className="text-slate-500 leading-relaxed">
                Import staff members, define their roles, certifications, and availability. Our smart matching ensures the right people are scheduled for the right shifts.
              </p>
            </div>
            <div className="group">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-2xl font-semibold mb-4">Schedule smarter</h3>
              <p className="text-slate-500 leading-relaxed">
                Create shifts with automatic conflict detection, overtime warnings, and skill matching. Staff can request swaps through a streamlined approval workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Before & After */}
      <section id="difference" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">The difference</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Before vs. After ShiftSync
            </h2>
            <p className="text-lg text-slate-500">
              See the transformation that happens when you switch to intelligent scheduling.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div className="bg-white rounded-3xl p-8 border border-red-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <X className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-red-600">Before</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Spreadsheets scattered across locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Double-bookings discovered at the last minute</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Overtime surprises blowing the labor budget</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Swap requests lost in text messages</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">No visibility into staff certifications</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Timezone confusion for multi-location scheduling</span>
                </li>
              </ul>
            </div>

            {/* After */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-green-400">After</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Unified dashboard for all locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Automatic conflict detection before publishing</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Real-time overtime tracking and alerts</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Streamlined swap request workflow with approvals</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Certification tracking with expiration reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Automatic timezone handling for each location</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Features</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Everything you need
            </h2>
            <p className="text-lg text-slate-500">
              Powerful features designed specifically for multi-location restaurant operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Conflict Detection</h3>
              <p className="text-slate-500">
                Automatically detect double-bookings, availability conflicts, and certification mismatches before they become problems.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Overtime Management</h3>
              <p className="text-slate-500">
                Track hours in real-time with configurable overtime thresholds. Get warnings before you exceed labor budgets.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Staff Certifications</h3>
              <p className="text-slate-500">
                Track food handling certifications, training completions, and skill levels. Get notified before certifications expire.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-Timezone Support</h3>
              <p className="text-slate-500">
                Each location operates in its own timezone. Schedule shifts with confidence, knowing times are always correct.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Role-Based Access</h3>
              <p className="text-slate-500">
                Admins, managers, and staff each see only what they need. Location managers access only their assigned venues.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Swap Workflow</h3>
              <p className="text-slate-500">
                Staff request shift swaps through a structured workflow. Managers approve with full visibility into the impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 rounded-3xl p-12 md:p-16 text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to transform your scheduling?
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Join the restaurants that have already made the switch to intelligent, conflict-free scheduling.
            </p>
            <Link href="/login">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-10 h-14 text-base">
                Get Started Now
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">ShiftSync</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                Multi-location staff scheduling built for modern restaurant operations. 
                Designed with care for Coastal Eats.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-slate-500">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a></li>
                <li><a href="#difference" className="hover:text-slate-900 transition-colors">The Difference</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-slate-500">
                <li><a href="/login" className="hover:text-slate-900 transition-colors">Sign In</a></li>
                <li><span className="text-slate-400">Support</span></li>
                <li><span className="text-slate-400">Privacy</span></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} ShiftSync. Built for Coastal Eats.
            </p>
            <p className="text-sm text-slate-400">
              Crafted with precision for restaurant operations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
