import { Router } from 'express';
import { Webhook } from 'svix';
import { Request, Response } from 'express';
import { db } from '../../db/client.js';
export const webhooksRouter = Router();


webhooksRouter.post('/clerk', async (req: Request, res: Response) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET!

  const wh = new Webhook(secret)
  let event: any
  const payload = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body)

  try {
    event = wh.verify(payload, {
      'svix-id':        req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    })
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  const { type, data } = event

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const primaryEmail = data.email_addresses?.find(
          (email: any) => email.id === data.primary_email_address_id,
        )?.email_address
        const fallbackEmail = data.email_addresses?.[0]?.email_address
        const email = primaryEmail ?? fallbackEmail ?? `${data.id}@deleted.local`
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
        const name = fullName || data.username || null
        const avatarUrl = data.image_url ?? null

        await db.user.upsert({
          where: { id: data.id },
          update: {
            email,
            name,
            avatarUrl,
          },
          create: {
            id: data.id,
            email,
            name,
            avatarUrl,
          },
        })

        break
      }

      case 'user.deleted': {
        if (!data?.id) {
          break
        }

        const ownsWorkspaces = await db.workspace.count({
          where: { ownerId: data.id },
        })

        if (ownsWorkspaces > 0) {
          console.warn(`Skipping deletion for user ${data.id}; user still owns workspaces.`)
          break
        }

        await db.user.deleteMany({
          where: { id: data.id },
        })
        break
      }
    }
  } catch (error) {
    console.error('Failed processing Clerk webhook event:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  res.json({ received: true }) 
})
