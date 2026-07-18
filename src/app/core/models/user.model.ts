import { IdName } from "./common.models";
import { Tenant } from "./tenant.model";

export interface User {
  id: number;
  username: string;
  role: 'USER' | 'ADMIN' | 'RESELLER' | 'SUPERADMIN';
  tenant?: Tenant;
  allowedTenants?: IdName[];
  isEditable?: boolean;
}

export interface UserFilter {
  username?: string;
  role?: 'USER' | 'ADMIN' | 'RESELLER' | 'SUPERADMIN';
}

export interface UserCreateRequest {
  username: string;
  role: 'USER' | 'ADMIN' | 'RESELLER' | 'SUPERADMIN';
  allowedTenantIds?: string[];
}

export interface UserUpdateRequest {
  id: number;
  username: string;
  role: 'USER' | 'ADMIN' | 'RESELLER' | 'SUPERADMIN';
  allowedTenantIds?: string[];
}
