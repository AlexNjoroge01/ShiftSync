import { Resend } from "resend"

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

interface NotificationEmailData {
  userName: string
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
}

/**
 * Send an email notification
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set - email not sent")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "ShiftSync <notifications@shiftsync.coastaleats.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error("Failed to send email:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send email:", error)
    return { success: false, error: "Failed to send email" }
  }
}

/**
 * Send a notification email using a template
 */
export async function sendNotificationEmail(
  email: string,
  data: NotificationEmailData
): Promise<{ success: boolean; error?: string }> {
  const html = generateNotificationEmailHtml(data)
  const text = generateNotificationEmailText(data)

  return sendEmail({
    to: email,
    subject: data.title,
    html,
    text,
  })
}

/**
 * Generate HTML for notification email
 */
function generateNotificationEmailHtml(data: NotificationEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">ShiftSync</h1>
      </div>
      
      <div style="border-top: 3px solid #3b82f6; padding-top: 20px;">
        <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 15px;">${data.title}</h2>
        
        <p style="color: #4a4a4a; font-size: 16px; margin-bottom: 20px;">
          Hi ${data.userName},
        </p>
        
        <p style="color: #4a4a4a; font-size: 16px; margin-bottom: 20px;">
          ${data.message}
        </p>
        
        ${data.actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.actionUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            ${data.actionLabel || "View Details"}
          </a>
        </div>
        ` : ''}
      </div>
      
      <div style="border-top: 1px solid #e5e5e5; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="color: #888888; font-size: 14px; margin: 0;">
          This is an automated message from ShiftSync.
        </p>
        <p style="color: #888888; font-size: 12px; margin: 10px 0 0 0;">
          Coastal Eats Staff Scheduling Platform
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text for notification email
 */
function generateNotificationEmailText(data: NotificationEmailData): string {
  let text = `
ShiftSync - ${data.title}

Hi ${data.userName},

${data.message}
`

  if (data.actionUrl) {
    text += `\n${data.actionLabel || "View Details"}: ${data.actionUrl}\n`
  }

  text += `
---
This is an automated message from ShiftSync.
Coastal Eats Staff Scheduling Platform
  `.trim()

  return text
}

/**
 * Send shift assigned notification
 */
export async function sendShiftAssignedEmail(
  email: string,
  userName: string,
  shiftDetails: {
    location: string
    date: string
    startTime: string
    endTime: string
  }
): Promise<{ success: boolean; error?: string }> {
  return sendNotificationEmail(email, {
    userName,
    title: "New Shift Assigned",
    message: `You have been assigned to a shift at ${shiftDetails.location} on ${shiftDetails.date} from ${shiftDetails.startTime} to ${shiftDetails.endTime}.`,
    actionUrl: `${process.env.NEXTAUTH_URL}/staff/schedule`,
    actionLabel: "View Schedule",
  })
}

/**
 * Send swap request notification
 */
export async function sendSwapRequestEmail(
  email: string,
  userName: string,
  swapDetails: {
    requesterName: string
    shiftDetails: string
    type: "SWAP" | "DROP"
  }
): Promise<{ success: boolean; error?: string }> {
  const action = swapDetails.type === "SWAP" ? "swap request" : "drop request"
  
  return sendNotificationEmail(email, {
    userName,
    title: `New ${swapDetails.type === "SWAP" ? "Swap" : "Drop"} Request`,
    message: `${swapDetails.requesterName} has submitted a ${action} for ${swapDetails.shiftDetails}.`,
    actionUrl: `${process.env.NEXTAUTH_URL}/staff/swaps`,
    actionLabel: "View Request",
  })
}

/**
 * Send overtime warning notification
 */
export async function sendOvertimeWarningEmail(
  email: string,
  userName: string,
  overtimeDetails: {
    currentHours: number
    projectedHours: number
    overtimeHours: number
  }
): Promise<{ success: boolean; error?: string }> {
  return sendNotificationEmail(email, {
    userName,
    title: "Overtime Warning",
    message: `You are projected to work ${overtimeDetails.projectedHours.toFixed(1)} hours this week, which includes ${overtimeDetails.overtimeHours.toFixed(1)} hours of overtime. Your current scheduled hours are ${overtimeDetails.currentHours.toFixed(1)}.`,
    actionUrl: `${process.env.NEXTAUTH_URL}/staff/schedule`,
    actionLabel: "View Schedule",
  })
}

/**
 * Send schedule published notification
 */
export async function sendSchedulePublishedEmail(
  email: string,
  userName: string,
  scheduleDetails: {
    weekStart: string
    location: string
  }
): Promise<{ success: boolean; error?: string }> {
  return sendNotificationEmail(email, {
    userName,
    title: "Schedule Published",
    message: `The schedule for the week of ${scheduleDetails.weekStart} at ${scheduleDetails.location} has been published. Please review your assigned shifts.`,
    actionUrl: `${process.env.NEXTAUTH_URL}/staff/schedule`,
    actionLabel: "View Schedule",
  })
}
