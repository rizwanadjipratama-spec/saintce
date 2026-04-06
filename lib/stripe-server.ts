import "server-only"

import Stripe from "stripe"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getBaseUrl } from "@/lib/site-config"
import {
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendSubscriptionSuspendedEmail,
  sendSubscriptionReactivatedEmail,
} from "@/lib/notifications/service"

let stripeClient: Stripe | null = null

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}

type InvoiceCheckoutContext = {
  id: string
  invoice_number: string
  amount: number
  status: string
  due_date: string
  subscription_id: string
  stripe_checkout_session_id: string | null
  subscription: {
    id: string
    service: {
      id: string
      name: string
      project: {
        id: string
        name: string
        client: {
          id: string
          name: string
          email: string | null
          stripe_customer_id: string | null
        } | null
      } | null
    } | null
  } | null
}

type SubscriptionCheckoutContext = {
  id: string
  service_id: string
  status: string
  price: number
  billing_interval: "monthly" | "yearly" | "one_time"
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  service: {
    id: string
    name: string
    description: string | null
    stripe_product_id: string | null
    project: {
      id: string
      name: string
      client: {
        id: string
        name: string
        email: string | null
        stripe_customer_id: string | null
      } | null
    } | null
  } | null
}

interface RpcCapableClient {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
}

type StripeWebhookResult = {
  eventType: string
  duplicate: boolean
}

function getStripeInvoiceSubscriptionId(stripeInvoice: Stripe.Invoice) {
  const invoiceRecord = stripeInvoice as unknown as Record<string, unknown>
  const subscriptionValue = invoiceRecord.subscription

  if (typeof subscriptionValue === "string") {
    return subscriptionValue
  }

  if (subscriptionValue && typeof subscriptionValue === "object") {
    const subscriptionRecord = subscriptionValue as Record<string, unknown>
    return typeof subscriptionRecord.id === "string" ? subscriptionRecord.id : null
  }

  return null
}

function getStripeInvoicePaymentIntentId(stripeInvoice: Stripe.Invoice) {
  const invoiceRecord = stripeInvoice as unknown as Record<string, unknown>
  const paymentIntentValue = invoiceRecord.payment_intent

  if (typeof paymentIntentValue === "string") {
    return paymentIntentValue
  }

  if (paymentIntentValue && typeof paymentIntentValue === "object") {
    const paymentIntentRecord = paymentIntentValue as Record<string, unknown>
    return typeof paymentIntentRecord.id === "string" ? paymentIntentRecord.id : null
  }

  return null
}

async function getInvoiceCheckoutContext(invoiceId: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("invoices")
    .select(`
      id,
      invoice_number,
      amount,
      status,
      due_date,
      subscription_id,
      stripe_checkout_session_id,
      subscription:subscriptions(
        id,
        service_id,
        service:services(
          id,
          name,
          project_id,
          project:projects(
            id,
            name,
            client_id,
            client:clients(id, name, email, stripe_customer_id)
          )
        )
      )
    `)
    .eq("id", invoiceId)
    .single()

  if (error || !data) {
    throw error || new Error("Invoice not found.")
  }

  return data as unknown as InvoiceCheckoutContext
}

async function getSubscriptionCheckoutContext(subscriptionId: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("subscriptions")
    .select(`
      id,
      service_id,
      status,
      price,
      billing_interval,
      stripe_subscription_id,
      stripe_price_id,
      service:services(
        id,
        name,
        description,
        stripe_product_id,
        project:projects(
          id,
          name,
          client:clients(id, name, email, stripe_customer_id)
        )
      )
    `)
    .eq("id", subscriptionId)
    .single()

  if (error || !data) {
    throw error || new Error("Subscription not found.")
  }

  return data as unknown as SubscriptionCheckoutContext
}

async function ensureStripeCustomer(client: { id: string; name: string; email: string | null; stripe_customer_id: string | null }) {
  const stripe = getStripeClient()
  const admin = getSupabaseAdmin()

  if (client.stripe_customer_id) {
    return client.stripe_customer_id
  }

  const customer = await stripe.customers.create({
    name: client.name,
    email: client.email || undefined,
    metadata: {
      client_id: client.id,
    },
  })

  const { error } = await admin
    .from("clients")
    .update({ stripe_customer_id: customer.id } as never)
    .eq("id", client.id)

  if (error) {
    throw error
  }

  return customer.id
}

async function ensureStripeProduct(service: { id: string; name: string; description: string | null; stripe_product_id: string | null }) {
  const stripe = getStripeClient()
  const admin = getSupabaseAdmin()

  if (service.stripe_product_id) {
    return service.stripe_product_id
  }

  const product = await stripe.products.create({
    name: service.name,
    description: service.description || undefined,
    metadata: {
      service_id: service.id,
    },
  })

  const { error } = await admin
    .from("services")
    .update({ stripe_product_id: product.id } as never)
    .eq("id", service.id)

  if (error) {
    throw error
  }

  return product.id
}

async function ensureStripeRecurringPrice(subscription: SubscriptionCheckoutContext) {
  const stripe = getStripeClient()
  const admin = getSupabaseAdmin()

  if (subscription.stripe_price_id) {
    return subscription.stripe_price_id
  }

  const service = subscription.service
  if (!service) {
    throw new Error("Subscription service context is missing.")
  }

  const productId = await ensureStripeProduct({
    id: service.id,
    name: service.name,
    description: service.description,
    stripe_product_id: service.stripe_product_id,
  })

  const interval = subscription.billing_interval === "yearly" ? "year" : "month"

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: Math.round(Number(subscription.price) * 100),
    recurring: { interval },
    product: productId,
    metadata: {
      internal_subscription_id: subscription.id,
      service_id: subscription.service_id,
    },
  })

  const { error } = await admin
    .from("subscriptions")
    .update({ stripe_price_id: price.id } as never)
    .eq("id", subscription.id)

  if (error) {
    throw error
  }

  return price.id
}

async function upsertInternalInvoiceFromStripeInvoice(stripeInvoice: Stripe.Invoice) {
  const admin = getSupabaseAdmin()
  const stripeInvoiceId = stripeInvoice.id
  const stripeSubscriptionId = getStripeInvoiceSubscriptionId(stripeInvoice)

  if (!stripeSubscriptionId) {
    return null
  }

  const { data: existingInvoiceResult } = await admin
    .from("invoices")
    .select("id, subscription_id")
    .eq("stripe_invoice_id", stripeInvoiceId)
    .maybeSingle()

  const existingInvoice = existingInvoiceResult as { id?: string } | null

  if (existingInvoice?.id) {
    return existingInvoice.id as string
  }

  const { data: internalSubscriptionResult, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle()

  const internalSubscription = internalSubscriptionResult as { id?: string } | null

  if (subscriptionError || !internalSubscription?.id) {
    return null
  }

  const invoiceDateUnix = stripeInvoice.status_transitions?.finalized_at || stripeInvoice.created
  const issueDate = new Date(invoiceDateUnix * 1000).toISOString().slice(0, 10)
  const dueDate = stripeInvoice.due_date
    ? new Date(stripeInvoice.due_date * 1000).toISOString().slice(0, 10)
    : issueDate

  const rpcAdmin = admin as unknown as RpcCapableClient
  const { data: newInvoiceId, error: invoiceError } = await rpcAdmin.rpc("create_manual_invoice", {
    p_subscription_id: internalSubscription.id,
    p_amount: Number(((stripeInvoice.amount_due || stripeInvoice.amount_paid || 0) / 100).toFixed(2)),
    p_issue_date: issueDate,
    p_due_date: dueDate,
  })

  if (invoiceError || !newInvoiceId) {
    throw invoiceError || new Error("Unable to create internal invoice from Stripe invoice.")
  }

  const isPaidInvoice = stripeInvoice.status === "paid"
  const nextStatus = isPaidInvoice ? "paid" : stripeInvoice.status === "void" ? "void" : stripeInvoice.status === "open" ? "issued" : "draft"

  const { error: updateError } = await admin
    .from("invoices")
    .update({
      stripe_invoice_id: stripeInvoiceId,
      status: nextStatus,
      paid_at: isPaidInvoice ? new Date().toISOString() : null,
    } as never)
    .eq("id", newInvoiceId as string)

  if (updateError) {
    throw updateError
  }

  return newInvoiceId as string
}

async function insertStripeWebhookEvent(event: Stripe.Event, payload: string) {
  const admin = getSupabaseAdmin()
  const parsedPayload = JSON.parse(payload) as Record<string, unknown>
  const { error } = await admin
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      api_version: event.api_version ?? null,
      processing_status: "processing",
      payload: parsedPayload,
      error_message: null,
      processed_at: null,
      failed_at: null,
    } as never)

  if (!error) {
    return true
  }

  if (error.code === "23505") {
    return false
  }

  throw error
}

async function markStripeWebhookProcessed(eventId: string) {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      failed_at: null,
      error_message: null,
    } as never)
    .eq("event_id", eventId)

  if (error) {
    throw error
  }
}

async function markStripeWebhookFailed(eventId: string, errorMessage: string) {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      processing_status: "failed",
      failed_at: new Date().toISOString(),
      error_message: errorMessage,
    } as never)
    .eq("event_id", eventId)

  if (error) {
    throw error
  }
}

export async function createStripeCheckoutSession(invoiceId: string) {
  const invoice = await getInvoiceCheckoutContext(invoiceId)

  if (invoice.status === "paid" || invoice.status === "void") {
    throw new Error("Only unpaid invoices can create Stripe checkout sessions.")
  }

  const client = invoice.subscription?.service?.project?.client
  if (!client) {
    throw new Error("Invoice is missing client context.")
  }

  const stripe = getStripeClient()
  const admin = getSupabaseAdmin()
  const customerId = await ensureStripeCustomer(client)

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    success_url: `${getBaseUrl()}/admin/invoices?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getBaseUrl()}/admin/invoices?checkout=cancelled`,
    metadata: {
      invoice_id: invoice.id,
      subscription_id: invoice.subscription_id,
      client_id: client.id,
    },
    payment_intent_data: {
      metadata: {
        invoice_id: invoice.id,
        subscription_id: invoice.subscription_id,
        client_id: client.id,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: {
            name: invoice.subscription?.service?.name || `Invoice ${invoice.invoice_number}`,
            description: `Saintce invoice ${invoice.invoice_number} for ${invoice.subscription?.service?.project?.name || "project"}`,
          },
          unit_amount: Math.round(Number(invoice.amount) * 100),
        },
      },
    ],
  })

  const { error } = await admin
    .from("invoices")
    .update({ stripe_checkout_session_id: session.id } as never)
    .eq("id", invoice.id)

  if (error) {
    throw error
  }

  return {
    id: session.id,
    url: session.url,
  }
}

export async function createStripeSubscriptionCheckoutSession(subscriptionId: string) {
  const subscription = await getSubscriptionCheckoutContext(subscriptionId)

  if (subscription.billing_interval === "one_time") {
    throw new Error("One-time subscriptions cannot use recurring Stripe checkout.")
  }

  const client = subscription.service?.project?.client
  const service = subscription.service

  if (!client || !service) {
    throw new Error("Subscription is missing client or service context.")
  }

  const stripe = getStripeClient()
  const admin = getSupabaseAdmin()
  const customerId = await ensureStripeCustomer(client)
  const priceId = await ensureStripeRecurringPrice(subscription)

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: `${getBaseUrl()}/admin/subscriptions?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getBaseUrl()}/admin/subscriptions?checkout=cancelled`,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      internal_subscription_id: subscription.id,
      client_id: client.id,
      service_id: service.id,
    },
    subscription_data: {
      metadata: {
        internal_subscription_id: subscription.id,
        client_id: client.id,
        service_id: service.id,
      },
    },
  })

  if (typeof session.subscription === "string") {
    const { error } = await admin
      .from("subscriptions")
      .update({ stripe_subscription_id: session.subscription } as never)
      .eq("id", subscription.id)

    if (error) {
      throw error
    }
  }

  return {
    id: session.id,
    url: session.url,
  }
}

export async function createStripeBillingPortalSession(subscriptionId: string) {
  const subscription = await getSubscriptionCheckoutContext(subscriptionId)
  const client = subscription.service?.project?.client

  if (!client) {
    throw new Error("Subscription is missing client context.")
  }

  const stripe = getStripeClient()
  const customerId = await ensureStripeCustomer(client)
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getBaseUrl()}/admin/subscriptions`,
  })

  return {
    id: session.id,
    url: session.url,
  }
}

async function syncStripePayment(invoiceId: string, amountTotal: number, reference: string, paymentIntentId?: string | null, chargeId?: string | null, eventId?: string | null) {
  const admin = getSupabaseAdmin()

  const existingPaymentResult = paymentIntentId
    ? await admin.from("payments").select("id").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle()
    : null

  const existingPayment = existingPaymentResult?.data as { id?: string } | null | undefined

  if (existingPayment?.id) {
    return existingPayment.id
  }

  const { data, error } = await (admin as unknown as RpcCapableClient).rpc("record_payment_and_sync", {
    p_invoice_id: invoiceId,
    p_amount: Number((amountTotal / 100).toFixed(2)),
    p_payment_method: "card",
    p_payment_gateway: "stripe",
    p_payment_reference: reference,
    p_paid_at: new Date().toISOString(),
  })

  if (error) {
    throw error
  }

  if (data) {
    const { error: updateError } = await admin
      .from("payments")
      .update({
        stripe_payment_intent_id: paymentIntentId || null,
        stripe_charge_id: chargeId || null,
        stripe_event_id: eventId || null,
      } as never)
      .eq("id", data as string)

    if (updateError) {
      throw updateError
    }
  }

  return data as string
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const invoiceId = session.metadata?.invoice_id
  const internalSubscriptionId = session.metadata?.internal_subscription_id

  if (session.mode === "subscription" && internalSubscriptionId) {
    const stripeSubscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id

    if (stripeSubscriptionId) {
      const admin = getSupabaseAdmin()
      await admin
        .from("subscriptions")
        .update({ stripe_subscription_id: stripeSubscriptionId, status: "active" } as never)
        .eq("id", internalSubscriptionId)
    }
    return
  }

  if (!invoiceId || session.payment_status !== "paid") {
    return
  }

  await syncStripePayment(
    invoiceId,
    session.amount_total ?? 0,
    session.id,
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    null,
    eventId
  )

  // Fire-and-forget: send payment receipt to client
  void getClientContactByInvoiceId(invoiceId).then((contact) => {
    if (contact?.email && contact.invoiceNumber) {
      const piRef = typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null)
      void sendPaymentReceiptEmail({
        to: contact.email,
        clientName: contact.name,
        invoiceNumber: contact.invoiceNumber,
        amountLabel: contact.amountLabel ?? "",
        paidAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        paymentReference: piRef,
        portalUrl: `${getBaseUrl()}/app/invoices`,
      }).catch(() => undefined)
    }
  }).catch(() => undefined)
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  const invoiceId = paymentIntent.metadata.invoice_id

  if (!invoiceId) {
    return
  }

  const latestCharge = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id

  await syncStripePayment(
    invoiceId,
    paymentIntent.amount_received || paymentIntent.amount,
    paymentIntent.id,
    paymentIntent.id,
    latestCharge || null,
    eventId
  )
}

async function handleStripeInvoicePaid(stripeInvoice: Stripe.Invoice, eventId: string) {
  const invoiceId = await upsertInternalInvoiceFromStripeInvoice(stripeInvoice)

  if (!invoiceId) {
    return
  }

  const paymentIntentId = getStripeInvoicePaymentIntentId(stripeInvoice)

  await syncStripePayment(
    invoiceId,
    stripeInvoice.amount_paid || stripeInvoice.amount_due || 0,
    stripeInvoice.id,
    paymentIntentId || null,
    null,
    eventId
  )
}

async function handleStripeInvoicePaymentFailed(stripeInvoice: Stripe.Invoice) {
  const admin = getSupabaseAdmin()
  const stripeSubscriptionId = getStripeInvoiceSubscriptionId(stripeInvoice)

  if (!stripeSubscriptionId) {
    return
  }

  await upsertInternalInvoiceFromStripeInvoice(stripeInvoice)

  await admin
    .from("subscriptions")
    .update({ status: "past_due" } as never)
    .eq("stripe_subscription_id", stripeSubscriptionId)
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoice_id
  if (!invoiceId) {
    return
  }

  const admin = getSupabaseAdmin()
  const { data: invoiceResult, error: invoiceError } = await admin
    .from("invoices")
    .select("subscription_id")
    .eq("id", invoiceId)
    .maybeSingle()

  const invoice = invoiceResult as { subscription_id?: string } | null

  if (invoiceError || !invoice?.subscription_id) {
    return
  }

  await admin.from("subscriptions").update({ status: "past_due" } as never).eq("id", invoice.subscription_id)

  // Fire-and-forget: notify client of failed payment
  void getClientContactByInvoiceId(invoiceId).then((contact) => {
    if (contact?.email && contact.invoiceNumber) {
      void sendPaymentFailedEmail({
        to: contact.email,
        clientName: contact.name,
        invoiceNumber: contact.invoiceNumber,
        amountLabel: contact.amountLabel ?? "",
      }).catch(() => undefined)
    }
  }).catch(() => undefined)
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
    case "trialing":
      return "active"
    case "past_due":
      return "past_due"
    case "canceled":
    case "unpaid":
      return "cancelled"
    case "paused":
      return "suspended"
    default:
      return "past_due"
  }
}

async function handleStripeSubscriptionUpdated(subscription: Stripe.Subscription) {
  const admin = getSupabaseAdmin()
  const internalSubscriptionId = subscription.metadata.internal_subscription_id
  const newStatus = mapStripeSubscriptionStatus(subscription.status)

  // Capture previous status to detect transitions
  const prevQuery = internalSubscriptionId
    ? admin.from("subscriptions").select("id, status").eq("id", internalSubscriptionId).maybeSingle()
    : admin.from("subscriptions").select("id, status").eq("stripe_subscription_id", subscription.id).maybeSingle()
  const { data: prevRow } = await prevQuery
  const prevStatus = (prevRow as Record<string, unknown> | null)?.status as string | undefined
  const subscriptionDbId = (prevRow as Record<string, unknown> | null)?.id as string | undefined

  let query = admin.from("subscriptions").update({
    stripe_subscription_id: subscription.id,
    status: newStatus,
  } as never)

  if (internalSubscriptionId) {
    query = query.eq("id", internalSubscriptionId)
  } else {
    query = query.eq("stripe_subscription_id", subscription.id)
  }

  await query

  const resolvedId = internalSubscriptionId ?? subscriptionDbId
  if (!resolvedId) return

  // Fire-and-forget notifications for status transitions
  if (newStatus === "suspended" && prevStatus !== "suspended") {
    void getClientContactBySubscriptionId(resolvedId).then((contact) => {
      if (contact?.email) {
        void sendSubscriptionSuspendedEmail({
          to: contact.email,
          clientName: contact.name,
          projectName: contact.projectName ?? "",
          serviceName: contact.serviceName ?? "",
        }).catch(() => undefined)
      }
    }).catch(() => undefined)
  }

  if (newStatus === "active" && prevStatus === "suspended") {
    void getClientContactBySubscriptionId(resolvedId).then((contact) => {
      if (contact?.email) {
        void sendSubscriptionReactivatedEmail({
          to: contact.email,
          clientName: contact.name,
          projectName: contact.projectName ?? "",
          serviceName: contact.serviceName ?? "",
        }).catch(() => undefined)
      }
    }).catch(() => undefined)
  }
}

// -------------------------------------------------------
// Notification helpers — fetch client contact info by
// invoiceId or subscriptionId for notification dispatch.
// All failures are swallowed so notifications never break
// the main payment sync flow.
// -------------------------------------------------------

interface ClientContact {
  email: string
  name: string
  invoiceNumber?: string
  amountLabel?: string
  projectName?: string
  serviceName?: string
}

async function getClientContactByInvoiceId(invoiceId: string): Promise<ClientContact | null> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from("invoices")
      .select(`
        invoice_number, amount,
        subscription:subscriptions(
          service:services(
            name,
            project:projects(
              name,
              client:clients(name, email)
            )
          )
        )
      `)
      .eq("id", invoiceId)
      .single()

    if (error || !data) return null

    const row = data as Record<string, unknown>
    const sub = Array.isArray(row.subscription) ? row.subscription[0] : row.subscription as Record<string, unknown> | undefined
    const svc = sub ? (Array.isArray(sub.service) ? sub.service[0] : sub.service) as Record<string, unknown> | undefined : undefined
    const proj = svc ? (Array.isArray(svc.project) ? svc.project[0] : svc.project) as Record<string, unknown> | undefined : undefined
    const client = proj ? (Array.isArray(proj.client) ? proj.client[0] : proj.client) as Record<string, unknown> | undefined : undefined

    if (!client?.email) return null

    const amount = Number(row.amount ?? 0)
    const amountLabel = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

    return {
      email: String(client.email),
      name: String(client.name ?? "Client"),
      invoiceNumber: String(row.invoice_number ?? ""),
      amountLabel,
      projectName: String(proj?.name ?? ""),
      serviceName: String(svc?.name ?? ""),
    }
  } catch {
    return null
  }
}

async function getClientContactBySubscriptionId(subscriptionId: string): Promise<ClientContact | null> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from("subscriptions")
      .select(`
        service:services(
          name,
          project:projects(
            name,
            client:clients(name, email)
          )
        )
      `)
      .eq("id", subscriptionId)
      .single()

    if (error || !data) return null

    const row = data as Record<string, unknown>
    const svc = (Array.isArray(row.service) ? row.service[0] : row.service) as Record<string, unknown> | undefined
    const proj = svc ? (Array.isArray(svc.project) ? svc.project[0] : svc.project) as Record<string, unknown> | undefined : undefined
    const client = proj ? (Array.isArray(proj.client) ? proj.client[0] : proj.client) as Record<string, unknown> | undefined : undefined

    if (!client?.email) return null

    return {
      email: String(client.email),
      name: String(client.name ?? "Client"),
      projectName: String(proj?.name ?? ""),
      serviceName: String(svc?.name ?? ""),
    }
  } catch {
    return null
  }
}

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event.id)
      break
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, event.id)
      break
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
      break
    case "invoice.paid":
      await handleStripeInvoicePaid(event.data.object as Stripe.Invoice, event.id)
      break
    case "invoice.payment_failed":
      await handleStripeInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleStripeSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break
    default:
      break
  }
}

export async function handleStripeWebhookRequest(request: Request): Promise<StripeWebhookResult> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.")
  }

  const stripe = getStripeClient()
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    throw new Error("Missing stripe-signature header.")
  }

  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  const shouldProcess = await insertStripeWebhookEvent(event, payload)

  if (!shouldProcess) {
    return {
      eventType: event.type,
      duplicate: true,
    }
  }

  try {
    await processStripeEvent(event)
    await markStripeWebhookProcessed(event.id)

    return {
      eventType: event.type,
      duplicate: false,
    }
  } catch (error) {
    await markStripeWebhookFailed(
      event.id,
      error instanceof Error ? error.message : "Unknown Stripe webhook processing error."
    )
    throw error
  }
}

// -------------------------------------------------------
// Portal checkout: same as admin checkout but redirects
// back to the client portal instead of admin panel.
// The invoiceId ownership check must be done by the caller
// before calling this function (verify client owns invoice).
// -------------------------------------------------------
export async function createPortalStripeCheckoutSession(invoiceId: string) {
  const invoice = await getInvoiceCheckoutContext(invoiceId)

  if (invoice.status === "paid" || invoice.status === "void") {
    throw new Error("This invoice has already been paid or is void.")
  }

  const client = invoice.subscription?.service?.project?.client
  if (!client) {
    throw new Error("Invoice is missing client context.")
  }

  const stripe = getStripeClient()
  const admin = getSupabaseAdmin()
  const customerId = await ensureStripeCustomer(client)

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    success_url: `${getBaseUrl()}/app/invoices/${invoice.id}?checkout=success`,
    cancel_url: `${getBaseUrl()}/app/invoices/${invoice.id}?checkout=cancelled`,
    metadata: {
      invoice_id: invoice.id,
      subscription_id: invoice.subscription_id,
      client_id: client.id,
    },
    payment_intent_data: {
      metadata: {
        invoice_id: invoice.id,
        subscription_id: invoice.subscription_id,
        client_id: client.id,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: {
            name: invoice.subscription?.service?.name || `Invoice ${invoice.invoice_number}`,
            description: `Invoice ${invoice.invoice_number} — ${invoice.subscription?.service?.project?.name ?? ""}`,
          },
          unit_amount: Math.round(Number(invoice.amount) * 100),
        },
      },
    ],
  })

  const { error } = await admin
    .from("invoices")
    .update({ stripe_checkout_session_id: session.id } as never)
    .eq("id", invoice.id)

  if (error) {
    throw error
  }

  return {
    id: session.id,
    url: session.url,
  }
}
