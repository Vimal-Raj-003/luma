/* Customer order history. Only for a verified account (a Clerk session: Google / email). A name + mobile guest is never shown orders, because anyone can type
   someone else's number; and a customer only ever receives rows whose userId is their own. */
import { requireUser } from './auth.mjs'
import { db } from './db.mjs'

export async function myOrders(req) {
  const user = await requireUser(req)
  if (user.guest) throw Object.assign(new Error('Sign in with Google or email to see your orders.'), { status: 403 })
  const rows = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { items: { select: { productName: true, quantity: true, unitPrice: true } } },
  })
  return {
    orders: rows.map((o) => ({
      id: o.id, createdAt: o.createdAt, subtotal: o.subtotal, shipping: o.shipping, total: o.total,
      paymentStatus: o.paymentStatus, orderStatus: o.orderStatus,
      items: o.items.map((i) => ({ name: i.productName, qty: i.quantity, unit: i.unitPrice })),
    })),
  }
}
