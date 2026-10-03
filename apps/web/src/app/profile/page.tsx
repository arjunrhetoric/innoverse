"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ExternalLink,
  Star,
  GitFork,
  Trophy,
  Calendar,
  Download,
  Fingerprint,
  Book,
  Users,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardSpotlight } from "@/components/ui/card-spotlight";
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

  return (
    <AppShell>
          {/* Profile Header */}
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
            {githubProfile?.avatar_url && (
              <Image
                src={githubProfile.avatar_url}
                alt="Avatar"
                width={80}
                height={80}
                className="h-20 w-20 shrink-0 rounded-full border border-border"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Profile
              </p>
              <h1 className="type-display mt-1 text-2xl font-medium text-foreground">
                {githubProfile?.name || user?.name}
              </h1>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {githubProfile?.bio || "No bio available"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Book className="h-3.5 w-3.5" />
                  {githubProfile?.public_repos || 0} repos
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {githubProfile?.followers || 0} followers
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {githubProfile?.following || 0} following
                </span>
              </div>

              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={githubProfile?.html_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Contribution Chart */}
          {user?.githubUsername && (
            <div className="mb-8">
              <h2 className="mb-3 text-base font-medium tracking-tight text-foreground">
                Contributions
              </h2>
              <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">
                <Image
                  src={`https://ghchart.rshah.org/4f8cff/${user.githubUsername}`}
                  alt="GitHub contribution chart"
                  width={800}
                  height={120}
                  className="w-full"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Certificates */}
          <div className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-base font-medium tracking-tight text-foreground">
              <Trophy className="h-4 w-4 text-amber-500" />
              Certificates
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {certificates.length}
              </span>
            </h2>
            {certificates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No certificates earned yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificates.map((cert) => {
                  const problem = typeof cert.problemId === "object" ? cert.problemId : null;
                  const startup = typeof cert.startupId === "object" ? cert.startupId : null;

                  return (
                    <CardSpotlight
                      key={cert._id}
                      className="cursor-pointer"
                    >
                      <div onClick={() => setSelectedCert(cert)}>
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-sm">
                            {problem?.title || "Project"}
                          </h3>
                          <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Issued by{" "}
                          <span className="text-brand-bright">
                            @{startup?.githubUsername || startup?.name || "Startup"}
                          </span>
                        </p>
                        <div className="flex items-center gap-1 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < cert.rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {cert.review}
                        </p>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(cert.issuedAt)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Fingerprint className="h-3 w-3" />
                            {cert.verificationCode}
                          </span>
                        </div>
                      </div>
                    </CardSpotlight>
                  );
                })}
              </div>
            )}
          </div>

          {/* Repositories */}
          <div>
            <h2 className="mb-3 text-base font-medium tracking-tight text-foreground">
              Repositories
              <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                {Math.min(repos.length, 10)}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {repos.slice(0, 10).map((repo) => (
                <a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-border bg-card p-4 transition-colors duration-100 hover:border-foreground/20"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="truncate text-sm font-medium text-foreground">
                      {repo.name}
                    </h4>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {repo.description || "No description"}
                  </p>
                  <div className="mt-3 flex items-center gap-3 font-mono text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-foreground/60" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      {repo.forks_count}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

      {/* Certificate Detail Modal */}
      <Dialog
        open={!!selectedCert}
        onOpenChange={() => setSelectedCert(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Certificate Details</DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < selectedCert.rating
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedCert.review}
              </p>
              <div className="text-sm space-y-2 text-muted-foreground">
                <p>
                  <Calendar className="inline mr-1 h-3.5 w-3.5" />
                  Issued: {formatDate(selectedCert.issuedAt)}
                </p>
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-3.5 w-3.5 shrink-0" />
                  <CopyButton value={selectedCert.verificationCode} />
                </div>
              </div>
              {selectedCert.certificateFile && (
                <Button variant="outline" asChild className="w-full">
                  <a
                    href={selectedCert.certificateFile}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Certificate
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ProfileSkeleton() {
  return (
    <AppShell>
      <div className="mb-8 flex gap-5">
        <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-2 h-4 w-28" />
          <Skeleton className="mb-2 h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="mb-8 h-32 w-full rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </AppShell>
  );
}
