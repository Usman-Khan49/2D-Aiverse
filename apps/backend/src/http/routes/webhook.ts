import { Router } from 'express';
import { Webhook } from 'svix';
import { Request, Response } from 'express';
export const webhooksRouter = Router();


webhooksRouter.post('/clerk',  (req: Request, res: Response) => {
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

  switch (type) {
    case 'user.created':
    case 'user.updated': {
      const email = data.email_addresses?.[0]?.email_address
      const name  = [data.first_name, data.last_name].filter(Boolean).join(' ')
      console.log(`User with ID ${data.id} has been created/updated. Email: ${email}, Name: ${name}`)   
      break
    }

    case 'user.deleted': {
        console.log(`User with ID ${data.id} has been deleted.`)
      break
    }
  }

  res.json({ received: true }) 
})
