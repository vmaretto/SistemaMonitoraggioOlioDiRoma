

import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      organization?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    organization?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    organization?: string
  }
}
