import { sendNotification } from "@/lib/notifications/repository"
import { validateNotificationPayload } from "@/lib/notifications/validation"

const BASE_STYLE = `font-family: Arial, sans-serif; line-height: 1.65; color: #111; max-width: 560px;`
const MUTED = `color: #666; font-size: 0.9em;`

function buildInvoiceEmailHtml(args: {
  clientName: string
  invoiceNumber: string
  amountLabel: string
  dueDate: string
  statusLabel: string
  intro: string
}) {
  return `
    <div style="${BASE_STYLE}">
      <h2 style="margin:0 0 16px;">Saintce Billing Update</h2>
      <p>Hello ${args.clientName},</p>
      <p>${args.intro}</p>
      <table style="border-collapse:collapse; width:100%; margin:16px 0;">
        <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Invoice</td><td style="padding:6px 0;"><strong>${args.invoiceNumber}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Amount</td><td style="padding:6px 0;"><strong>${args.amountLabel}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Status</td><td style="padding:6px 0;">${args.statusLabel}</td></tr>
        <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Due date</td><td style="padding:6px 0;">${args.dueDate}</td></tr>
      </table>
      <p>Log in to your client portal to view and pay your invoice.</p>
      <p style="${MUTED}">Saintce Control</p>
    </div>
  `
}

export async function queueInvoiceNotification(to: string, subject: string, html: string) {
  validateNotificationPayload(to)
  return sendNotification({ to, subject, html })
}

export async function sendIssuedInvoiceNotification(args: {
  to: string
  clientName: string
  invoiceNumber: string
  amountLabel: string
  dueDate: string
  statusLabel: string
}) {
  validateNotificationPayload(args.to)

  return sendNotification({
    to: args.to,
    subject: `New Invoice - ${args.invoiceNumber}`,
    html: buildInvoiceEmailHtml({
      ...args,
      intro: `A new invoice has been issued for your Saintce subscription.`,
    }),
  })
}

export async function sendInvoiceReminder(args: {
  to: string
  clientName: string
  invoiceNumber: string
  amountLabel: string
  dueDate: string
  statusLabel: string
}) {
  validateNotificationPayload(args.to)

  return sendNotification({
    to: args.to,
    subject: `Invoice Reminder — ${args.invoiceNumber}`,
    html: buildInvoiceEmailHtml({
      ...args,
      intro: `This is a reminder that your Saintce invoice is still awaiting payment.`,
    }),
  })
}

export async function sendPaymentSuccessEmail(args: {
  to: string
  clientName: string
  invoiceNumber: string
  amountLabel: string
}) {
  validateNotificationPayload(args.to)

  return sendNotification({
    to: args.to,
    subject: `Payment Received — ${args.invoiceNumber}`,
    html: `
      <div style="${BASE_STYLE}">
        <h2 style="margin:0 0 16px;">Payment Confirmed</h2>
        <p>Hello ${args.clientName},</p>
        <p>We've received your payment. Your subscription is now active and your services remain uninterrupted.</p>
        <table style="border-collapse:collapse; width:100%; margin:16px 0;">
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Invoice</td><td style="padding:6px 0;"><strong>${args.invoiceNumber}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Amount paid</td><td style="padding:6px 0;"><strong>${args.amountLabel}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Status</td><td style="padding:6px 0; color:#16a34a;">Paid</td></tr>
        </table>
        <p style="${MUTED}">Saintce Control</p>
      </div>
    `,
  })
}

export async function sendPaymentFailedEmail(args: {
  to: string
  clientName: string
  invoiceNumber: string
  amountLabel: string
}) {
  validateNotificationPayload(args.to)

  return sendNotification({
    to: args.to,
    subject: `Payment Failed — ${args.invoiceNumber}`,
    html: `
      <div style="${BASE_STYLE}">
        <h2 style="margin:0 0 16px;">Payment Failed</h2>
        <p>Hello ${args.clientName},</p>
        <p>We were unable to process your payment. Please update your payment method or contact us to avoid service suspension.</p>
        <table style="border-collapse:collapse; width:100%; margin:16px 0;">
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Invoice</td><td style="padding:6px 0;"><strong>${args.invoiceNumber}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Amount</td><td style="padding:6px 0;"><strong>${args.amountLabel}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Status</td><td style="padding:6px 0; color:#dc2626;">Failed</td></tr>
        </table>
        <p>Log in to your client portal to retry payment or update your billing details.</p>
        <p style="${MUTED}">Saintce Control</p>
      </div>
    `,
  })
}

export async function sendPaymentReceiptEmail(args: {
  to: string
  clientName: string
  invoiceNumber: string
  amountLabel: string
  paidAt: string
  paymentReference: string | null
  portalUrl: string
}) {
  validateNotificationPayload(args.to)

  const refRow = args.paymentReference
    ? `<tr><td style="padding:6px 12px 6px 0; ${MUTED}">Reference</td><td style="padding:6px 0; font-family:monospace;">${args.paymentReference}</td></tr>`
    : ""

  return sendNotification({
    to: args.to,
    subject: `Payment Receipt — ${args.invoiceNumber}`,
    html: `
      <div style="${BASE_STYLE}">
        <h2 style="margin:0 0 16px;">Payment Receipt</h2>
        <p>Hello ${args.clientName},</p>
        <p>This is your payment receipt for invoice <strong>${args.invoiceNumber}</strong>. Thank you — your services remain active.</p>
        <table style="border-collapse:collapse; width:100%; margin:16px 0;">
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Invoice</td><td style="padding:6px 0;"><strong>${args.invoiceNumber}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Amount paid</td><td style="padding:6px 0;"><strong>${args.amountLabel}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Paid on</td><td style="padding:6px 0;">${args.paidAt}</td></tr>
          ${refRow}
          <tr><td style="padding:6px 12px 6px 0; ${MUTED}">Status</td><td style="padding:6px 0; color:#16a34a;">Paid</td></tr>
        </table>
        <p>You can view and download this invoice from your <a href="${args.portalUrl}" style="color:#4f46e5;">client portal</a>.</p>
        <p style="${MUTED}">Saintce Control</p>
      </div>
    `,
  })
}

export async function sendSubscriptionSuspendedEmail(args: {
  to: string
  clientName: string
  projectName: string
  serviceName: string
}) {
  validateNotificationPayload(args.to)

  return sendNotification({
    to: args.to,
    subject: `Service Suspended — ${args.projectName}`,
    html: `
      <div style="${BASE_STYLE}">
        <h2 style="margin:0 0 16px;">Service Suspended</h2>
        <p>Hello ${args.clientName},</p>
        <p>Your subscription for <strong>${args.serviceName}</strong> on project <strong>${args.projectName}</strong> has been suspended due to an unpaid overdue invoice.</p>
        <p>To reactivate your service, please log in to your client portal and pay the outstanding invoice.</p>
        <p>If you believe this is an error, please contact us immediately.</p>
        <p style="${MUTED}">Saintce Control</p>
      </div>
    `,
  })
}

export async function sendSubscriptionReactivatedEmail(args: {
  to: string
  clientName: string
  projectName: string
  serviceName: string
}) {
  validateNotificationPayload(args.to)

  return sendNotification({
    to: args.to,
    subject: `Service Reactivated — ${args.projectName}`,
    html: `
      <div style="${BASE_STYLE}">
        <h2 style="margin:0 0 16px;">Service Reactivated</h2>
        <p>Hello ${args.clientName},</p>
        <p>Your payment has been received and your subscription for <strong>${args.serviceName}</strong> on project <strong>${args.projectName}</strong> is now active again.</p>
        <p>All services have been restored. Thank you for your payment.</p>
        <p style="${MUTED}">Saintce Control</p>
      </div>
    `,
  })
}
