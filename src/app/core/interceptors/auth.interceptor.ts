import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { ImpersonationService } from "../services/impersonation.service";
import { environment } from "../../../environments/environment";

// auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');
  const impersonationService = inject(ImpersonationService);

  // Clone the request to add the header if the token exists
  if (req.url.startsWith(environment.apiUrl) && token) {
    const headers: { [key: string]: string } = {
      Authorization: `Bearer ${token}`
    };

    // Add impersonation header if active
    const impersonatingUserId = impersonationService.impersonatingUserId();
    if (impersonatingUserId) {
      headers['X-Impersonate-User'] = impersonatingUserId.toString();
    }

    const authReq = req.clone({
      setHeaders: headers
    });
    return next(authReq);
  }

  return next(req);
};