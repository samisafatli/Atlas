"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, findProfile } from "@/lib/profiles";

export async function switchProfile(formData: FormData) {
  const profile = findProfile(String(formData.get("profile") ?? ""));
  (await cookies()).set(PROFILE_COOKIE, profile.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  // Record pages hold ids from the previous profile's database.
  redirect("/dashboard");
}
