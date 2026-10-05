/** The four platform roles, exactly as the API spells them. */
export type Role = 'Admin' | 'Staff' | 'Member';

/**
 * The signed-in account as the interface needs it. It carries an opaque public code
 * rather than an internal id, and nothing that identifies the person to anyone else.
 */
export interface CurrentUser {
  publicId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  preferredLanguage: string;
  roles: Role[];
  sellerPublicId: string | null;
}

/** What a successful sign-in returns. */
export interface AuthenticationResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: CurrentUser;
}

/** Sign-in details. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Sign-up details. One account can both buy and sell. */
export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
  preferredLanguage: string;
}
