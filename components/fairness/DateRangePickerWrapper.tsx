"use client"

import * as React from "react"
import { DateRangePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"

interface DateRangePickerWrapperProps {
  defaultFrom: Date
  defaultTo: Date
}

export function DateRangePickerWrapper({ defaultFrom, defaultTo }: DateRangePickerWrapperProps) {
  const [mounted, setMounted] = React.useState(false)
  const [from, setFrom] = React.useState<Date | undefined>(defaultFrom)
  const [to, setTo] = React.useState<Date | undefined>(defaultTo)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-[180px] h-9 border border-slate-200 rounded-md flex items-center px-3 text-sm text-slate-500">
          {format(defaultFrom, "MMM d, yyyy")}
        </div>
        <span className="text-slate-400">-</span>
        <div className="w-[180px] h-9 border border-slate-200 rounded-md flex items-center px-3 text-sm text-slate-500">
          {format(defaultTo, "MMM d, yyyy")}
        </div>
      </div>
    )
  }
  
  return (
    <>
      <input type="hidden" name="from" value={from ? format(from, "yyyy-MM-dd") : ""} />
      <input type="hidden" name="to" value={to ? format(to, "yyyy-MM-dd") : ""} />
      <DateRangePicker
        dateFrom={from}
        dateTo={to}
        onDateFromChange={setFrom}
        onDateToChange={setTo}
      />
    </>
  )
}
