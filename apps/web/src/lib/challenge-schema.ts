import { z } from "zod";

/**
 * Challenge creation payload.
 *
 * Note: `githubRepoName` accepts an empty string because the client always
 * sends the field (even when the repo toggle is off). A missing name is only
 * an error when `createGithubRepo` is true.
 */
export const ChallengeSchema = z
  .object({
    title: z.string().trim().min(5).max(160),
    description: z.string().trim().min(20).max(5000),
    skillsRequired: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    finalDeadline: z.string().min(1),
    createGithubRepo: z.boolean().optional(),
    githubRepoName: z
      .string()
      .trim()
      .max(100)
      .regex(
        /^[A-Za-z0-9._-]*$/,
        "Repository names can only contain letters, numbers, dots, underscores and hyphens"
      )
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.createGithubRepo && !value.githubRepoName) {
      ctx.addIssue({
        code: "custom",
        path: ["githubRepoName"],
        message: "Provide a repository name, or turn off repository creation",
      });
    }
  });

export type ChallengeInput = z.infer<typeof ChallengeSchema>;
