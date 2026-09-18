import type { Request , Response } from "express";
import {getEnv} from "../lib/env"
import { verifyWebhook } from "@clerk/backend/webhooks";
import { parseRole } from "../lib/roles";
import { eq } from "drizzle-orm";
import {users} from "../db/schema"
import { db } from "../db";



export async function  clerkWebhookHandler(req:Request , res:Response){
const env = getEnv();

try {
    if (!env.CLERK_WEBHOOK_SECRET) {
        res.status(503).send("Webhooks secret is not provided");
        return ; 
    }

    const payload = req.body instanceof Buffer ? req.body.toString("utf8") :String(req.body);

    const request = new Request("http://internal/webhooks/clerk",{
        method :"POST",
        headers : new Headers(req.headers as HeadersInit),
        body : payload
    })


    const evt =await verifyWebhook(request , {signingSecret:env.CLERK_WEBHOOK_SECRET})

   if (evt.type === "user.created" || evt.type === "user.updated") {
  const u = evt.data;

  // 1. Resolve primary or fallback email address
  const email =
    u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ??
    u.email_addresses?.[0]?.email_address;

  if (!email) {
    throw new Error(`No valid email found for Clerk user ${u.id}`);
  }

  // 2. Format display name cleanly with proper spacing
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
  const displayName = fullName || u.username || email.split("@")[0];

  // 3. Parse role from public metadata
  const role = parseRole(u.public_metadata?.role);

  // 4. Upsert user into PostgreSQL via Drizzle ORM
  await db
    .insert(users)
    .values({
      clerkUserId: u.id,
      email,
      displayName,
      role,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email,
        displayName,
        role,
        updatedAt: new Date(),
      },
    });

}  
if (evt.type ==="user.deleted") {
    const id = evt.data.id
    if (id) {
        await db.delete(users).where(eq(users.clerkUserId,id));
    }

}
res.json({ok:true})
} catch (err) {
    console.error("Clerk webhook error",err)
    res.status(400).json({error : "Invalid webhook"})
}





}    