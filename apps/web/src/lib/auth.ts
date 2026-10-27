import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB, User } from "@innoverse/database";
import { encryptSecret } from "./crypto";
import { clearGithubTokenCache } from "./github-token";
import { verifyPassword } from "./password";
import { checkRateLimit } from "./rate-limit";

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
    CredentialsProvider({
      id: "credentials",
      name: "Institution",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        // Throttle credential stuffing without revealing whether the account exists.
        const limit = await checkRateLimit(`login:${email}`, 8, 60);
        if (!limit.ok) return null;

        await connectDB();
        const user = (await User.findOne({ email }).select("+passwordHash")) as any;
        if (!user?.passwordHash) return null;
        if (user.role !== "Institution") return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: String(user._id), name: user.name, email: user.email };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // GitHub-specific upsert; credentials users are created at registration.
      if (account?.provider !== "github") return true;

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
        if (account.provider === "github") {
          token.githubId = user.id;
        } else {
          token.userId = user.id;
        }
      }

      // Fetch user from DB to get the latest role. The GitHub token is
      // deliberately NOT placed in the JWT/session — see getGithubToken().
      await connectDB();
      const dbUser = token.userId
        ? await User.findById(token.userId)
        : token.githubId
          ? await User.findOne({ githubId: token.githubId })
          : null;
      
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
