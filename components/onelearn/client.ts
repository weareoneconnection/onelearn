"use client";

import { BarChart3, CreditCard, FolderOpen, GraduationCap, LayoutDashboard, LibraryBig, Map, ShieldCheck, Target, TimerReset } from "lucide-react";
import type { Locale } from "@/lib/onelearn/i18n";
import { clerkEnabled, clerkMaybeSignedIn, clerkSessionToken, loadClerk, openClerkSignIn } from "@/lib/onelearn/clerk-browser";
import type { View } from "./types";

export const generatedCourseKey = (courseId: string, locale: Locale) => `onelearn-generated-course:${courseId}:${locale}`;

export const DEVICE_ID_KEY = "onelearn-device-id";

export function deviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function oneLearnFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-onelearn-device-id", deviceId());
  // Only wait for Clerk when a session may exist; signed-out visitors load immediately.
  const token = clerkMaybeSignedIn() ? await clerkSessionToken().catch(() => null) : null;
  if (clerkEnabled && !token) void loadClerk();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export function signIn(returnTo: string) {
  if (clerkEnabled) void openClerkSignIn(new URL(returnTo, window.location.origin).href);
  else window.top?.location.assign(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
}

export const navItems = [
  { id: "dashboard" as View, zh: "今日学习", en: "Today", icon: LayoutDashboard },
  { id: "catalog" as View, zh: "课程宇宙", en: "Course universe", icon: LibraryBig },
  { id: "path" as View, zh: "知识地图", en: "Knowledge map", icon: Map },
  { id: "learn" as View, zh: "学习空间", en: "Learning room", icon: GraduationCap },
  { id: "practice" as View, zh: "练习", en: "Practice", icon: Target },
  { id: "review" as View, zh: "复习", en: "Review", icon: TimerReset },
  { id: "library" as View, zh: "资料库", en: "Sources", icon: FolderOpen },
  { id: "proof" as View, zh: "掌握证明", en: "Mastery proof", icon: ShieldCheck },
  { id: "billing" as View, zh: "套餐与账单", en: "Plans & billing", icon: CreditCard },
  { id: "operations" as View, zh: "运营中心", en: "Operations", icon: BarChart3 },
];
