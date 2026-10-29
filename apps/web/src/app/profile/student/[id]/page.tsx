"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  Fingerprint,
  ShieldCheck,
  Star,
  Trophy,
  UserX,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatBand } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonStats } from "@/components/ui/skeleton";
import { profile } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { GitHubProfile, Certificate, User } from "@/lib/types";

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.id as string;
  const [data, setData] = useState<{
    user: User;
    githubProfile: GitHubProfile | null;
    certificates: Certificate[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await profile.getStudent(studentId);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <AppShell>
        <div className="mb-6 flex gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="mb-2 h-7 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <SkeletonStats count={3} />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <EmptyState
          icon={UserX}
          title="Student profile not found"
          description="This profile may be private, or the link may be out of date."
          action={{ label: "Back to talent", href: "/talent" }}
          secondary={{ label: "Go home", href: "/" }}
        />
      </AppShell>
    );
  }

  const { user: studentUser, githubProfile, certificates } = data;
  const reports = certificates.filter((c) => Boolean(c.publicToken));
  const displayName = githubProfile?.name || studentUser?.name || "Student";

  return (
    <AppShell>
      <PageHeader
        back={{ href: "/", label: "Home" }}
        eyebrow={
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
            Student
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            {githubProfile?.avatar_url && (
              <Image
                src={githubProfile.avatar_url}
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 shrink-0 rounded-full border border-border"
              />
            )}
            {displayName}
          </span>
        }
        description={studentUser?.headline || githubProfile?.bio || "No headline added yet."}
        meta={
          <>
            {studentUser?.githubUsername && (
              <a
                href={`https://github.com/${studentUser.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="font-mono">@{studentUser.githubUsername}</span>
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
            {githubProfile && (
              <Meta label="Repos" value={githubProfile.public_repos ?? 0} />
            )}
            {githubProfile && (
              <Meta label="Followers" value={githubProfile.followers ?? 0} />
            )}
          </>
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <a
              href={githubProfile?.html_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!githubProfile?.html_url}
            >
              <Github />
              View on GitHub
            </a>
          </Button>
        }
      />

      <StatBand
        className="mb-8"
        items={[
          { label: "Certificates", value: certificates.length },
          { label: "Public reports", value: reports.length },
          { label: "Public repos", value: githubProfile?.public_repos ?? 0 },
        ]}
      />

      {studentUser?.skills && studentUser.skills.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-1.5">
          {studentUser.skills.map((s) => (
            <li key={s}>
              <Badge variant="secondary" className="font-mono">
                {s}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {/* Credentials */}
      <section aria-labelledby="student-certificates" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2
            id="student-certificates"
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <Trophy className="h-4 w-4 text-brand" aria-hidden />
            Certificates
          </h2>
          <span className="tnum font-mono text-2xs text-muted-foreground">
            {certificates.length}
          </span>
        </div>

        {certificates.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No certificates yet"
            description="Certificates appear here once a startup issues one for completed work."
            action={{ label: "Explore challenges", href: "/explore" }}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {certificates.map((cert) => {
              const prob = typeof cert.problemId === "object" ? cert.problemId : null;
              const startup = typeof cert.startupId === "object" ? cert.startupId : null;
              return (
                <li
                  key={cert._id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex-1 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium leading-snug text-foreground">
                        {prob?.title || "Project"}
                      </h3>
                      <Badge variant={cert.revoked ? "danger" : "success"} className="shrink-0">
                        {cert.revoked ? "Revoked" : "Valid"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Issued by{" "}
                      <span className="font-mono text-foreground">
                        {startup?.companyName || startup?.name || "Startup"}
                      </span>
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <div
                        className="flex items-center gap-0.5"
                        aria-label={`Rated ${cert.rating} out of 5`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < cert.rating
                                ? "h-3.5 w-3.5 fill-warning text-warning"
                                : "h-3.5 w-3.5 text-subtle-foreground/40"
                            }
                            aria-hidden
                          />
                        ))}
                      </div>
                      <span className="tnum font-mono text-2xs text-muted-foreground">
                        {cert.rating}/5
                      </span>
                    </div>

                    {cert.review && (
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {cert.review}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-2xs text-subtle-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" aria-hidden />
                        <span className="tnum font-mono">{formatDate(cert.issuedAt)}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Fingerprint className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate font-mono">{cert.verificationCode}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface px-5 py-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/verify/${cert.verificationCode}`}>
                        <ShieldCheck />
                        Verify credential
                      </Link>
                    </Button>
                    {cert.publicToken && (
                      <Button size="sm" variant="ghost" className="ml-auto" asChild>
                        <Link href={`/r/${cert.publicToken}`}>Report</Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Reports */}
      <section aria-labelledby="student-reports">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="student-reports" className="text-sm font-medium text-foreground">
            Published reports
          </h2>
          <span className="tnum font-mono text-2xs text-muted-foreground">{reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No public reports yet"
            description="Reports are published by the issuing startup. Certificates above can still be checked by code."
            action={{ label: "Verify a code", href: "/verify" }}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {reports.map((cert) => {
                const prob = typeof cert.problemId === "object" ? cert.problemId : null;
                return (
                  <li key={`report-${cert._id}`}>
                    <Link
                      href={`/r/${cert.publicToken}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {prob?.title || "Project"}
                        </p>
                        <p className="mt-0.5 tnum font-mono text-2xs text-muted-foreground">
                          {formatDate(cert.issuedAt)}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </AppShell>
  );
}
