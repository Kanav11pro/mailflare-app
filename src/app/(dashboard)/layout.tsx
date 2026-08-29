"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ComposeProvider } from "@/components/compose/compose-context";
import { FloatingComposer } from "@/components/compose/floating-composer";
import { MailSearchInput } from "@/components/mail-search/mail-search-input";
import { MailSearchProvider } from "@/components/mail-search/mail-search-context";
import { MailboxProvider } from "@/components/mailbox-provider";
import { MailboxSelector } from "@/components/mailbox-selector";
import { LicenseIndicator } from "@/components/license-indicator";
import { DashboardNav } from "@/components/dashboard-nav";
import { SidebarProvider } from "@/components/sidebar-state";

import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
  });

  return (
    <AuthGuard>
      <SidebarProvider>
      <MailboxProvider>
        <ComposeProvider>
          <MailSearchProvider>
            <div className="grid h-dvh grid-cols-[var(--sidebar-width)_minmax(0,1fr)] overflow-hidden bg-[#f6f8fc] transition-[grid-template-columns] duration-200">
              <aside className="min-h-0 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-gutter-stable">
                <DashboardNav />
              </aside>
              <div className="flex min-h-0 min-w-0 flex-col">
                <header className="flex h-16 w-full shrink-0 items-center gap-2 pr-4 text-sm">
                  <div className="flex-1 cursor-pointer" onClick={() => setCommandPaletteOpen(true)}>
                    <MailSearchInput />
                  </div>
                  <ThemeToggle />
                  <Link
                    href="/settings"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Link>
                  <LicenseIndicator />
                  <MailboxSelector />
                </header>
                <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-tl-3xl bg-white scrollbar-gutter-stable dark:bg-[#15161b]">
                  {children}
                </main>
              </div>
              <FloatingComposer />
              <CommandPalette
                open={commandPaletteOpen}
                onOpenChange={setCommandPaletteOpen}
              />
            </div>
          </MailSearchProvider>
        </ComposeProvider>
      </MailboxProvider>
      </SidebarProvider>
    </AuthGuard>
  );
}
