"use client";

import Link from "next/link";
import { HelpCircle, Search } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ComposeProvider } from "@/components/compose/compose-context";
import { FloatingComposer } from "@/components/compose/floating-composer";
import { MailboxProvider } from "@/components/mailbox-provider";
import { MailboxSelector } from "@/components/mailbox-selector";
import { LicenseIndicator } from "@/components/license-indicator";
import { AdminNav } from "@/components/admin-nav";
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
    <AuthGuard requireMailbox requireRole="admin">
      <SidebarProvider expandedWidth={256}>
      <MailboxProvider>
        <ComposeProvider>
          <div className="grid h-dvh grid-cols-[var(--sidebar-width)_minmax(0,1fr)] overflow-hidden bg-[#f6f8fc] transition-[grid-template-columns] duration-200">
            <aside className="min-h-0 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-gutter-stable">
              <AdminNav />
            </aside>
            <div className="flex min-h-0 min-w-0 flex-col">
              <header className="flex h-16 w-full shrink-0 items-center justify-end gap-3 px-8 text-sm">
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="flex h-9 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-xs text-neutral-500 shadow-xs hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] dark:bg-neutral-700">Cmd+K</kbd>
                </button>
                <ThemeToggle />
                <MailboxSelector />
              </header>
              <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-tl-3xl px-6 py-6 scrollbar-gutter-stable lg:px-12">
                <div className="w-full max-w-4xl">{children}</div>
              </main>
            </div>
            <FloatingComposer />
            <CommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
            />
          </div>
        </ComposeProvider>
      </MailboxProvider>
      </SidebarProvider>
    </AuthGuard>
  );
}
