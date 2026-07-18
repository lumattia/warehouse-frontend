import { FileInfoRequest, FileInfoResponse } from "./common.models";

export enum ModuleType {
  DRESS = 'DRESS',
  DRESS_MOVEMENT = 'DRESS_MOVEMENT'
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  logo: FileInfoResponse;
  modules: ModuleType[];
  hasCustomFields: boolean;
}

export interface TenantFilter {
  name?: string;
  module?: ModuleType;
}

export interface TenantCreateRequest {
  name: string;
  modules: ModuleType[];
  logo?: FileInfoRequest;
}

export interface TenantUpdateRequest {
  id: string;
  name: string;
  logo?: FileInfoRequest;
  modules: ModuleType[];
}
