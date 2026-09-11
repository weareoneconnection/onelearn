"use client";

import Link from "next/link";
import { BarChart3, ChevronsUpDown, CircleHelp, Cloud, CreditCard, FileText, LogIn, LogOut, Mail, Smartphone } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { clerkSignOut } from "@/lib/onelearn/clerk-browser";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { signIn } from "./client";
import type { LearnerIdentity, View } from "./types";

/** Sidebar account entry: shows who is signed in and where their data lives, with account actions. */
export function AccountMenu({ locale, identity, emailReminders, onToggleReminders, onNavigate, onFeedback }: { locale: Locale; identity: LearnerIdentity | null; emailReminders: boolean | null; onToggleReminders: (enabled: boolean) => void; onNavigate: (view: View) => void; onFeedback: () => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const signedIn = identity !== null && identity.mode !== "device";
  const name = signedIn ? identity.displayName : l("未登录", "Not signed in");
  const status = signedIn ? l("云端学习档案", "Cloud learning profile") : l("仅保存在本设备", "Saved on this device only");
  const signOut = () => {
    if (identity?.mode === "clerk") void clerkSignOut();
    else window.top?.location.assign("/signout-with-chatgpt?return_to=%2F");
  };

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5 data-[state=open]:bg-white/5 group-data-[collapsible=icon]:justify-center">
        <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-white/7 text-xs font-semibold text-cyan-200">{signedIn ? name.slice(0, 2).toUpperCase() : <Smartphone className="size-4" />}</span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-xs font-medium text-slate-200">{name}</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-500">{signedIn ? <Cloud className="size-3" /> : <Smartphone className="size-3" />}{status}</span>
        </span>
        <ChevronsUpDown className="size-4 flex-none text-slate-500 group-data-[collapsible=icon]:hidden" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="start" className="w-64 border-white/10 bg-[#0c1422] text-slate-200">
      <DropdownMenuLabel className="font-normal">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="truncate text-xs text-slate-500">{signedIn ? identity.email : l("登录后可跨设备同步学习档案与会员", "Sign in to sync your profile and membership")}</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-white/8" />
      {!signedIn && <DropdownMenuItem onSelect={() => signIn("/")}><LogIn />{l("登录并跨设备同步", "Sign in and sync")}</DropdownMenuItem>}
      <DropdownMenuItem onSelect={() => onNavigate("billing")}><CreditCard />{l("套餐与账单", "Plans & billing")}</DropdownMenuItem>
      {identity?.admin && <DropdownMenuItem onSelect={() => onNavigate("operations")}><BarChart3 />{l("运营中心", "Operations center")}</DropdownMenuItem>}
      {signedIn && emailReminders !== null && <DropdownMenuCheckboxItem checked={emailReminders} onCheckedChange={(checked) => onToggleReminders(checked === true)} onSelect={(event) => event.preventDefault()}><Mail className="mr-2 size-4" />{l("复习提醒邮件", "Review reminder emails")}</DropdownMenuCheckboxItem>}
      <DropdownMenuItem onSelect={onFeedback}><CircleHelp />{l("帮助与反馈", "Help & feedback")}</DropdownMenuItem>
      <DropdownMenuItem asChild><Link href="/terms" target="_blank"><FileText />{l("用户协议与隐私", "Terms & privacy")}</Link></DropdownMenuItem>
      {signedIn && <>
        <DropdownMenuSeparator className="bg-white/8" />
        <DropdownMenuItem onSelect={signOut} className="text-rose-300 focus:text-rose-200"><LogOut />{l("退出登录", "Sign out")}</DropdownMenuItem>
      </>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
