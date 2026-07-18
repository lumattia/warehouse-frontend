export interface IdName {
  id: number|string;
  name: string;
  flag?: string;
}
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
export interface PaginationState {
  pageSize: number;
  pageNumber: number;
  totalItems: number;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}
export interface FileInfoRequest {
  base64: string;
  fileName: string;
  contentType: string;
}
export interface FileInfoResponse {
  url: string;
  orioginalFileName: string;
  size: number;
}
