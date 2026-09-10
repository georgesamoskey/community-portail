import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    error?: string;
  }

  interface User {
    id?: string;
    preferred_username?: string;
    /** Rôles realm Keycloak (`realm_access.roles`). */
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
    id_token?: string;
    email?: string;
    name?: string;
    preferred_username?: string;
    sub?: string;
    roles?: string[];
  }
}
