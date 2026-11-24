import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

/**
 * Auth.js (NextAuth v5) with GitHub OAuth and a JWT session.
 * No database adapter — `session.user.id` is the GitHub numeric user id.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [GitHub],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, profile, account }) {
      if (account?.provider === 'github' && profile && 'id' in profile && profile.id != null) {
        token.sub = String(profile.id)
      }
      return token
    },
    session({ session, token }) {
      if (session.user && typeof token.sub === 'string' && token.sub.length > 0) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
