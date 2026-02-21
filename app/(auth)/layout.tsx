import Link from "next/link"
import { Calendar } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-slate-900" />
            </div>
            <span className="text-xl font-semibold tracking-tight">ShiftSync</span>
          </Link>
        </div>
        
        <div className="max-w-md">
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Scheduling made simple for modern restaurants.
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Transform how you manage staff across multiple locations. No more conflicts, 
            no more overtime surprises. Just seamless scheduling.
          </p>
        </div>

        <div className="flex items-center gap-8 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>5+ Locations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>100+ Staff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>1000+ Shifts</span>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight">ShiftSync</span>
            </Link>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
}
