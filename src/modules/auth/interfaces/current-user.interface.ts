import { UserRole } from '../enums/user-role.enum';

export interface CurrentUser {
  sub: string;
  id?: string;
  sid?: string;
  sessionId?: string;
  email: string;
  fullName?: string;
  role: UserRole;
  permissions: string[];
  type?: "access" | "refresh";
  isActive?: boolean;
}
