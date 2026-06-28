"use client";

import Link from "next/link";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";

import "./app-shell.css";

const ITEMS: { icon: IconName; label: string; href: string }[] = [
  { icon: "user", label: "Account & data rights", href: "/account" },
  { icon: "link", label: "Connected accounts", href: "/account#connected" },
  { icon: "download", label: "Export my data", href: "/account#export" },
];

/** Account menu — built on the accessible DropdownMenu (menu roles, keyboard, Esc,
 *  focus management come for free). Items link into Account & data rights. */
export function AccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="acct-btn" aria-label="Account menu">
        <Avatar className="size-9">
          <AvatarFallback>MR</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="acct-name">Marta Rocha</div>
          <div className="acct-mail">marta@example.com</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ITEMS.map((it) => (
          <DropdownMenuItem key={it.href} render={<Link href={it.href} />}>
            <Icon name={it.icon} size={16} /> {it.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast("Signed out")}>
          <Icon name="log-out" size={16} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
