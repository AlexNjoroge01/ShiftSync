"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginSchema, type LoginInput } from "@/types"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid email or password")
      } else {
        toast.success("Login successful!")
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
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
          Welcome back
        </h1>
        <p className="text-slate-500">
          Sign in to your account to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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

        <Button
          type="submit"
          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-base font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Register link */}
      <div className="text-center">
        <p className="text-sm text-slate-500">
          Do not have an account?{" "}
          <Link href="/register" className="text-slate-900 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>

      {/* Demo credentials */}
      <div className="pt-6 border-t border-slate-100">
        <p className="text-sm text-slate-500 mb-3">Demo credentials:</p>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Admin</span>
            <code className="text-xs bg-slate-200 px-2 py-1 rounded">admin@coastaleats.com</code>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Manager</span>
            <code className="text-xs bg-slate-200 px-2 py-1 rounded">manager@coastaleats.com</code>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Staff</span>
            <code className="text-xs bg-slate-200 px-2 py-1 rounded">staff@coastaleats.com</code>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">Password for all accounts: <code className="bg-slate-100 px-1 rounded">password123</code></p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
