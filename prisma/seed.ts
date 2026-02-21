import { PrismaClient, Role, NotificationPreference } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Starting seed...")

  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.overtimeOverride.deleteMany()
  await prisma.swapRequest.deleteMany()
  await prisma.shiftAssignment.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.availabilityException.deleteMany()
  await prisma.availability.deleteMany()
  await prisma.userSkill.deleteMany()
  await prisma.locationCertification.deleteMany()
  await prisma.locationAssignment.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.location.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  console.log("Cleaned existing data")

  // Create Skills
  const skills = await Promise.all([
    prisma.skill.create({ data: { name: "Bartender" } }),
    prisma.skill.create({ data: { name: "Server" } }),
    prisma.skill.create({ data: { name: "Host" } }),
    prisma.skill.create({ data: { name: "Cook" } }),
    prisma.skill.create({ data: { name: "Dishwasher" } }),
    prisma.skill.create({ data: { name: "Manager on Duty" } }),
  ])

  console.log(`Created ${skills.length} skills`)

  // Create Locations
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: "Coastal Eats Downtown",
        address: "123 Main St, New York, NY 10001",
        timezone: "America/New_York",
      },
    }),
    prisma.location.create({
      data: {
        name: "Coastal Eats Midtown",
        address: "456 5th Ave, New York, NY 10018",
        timezone: "America/New_York",
      },
    }),
    prisma.location.create({
      data: {
        name: "Coastal Eats West Side",
        address: "789 Ocean Ave, Los Angeles, CA 90024",
        timezone: "America/Los_Angeles",
      },
    }),
    prisma.location.create({
      data: {
        name: "Coastal Eats Venice",
        address: "321 Boardwalk, Venice, CA 90291",
        timezone: "America/Los_Angeles",
      },
    }),
  ])

  console.log(`Created ${locations.length} locations`)

  // Hash password for all users
  const hashedPassword = await bcrypt.hash("password123", 10)

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@coastaleats.com",
      hashedPassword,
      role: Role.ADMIN,
      notificationPreference: NotificationPreference.IN_APP_EMAIL,
    },
  })

  console.log("Created admin user")

  // Create Managers
  const managers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Sarah Johnson",
        email: "sarah.johnson@coastaleats.com",
        hashedPassword,
        role: Role.MANAGER,
        notificationPreference: NotificationPreference.IN_APP_EMAIL,
        managedLocations: {
          create: [
            { locationId: locations[0].id }, // Downtown
            { locationId: locations[2].id }, // West Side
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Michael Chen",
        email: "michael.chen@coastaleats.com",
        hashedPassword,
        role: Role.MANAGER,
        notificationPreference: NotificationPreference.IN_APP_EMAIL,
        managedLocations: {
          create: [
            { locationId: locations[1].id }, // Midtown
            { locationId: locations[3].id }, // Venice
          ],
        },
      },
    }),
  ])

  console.log(`Created ${managers.length} managers`)

  // Create Staff Members
  const staffData = [
    // Staff certified at both ET locations
    {
      name: "Emma Wilson",
      email: "emma.wilson@coastaleats.com",
      skills: ["Bartender", "Server"],
      certifications: [locations[0].id, locations[1].id],
      desiredHours: 35,
    },
    {
      name: "James Brown",
      email: "james.brown@coastaleats.com",
      skills: ["Server", "Host"],
      certifications: [locations[0].id, locations[1].id],
      desiredHours: 30,
    },
    // Staff certified at both PT locations
    {
      name: "Sofia Martinez",
      email: "sofia.martinez@coastaleats.com",
      skills: ["Bartender", "Server"],
      certifications: [locations[2].id, locations[3].id],
      desiredHours: 40,
    },
    {
      name: "David Kim",
      email: "david.kim@coastaleats.com",
      skills: ["Cook"],
      certifications: [locations[2].id, locations[3].id],
      desiredHours: 35,
    },
    // Staff approaching overtime (34h already scheduled)
    {
      name: "Lisa Thompson",
      email: "lisa.thompson@coastaleats.com",
      skills: ["Server", "Host"],
      certifications: [locations[0].id],
      desiredHours: 40,
    },
    // Staff with pending swap request
    {
      name: "Robert Davis",
      email: "robert.davis@coastaleats.com",
      skills: ["Bartender"],
      certifications: [locations[1].id],
      desiredHours: 25,
    },
    // Staff with Saturday night premium shifts heavily skewed
    {
      name: "Jennifer Lee",
      email: "jennifer.lee@coastaleats.com",
      skills: ["Server"],
      certifications: [locations[0].id],
      desiredHours: 30,
    },
    // More staff
    {
      name: "Chris Anderson",
      email: "chris.anderson@coastaleats.com",
      skills: ["Dishwasher"],
      certifications: [locations[0].id, locations[1].id],
      desiredHours: 25,
    },
    {
      name: "Amanda White",
      email: "amanda.white@coastaleats.com",
      skills: ["Host", "Server"],
      certifications: [locations[2].id],
      desiredHours: 20,
    },
    {
      name: "Daniel Garcia",
      email: "daniel.garcia@coastaleats.com",
      skills: ["Cook", "Manager on Duty"],
      certifications: [locations[3].id],
      desiredHours: 40,
    },
    {
      name: "Michelle Taylor",
      email: "michelle.taylor@coastaleats.com",
      skills: ["Bartender"],
      certifications: [locations[1].id, locations[3].id],
      desiredHours: 30,
    },
    {
      name: "Kevin Robinson",
      email: "kevin.robinson@coastaleats.com",
      skills: ["Server"],
      certifications: [locations[0].id],
      desiredHours: 35,
    },
  ]

  const staff = []
  for (const data of staffData) {
    const skillIds = skills.filter((s) => data.skills.includes(s.name)).map((s) => s.id)
    
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: Role.STAFF,
        desiredHoursPerWeek: data.desiredHours,
        notificationPreference: NotificationPreference.IN_APP,
        skills: {
          create: skillIds.map((skillId) => ({ skillId })),
        },
        certifications: {
          create: data.certifications.map((locationId) => ({ locationId })),
        },
      },
      include: {
        certifications: true,
      },
    })
    staff.push(user)
  }

  console.log(`Created ${staff.length} staff members`)

  // Create availability for staff
  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] // Sunday to Saturday
  for (const staffMember of staff) {
    // Create general availability (weekdays 9am-5pm, weekends flexible)
    for (const day of daysOfWeek) {
      // Skip some days randomly to create variety
      if (Math.random() > 0.8) continue
      
      const isWeekend = day === 0 || day === 6
      const startTime = isWeekend ? "10:00" : "09:00"
      const endTime = isWeekend ? "22:00" : "17:00"
      
      await prisma.availability.create({
        data: {
          userId: staffMember.id,
          dayOfWeek: day,
          startTime,
          endTime,
          timezone: "America/New_York", // Simplified
        },
      })
    }
  }

  console.log("Created availability records")

  // Create shifts for current week and next week
  const now = new Date()
  const currentWeekStart = new Date(now)
  currentWeekStart.setDate(now.getDate() - now.getDay())
  currentWeekStart.setHours(0, 0, 0, 0)

  const nextWeekStart = new Date(currentWeekStart)
  nextWeekStart.setDate(currentWeekStart.getDate() + 7)

  // Helper to create shift
  async function createShift(
    locationId: string,
    date: Date,
    startHour: number,
    endHour: number,
    skillName: string | null,
    headcount: number,
    isPublished: boolean = true
  ) {
    const skill = skillName ? skills.find((s) => s.name === skillName) : null
    
    const startTimeUtc = new Date(date)
    startTimeUtc.setHours(startHour, 0, 0, 0)
    
    const endTimeUtc = new Date(date)
    endTimeUtc.setHours(endHour, 0, 0, 0)
    
    // Handle overnight shifts
    if (endHour <= startHour) {
      endTimeUtc.setDate(endTimeUtc.getDate() + 1)
    }

    const location = locations.find((l) => l.id === locationId)!
    
    // Check if premium (Fri/Sat evening)
    const dayOfWeek = date.getDay()
    const isPremium = (dayOfWeek === 5 || dayOfWeek === 6) && startHour >= 17

    return prisma.shift.create({
      data: {
        locationId,
        date,
        startTimeUtc,
        endTimeUtc,
        requiredSkillId: skill?.id || null,
        headcount,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        isPremium,
        createdById: admin.id,
      },
    })
  }

  // Create shifts for current week
  const shifts = []
  
  // Downtown location shifts
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    
    // Lunch shift
    shifts.push(await createShift(locations[0].id, date, 11, 15, "Server", 2))
    shifts.push(await createShift(locations[0].id, date, 11, 15, "Cook", 1))
    
    // Dinner shift
    shifts.push(await createShift(locations[0].id, date, 17, 22, "Server", 3))
    shifts.push(await createShift(locations[0].id, date, 17, 22, "Bartender", 1))
    shifts.push(await createShift(locations[0].id, date, 17, 22, "Cook", 2))
  }

  // Overnight shift (Friday)
  const fridayDate = new Date(currentWeekStart)
  fridayDate.setDate(fridayDate.getDate() + 5)
  shifts.push(await createShift(locations[0].id, fridayDate, 23, 3, "Bartender", 1))

  // Premium shifts (Friday and Saturday evenings)
  const saturdayDate = new Date(currentWeekStart)
  saturdayDate.setDate(saturdayDate.getDate() + 6)
  shifts.push(await createShift(locations[0].id, fridayDate, 18, 23, "Server", 2))
  shifts.push(await createShift(locations[0].id, saturdayDate, 18, 23, "Server", 2))
  shifts.push(await createShift(locations[0].id, saturdayDate, 18, 23, "Bartender", 1))

  // Midtown location shifts
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    
    shifts.push(await createShift(locations[1].id, date, 11, 15, "Server", 2))
    shifts.push(await createShift(locations[1].id, date, 17, 22, "Server", 2))
    shifts.push(await createShift(locations[1].id, date, 17, 22, "Bartender", 1))
  }

  // West Side location shifts
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    
    shifts.push(await createShift(locations[2].id, date, 10, 14, "Host", 1))
    shifts.push(await createShift(locations[2].id, date, 18, 23, "Server", 2))
  }

  // Venice location shifts
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    
    shifts.push(await createShift(locations[3].id, date, 11, 16, "Server", 2))
    shifts.push(await createShift(locations[3].id, date, 17, 22, "Bartender", 1))
  }

  console.log(`Created ${shifts.length} shifts`)

  // Create shift assignments
  // Assign Lisa Thompson (approaching overtime) to many shifts
  const lisa = staff.find((s) => s.name === "Lisa Thompson")!
  const downtownShifts = shifts.filter((s) => s.locationId === locations[0].id)
  
  for (let i = 0; i < 5; i++) {
    const shift = downtownShifts[i]
    if (shift) {
      await prisma.shiftAssignment.create({
        data: {
          shiftId: shift.id,
          userId: lisa.id,
          assignedBy: managers[0].id,
          status: "ASSIGNED",
        },
      })
    }
  }

  // Assign Jennifer Lee to premium shifts (skewed)
  const jennifer = staff.find((s) => s.name === "Jennifer Lee")!
  const premiumShifts = shifts.filter((s) => s.isPremium)
  
  for (const shift of premiumShifts.slice(0, 3)) {
    await prisma.shiftAssignment.create({
      data: {
        shiftId: shift.id,
        userId: jennifer.id,
        assignedBy: managers[0].id,
        status: "ASSIGNED",
      },
    })
  }

  // Assign other staff to shifts
  for (const shift of shifts.slice(0, 30)) {
    // Find certified staff with required skill
    const certifiedStaff = staff.filter((s) => {
      // Check certification
      const cert = s.certifications?.some((c: { locationId: string }) => c.locationId === shift.locationId)
      return cert
    })

    if (certifiedStaff.length > 0) {
      const randomStaff = certifiedStaff[Math.floor(Math.random() * certifiedStaff.length)]
      
      // Check if already assigned
      const existing = await prisma.shiftAssignment.findUnique({
        where: {
          shiftId_userId: {
            shiftId: shift.id,
            userId: randomStaff.id,
          },
        },
      })

      if (!existing) {
        await prisma.shiftAssignment.create({
          data: {
            shiftId: shift.id,
            userId: randomStaff.id,
            assignedBy: managers[0].id,
            status: "ASSIGNED",
          },
        })
      }
    }
  }

  console.log("Created shift assignments")

  // Create a pending swap request for Robert Davis
  const robert = staff.find((s) => s.name === "Robert Davis")!
  const robertAssignment = await prisma.shiftAssignment.findFirst({
    where: { userId: robert.id },
  })

  if (robertAssignment) {
    const shift = shifts.find((s) => s.id === robertAssignment.shiftId)
    if (shift) {
      await prisma.swapRequest.create({
        data: {
          type: "DROP",
          requesterId: robert.id,
          shiftId: shift.id,
          shiftAssignmentId: robertAssignment.id,
          status: "PENDING",
          expiresAt: new Date(shift.startTimeUtc.getTime() - 24 * 60 * 60 * 1000),
        },
      })
    }
  }

  console.log("Created swap request")

  // Create a double-booking scenario for testing
  const emma = staff.find((s) => s.name === "Emma Wilson")!
  const overlappingShifts = downtownShifts.slice(0, 2)
  
  // These would create a double-booking if assigned
  console.log("Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
