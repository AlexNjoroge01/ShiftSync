import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import type { Role } from "@prisma/client"

// Extended session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      locationIds: string[]
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: Role
    locationIds: string[]
  }
}

// Extended JWT type
declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: Role
    locationIds: string[]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            managedLocations: {
              select: { locationId: true },
            },
          },
        })

        if (!user || !user.hashedPassword) {
          return null
        }

        const passwordMatch = await bcrypt.compare(password, user.hashedPassword)

        if (!passwordMatch) {
          return null
        }

        // Get location IDs for managers
        const locationIds = user.role === "MANAGER" 
          ? user.managedLocations.map((l) => l.locationId)
          : []

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locationIds,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.locationIds = user.locationIds
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.locationIds = token.locationIds
      }
      return session
    },
  },
})

// Authorization helpers
export async function requireRole(session: { user: { role: Role } } | null, allowedRoles: Role[]): Promise<void> {
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED")
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("FORBIDDEN")
  }
}

export async function assertLocationAccess(
  session: { user: { id: string; role: Role; locationIds: string[] } } | null,
  locationId: string
): Promise<void> {
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED")
  }
  
  // Admins can access all locations
  if (session.user.role === "ADMIN") {
    return
  }
  
  // Managers can only access their assigned locations
  if (session.user.role === "MANAGER") {
    if (!session.user.locationIds.includes(locationId)) {
      throw new Error("FORBIDDEN")
    }
  }
  
  // Staff can access locations they're certified at
  if (session.user.role === "STAFF") {
    const certification = await prisma.locationCertification.findFirst({
      where: {
        userId: session.user.id,
        locationId,
        revokedAt: null,
      },
    })
    if (!certification) {
      throw new Error("FORBIDDEN")
    }
  }
}

export async function getManagerLocations(userId: string): Promise<string[]> {
  const assignments = await prisma.locationAssignment.findMany({
    where: { managerId: userId },
    select: { locationId: true },
  })
  return assignments.map((a) => a.locationId)
}
