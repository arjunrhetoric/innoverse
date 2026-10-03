import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { connectDB, User } from "@innoverse/database";

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
          accessToken: account?.access_token,
          role: null,
        });
      } else {
        dbUser.accessToken = account?.access_token;
        dbUser.githubUsername = githubProfile?.login || dbUser.githubUsername;
        await dbUser.save();
      }

      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.githubId = user.id;
      }

      // Fetch user from DB to get the latest role
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
      session.accessToken = token.accessToken as string;
      
      return session;
    },
  },
};
