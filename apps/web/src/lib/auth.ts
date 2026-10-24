import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { connectDB, User } from "@innoverse/database";
import { encryptSecret } from "./crypto";
import { clearGithubTokenCache } from "./github-token";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo read:user user:email",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      await connectDB();

      const githubProfile = profile as any;
      const email = user.email || githubProfile?.email;

      let dbUser = await User.findOne({ githubId: user.id });

      if (!dbUser && !email) {
        return "/login?error=GitHubEmailMissing";
      }

      if (!dbUser) {
        dbUser = await User.create({
          githubId: user.id,
          githubUsername: githubProfile?.login || user.name,
          name: user.name || githubProfile?.login,
          email,
          githubTokenEnc: account?.access_token
            ? encryptSecret(account.access_token)
            : undefined,
          role: null,
        });
      } else {
        if (account?.access_token) {
          dbUser.githubTokenEnc = encryptSecret(account.access_token);
          dbUser.accessToken = undefined;
        }
        dbUser.githubUsername = githubProfile?.login || dbUser.githubUsername;
        await dbUser.save();
        // The legacy plaintext token must not linger once encrypted.
        await User.updateOne({ _id: dbUser._id }, { $unset: { accessToken: 1 } });
      }

      clearGithubTokenCache(String(dbUser._id));

      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.githubId = user.id;
      }

      // Fetch user from DB to get the latest role. The GitHub token is
      // deliberately NOT placed in the JWT/session — see getGithubToken().
      await connectDB();
      const dbUser = await User.findOne({ githubId: token.githubId });
      
      if (dbUser) {
        token.role = dbUser.role;
        token.userId = dbUser._id.toString();
        token.githubUsername = dbUser.githubUsername;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.userId as string,
        githubId: token.githubId as string,
        role: token.role as string | null,
        githubUsername: token.githubUsername as string,
      };
      
      return session;
    },
  },
};
