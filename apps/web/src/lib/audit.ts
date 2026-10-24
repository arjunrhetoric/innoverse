import type { NextRequest } from "next/server";
import { connectDB } from "@innoverse/database";

export interface AuditInput {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}

/**
 * Append an audit event. Never throws — auditing must not break the
 * request it is recording.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const { AuditEvent } = await import("@innoverse/database");
    await connectDB();

    const forwarded = input.request?.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : null;

    await AuditEvent.create({
      actorId: input.actorId || null,
      actorName: input.actorName ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ip,
      userAgent: input.request?.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    console.error("Audit write failed:", err);
  }
}
