import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { KnowledgeEntry } from "@innoverse/database";
import { requireKnowledgeAccess } from "@/lib/knowledge-access";

export const dynamic = "force-dynamic";

/** Recent knowledge-base activity for the challenge. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { problemId } = await params;
    const access = await requireKnowledgeAccess(
      problemId,
      session.user.id,
      session.user.role as any
    );
    if (access instanceof NextResponse) return access;

    const entries = await KnowledgeEntry.find({ problemId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      repo: `${access.problem.githubOwner}/${access.problem.githubRepoName}`,
      entries: entries.map((e: any) => ({
        id: String(e._id),
        type: e.type,
        question: e.question ?? null,
        pullNumber: e.pullNumber ?? null,
        answer: e.answer,
        sources: e.sources ?? [],
        payload: e.payload ?? null,
        model: e.model ?? null,
        createdAt: e.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
