import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/models/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const user = data.user;

  // 🔥 AUTO UPSERT USER KE TABEL LOKAL
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email!,
      firstName: user.user_metadata?.full_name || "",
      lastName: "",
      profileImageUrl: user.user_metadata?.avatar_url || null,
    })
    .onConflictDoNothing(); // kalau sudah ada, skip

  (req as any).user = user;
  next();
}