"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";

interface AuditEvent {
  _id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorName: string | null;
  ip: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export default function AuditPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useUser();
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role !== "Startup") {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "Startup") return;
    fetch("/api/audit?limit=100", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load audit log");
        setEvents(data.events ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Audit Log
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An append-only record of the actions taken by your account. Entries cannot be edited or deleted.
            </p>
          </motion.div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {authLoading || loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                    <th className="px-4 py-2.5 font-medium">Resource</th>
                    <th className="px-4 py-2.5 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event._id} className="border-t border-border/60">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {event.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-muted-foreground">{event.resourceType}</span>
                        {event.resourceId && (
                          <span className="ml-1 font-mono text-[11px] text-muted-foreground/70">
                            {event.resourceId.slice(-8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {event.ip ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
