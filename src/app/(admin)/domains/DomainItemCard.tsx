import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Globe2,
  Trash2,
  Activity,
} from "lucide-react";
import { DnsHealthCard } from "@/components/domains/dns-health-card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DomainItemCard({ item, dns, remove, loadDns }: any) {
  const [showHealth, setShowHealth] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <div
      key={item.id}
      className="flex flex-col gap-3 rounded-3xl bg-white p-5 dark:bg-[#1a1b20]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <Globe2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {item.hostname}
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={item.status === "active" ? "success" : "secondary"}>
              {item.status}
            </Badge>
            {item.routingEnabled && <Badge variant="outline">routing</Badge>}
            {item.sendingEnabled && <Badge variant="outline">sending</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showHealth ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHealth((prev) => !prev)}
            className="gap-1 text-xs"
          >
            <Activity className="h-3.5 w-3.5" />
            Health
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadDns(item.id)}>
            DNS
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={remove.isPending}
            aria-label={`Remove ${item.hostname}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog before Deleting Domain */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle>Delete Domain</DialogTitle>
            </div>
            <DialogDescription className="mt-3">
              Are you sure you want to delete <strong className="text-neutral-900 dark:text-white">{item.hostname}</strong>?
              This will remove all associated inbound email routing rules, DNS verification, and active mailboxes connected to this domain.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(item.id, {
                  onSettled: () => setConfirmDeleteOpen(false),
                });
              }}
            >
              {remove.isPending ? "Deleting..." : "Yes, Delete Domain"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showHealth && (
        <div className="mt-2">
          <DnsHealthCard domainId={item.id} hostname={item.hostname} />
        </div>
      )}

      {dns && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-neutral-500">
            Routing{" "}
            {dns.routing.configured ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
          </span>
          {dns.routing.missing.length > 0 && (
            <span className="text-red-600 flex items-center gap-1">
              <X className="h-3 w-3" />
              Missing: {dns.routing.missing.join(", ")}
            </span>
          )}
          <span className="text-neutral-300">|</span>
          <span className="flex items-center gap-1 text-neutral-500">
            Sending{" "}
            {dns.sending.configured ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
          </span>
          {dns.sending.records.length > 0 && (
            <span className="text-neutral-500">
              {dns.sending.records.join(", ")}
            </span>
          )}
          <button
            onClick={() => loadDns(item.id)}
            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800"
          >
            <ArrowRight className="h-3 w-3" />
            details
          </button>
        </div>
      )}
    </div>
  );
}
