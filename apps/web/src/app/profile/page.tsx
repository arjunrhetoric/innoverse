"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  ExternalLink,
  Fingerprint,
  GitFork,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Meta } from "@/components/ui/page-header";
import { StatBand } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonStats } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/hooks/useUser";
import { auth, certificates as certApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { GitHubProfile, GitHubRepo, Certificate } from "@/lib/types";

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useUser();
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileData, repoData] = await Promise.all([
          auth.getGitHubProfile(),
          auth.getGitHubRepos(),
        ]);
        setGithubProfile(profileData);
        setRepos(repoData);

        if (user?.id) {
          try {
            const certs = await certApi.getForStudent(user.id);
            setCertificates(Array.isArray(certs) ? certs : []);
          } catch {
            setCertificates([]);
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [user]);

  if (authLoading || loading) {
    return <ProfileSkeleton />;
  }

  const reports = certificates.filter((c) => Boolean(c.publicToken));
  const displayName = githubProfile?.name || user?.name || "Your profile";

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-subtle-foreground">
            Student profile
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
        description={githubProfile?.bio || "Add a headline on GitHub to describe the work you take on."}
        meta={
          githubProfile ? (
            <>
              <Meta label="Repos" value={githubProfile.public_repos ?? 0} />
              <Meta label="Followers" value={githubProfile.followers ?? 0} />
              <Meta label="Following" value={githubProfile.following ?? 0} />
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              GitHub profile not connected for this session.
            </span>
          )
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
          { label: "Public repos", value: githubProfile?.public_repos ?? 0 },
          { label: "Followers", value: githubProfile?.followers ?? 0 },
          { label: "Certificates", value: certificates.length },
          { label: "Public reports", value: reports.length },
        ]}
      />

      {/* Contribution chart */}
      {user?.githubUsername && (
        <section aria-labelledby="contributions" className="mb-8">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="contributions" className="text-sm font-medium text-foreground">
              Contribution activity
            </h2>
            <span className="font-mono text-2xs text-subtle-foreground">
              @{user.githubUsername}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">
            <Image
              src={`https://ghchart.rshah.org/4f8cff/${user.githubUsername}`}
              alt={`GitHub contribution chart for ${user.githubUsername}`}
              width={800}
              height={120}
              className="w-full"
              unoptimized
            />
          </div>
        </section>
      )}

      {/* Certificates as credential cards */}
      <section aria-labelledby="certificates" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="certificates" className="flex items-center gap-2 text-sm font-medium text-foreground">
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
            description="A certificate is issued by the startup when a challenge is completed and reviewed. Apply to an open brief to start one."
            action={{ label: "Find a challenge", href: "/explore" }}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {certificates.map((cert) => {
              const problem = typeof cert.problemId === "object" ? cert.problemId : null;
              const startup = typeof cert.startupId === "object" ? cert.startupId : null;

              return (
                <li
                  key={cert._id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex-1 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium leading-snug text-foreground">
                        {problem?.title || "Project"}
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
                      {cert.confidence && (
                        <span className="tnum font-mono text-2xs text-muted-foreground">
                          · {cert.confidence.score}/100
                        </span>
                      )}
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
                        Verify
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedCert(cert)}>
                      Details
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
      <section aria-labelledby="reports" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="reports" className="text-sm font-medium text-foreground">
            Published reports
          </h2>
          <span className="tnum font-mono text-2xs text-muted-foreground">{reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No public reports yet"
            description="Reports become public once the issuing startup publishes them. Certificates above stay verifiable by code in the meantime."
            action={{ label: "Verify a code", href: "/verify" }}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {reports.map((cert) => {
                const problem = typeof cert.problemId === "object" ? cert.problemId : null;
                return (
                  <li key={`report-${cert._id}`}>
                    <Link
                      href={`/r/${cert.publicToken}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {problem?.title || "Project"}
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

      {/* Repositories */}
      <section aria-labelledby="repositories">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="repositories" className="text-sm font-medium text-foreground">
            Repositories
          </h2>
          <span className="tnum font-mono text-2xs text-muted-foreground">
            {Math.min(repos.length, 10)}
          </span>
        </div>
        {repos.length === 0 ? (
          <EmptyState
            icon={Github}
            title="No repositories found"
            description="Public repositories from your GitHub account appear here. Make sure the account is connected in settings."
            action={{ label: "Open settings", href: "/settings/profile" }}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {repos.slice(0, 10).map((repo) => (
              <li key={repo.id}>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-medium text-foreground">{repo.name}</h3>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden />
                  </div>
                  <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {repo.description || "No description"}
                  </p>
                  <div className="mt-3 flex items-center gap-3 font-mono text-2xs text-muted-foreground">
                    {repo.language && <span>{repo.language}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" aria-hidden />
                      <span className="tnum">{repo.stargazers_count}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GitFork className="h-3 w-3" aria-hidden />
                      <span className="tnum">{repo.forks_count}</span>
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Certificate detail */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedCert
                ? typeof selectedCert.problemId === "object"
                  ? selectedCert.problemId?.title || "Certificate"
                  : "Certificate"
                : "Certificate"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedCert && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`Rated ${selectedCert.rating} out of 5`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={
                          i < selectedCert.rating
                            ? "h-4 w-4 fill-warning text-warning"
                            : "h-4 w-4 text-subtle-foreground/40"
                        }
                        aria-hidden
                      />
                    ))}
                  </div>
                  <span className="tnum font-mono text-xs text-muted-foreground">
                    {selectedCert.rating}/5
                  </span>
                </div>

                {selectedCert.review && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {selectedCert.review}
                  </p>
                )}

                <dl className="divide-y divide-border text-xs">
                  <div className="flex items-center justify-between gap-3 py-2">
                    <dt className="text-muted-foreground">Issued</dt>
                    <dd className="tnum font-mono text-foreground">
                      {formatDate(selectedCert.issuedAt)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <dt className="text-muted-foreground">Verification code</dt>
                    <dd>
                      <CopyButton value={selectedCert.verificationCode} />
                    </dd>
                  </div>
                  {selectedCert.sha256 && (
                    <div className="py-2">
                      <dt className="text-muted-foreground">SHA-256 fingerprint</dt>
                      <dd className="mt-1 break-all font-mono text-2xs text-subtle-foreground">
                        {selectedCert.sha256}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {selectedCert && (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/verify/${selectedCert.verificationCode}`}>Verify</Link>
                </Button>
                {selectedCert.certificateFile && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`/api/certificates/verify/${selectedCert.verificationCode}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download />
                      Download certificate
                    </a>
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ProfileSkeleton() {
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
      <SkeletonStats count={4} />
      <Skeleton className="mb-6 mt-8 h-32 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </AppShell>
  );
}
