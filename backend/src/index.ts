import "dotenv/config";
import express from "express";
import cors from "cors";

import fs from "node:fs";
import path from "node:path";


import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhooks/clerk";
// import { polarWebhookHandler } from "./webhooks/polar";
import { getEnv } from "./lib/env";
// import keepAliveCron from "./lib/cron";

// import productRouter from "./routes/productRouter";
// import meRouter from "./routes/meRouter";
// import streamRouter from "./routes/streamRouter";
// import chekoutRouter from "./routes/chekoutRouter";
// import adminRouter from "./routes/adminRouter";
// import orderRouter from "./routes/orderRouter";

// import { sentryClerkUserMiddleware } from "./middleware/sentryClerkUser";

const env = getEnv();
const app = express();

// Initialize keep-alive cron job if needed
// keepAliveCron();

// Webhook endpoints MUST receive raw bodies for signature verification
const rawJson = express.raw({ type: "application/json", limit: "1mb" });

app.post("/webhooks/clerk", rawJson, (req, res) => {
  void clerkWebhookHandler(req, res);
});



// Standard JSON parser and global middleware for standard API routes
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());


// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});



const publicDir = path.join(process.cwd(), "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api") || req.path.startsWith("/webhooks")) {
      next();
      return;
    }

    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}

const PORT = env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});