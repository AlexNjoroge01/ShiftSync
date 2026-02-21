"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { z } from "zod"
import Link from "next/link"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterInput = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true)

    try {
      // Create the user
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: "STAFF", // New registrations are always staff
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create account")
      }

      // Sign in the user
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Account created but login failed. Please try logging in.")
        router.push("/login")
      } else {
        toast.success("Account created successfully!")
        router.push("/staff")
        router.refresh()
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("An error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Create an account
        </h1>
        <p className="text-slate-500">
          Join ShiftSync to manage your work schedule
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
            {...register("name")}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900 pr-12"
              {...register("password")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900 pr-12"
              {...register("confirmPassword")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-base font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Login link */}
      <div className="text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-slate-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
