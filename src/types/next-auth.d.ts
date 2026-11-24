import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      /** GitHub numeric user id (stringified). */
      id: string
    } & DefaultSession['user']
  }
}
