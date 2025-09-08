
import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      organization?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
    organization?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    organization?: string;
  }
}
