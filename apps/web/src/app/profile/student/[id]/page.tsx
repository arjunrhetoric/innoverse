"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Star,
  Trophy,
  Calendar,
  Fingerprint,
  Book,
  Users,
  ArrowLeft,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { profile } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { GitHubProfile, Certificate, User } from "@/lib/types";
import Link from "next/link";

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
        <div className="mb-8 flex gap-5">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-28" />
            <Skeleton className="mb-2 h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="py-20 text-center">
          <p className="text-muted-foreground">Student profile not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { user: studentUser, githubProfile, certificates } = data;

  return (
    <AppShell>
      <div className="mb-5">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
      </div>

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
            Student
          </p>
          <h1 className="type-display mt-1 text-2xl font-medium text-foreground">
            {githubProfile?.name || studentUser?.name}
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
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild>
              <a href={githubProfile?.html_url || "#"} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Certificates */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-medium tracking-tight text-foreground">
          <Trophy className="h-4 w-4 text-amber-500" />
          Certificates
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {certificates.length}
          </span>
        </h2>
        {certificates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No certificates yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => {
              const prob = typeof cert.problemId === "object" ? cert.problemId : null;
              return (
                <div
                  key={cert._id}
                  className="rounded-lg border border-border bg-card p-5 transition-colors duration-100 hover:border-foreground/20"
                >
                  <h3 className="mb-2 text-sm font-medium tracking-tight text-foreground">
                    {prob?.title || "Project"}
                  </h3>
                  <div className="mb-2 flex gap-0.5" aria-label={`Rated ${cert.rating} of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < cert.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                    {cert.review}
                  </p>
                  <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(cert.issuedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Fingerprint className="h-3 w-3" />
                      {cert.verificationCode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
