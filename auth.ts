import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";
import { accounts, authenticators, sessions, users, verificationTokens } from "@/db/schema";
import { ensureDefaultFamilyForUser } from "@/lib/auth/bootstrap-family";
import { promoteExecutorsToAdminForCoAdminEmail } from "@/lib/auth/promote-co-admins";

export const { handlers, auth, signIn, signOut } = NextAuth({
  /** 배포(Vercel)에서 누락 시 Auth.js가 "Server error / server configuration" 페이지를 반환합니다. */
  secret: process.env.AUTH_SECRET,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  trustHost: true,
  events: {
    async createUser({ user }) {
      if (!user.id) {
        return;
      }
      await ensureDefaultFamilyForUser(user.id, user.name);
    },
    async signIn({ user }) {
      if (!user.id) {
        return;
      }
      await promoteExecutorsToAdminForCoAdminEmail(user.id, user.email);
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

/** NextAuth v5는 unauthorized()를 내보내지 않으므로 래퍼 함수 제공. */
export function unauthorized() {
  redirect("/login");
}
