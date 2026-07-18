import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { tap, switchMap, of } from 'rxjs';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { TenantService } from './tenant.service';
import { ModalService } from '../../shared/services/modal.service';
import { GenericErrorModalComponent } from '../../shared/components/modals/generic-error-modal/generic-error-modal.component';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private auth0 = inject(Auth0Service);
  private userSignal = signal<User | null>(null);
  private tenantService = inject(TenantService);
  private modalService = inject(ModalService);

  user = this.userSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());

  modules = computed(() => {
    const user = this.userSignal();
    if (!user || !user.tenant || !user.tenant.modules) return [];
    return user.tenant.modules;
  });

  hasModule(moduleName: string): boolean {
    if (!moduleName) return true;
    return this.modules().some(m => m === moduleName.toUpperCase());
  }

  isSuperAdmin = computed(() => this.userSignal()?.role === 'SUPERADMIN');
  isReseller = computed(() => this.userSignal()?.role === 'RESELLER');
  isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');
  isAtLeastAdmin = computed(() => this.isSuperAdmin() || this.isAdmin() || this.isReseller());
  canSwitchTenant = computed(() => this.isSuperAdmin() || this.isReseller());

  init() {
    this.userSignal.set(JSON.parse(localStorage.getItem('user') || 'null'));
    return this.auth0.isAuthenticated$.pipe(
      switchMap(isAuth => {
        if (isAuth) {
          return this.auth0.getAccessTokenSilently().pipe(
            switchMap(token => {
              localStorage.setItem('access_token', token);
              return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
                switchMap(user => {
                  if (user && (user.role === 'RESELLER' || user.role === 'SUPERADMIN')) {
                    return this.http.get<any[]>(`${environment.apiUrl}/tenants/list`).pipe(
                      tap(allowedTenants => {
                        user.allowedTenants = allowedTenants;
                      }),
                      switchMap(() => of(user))
                    );
                  }
                  return of(user);
                })
              );
            })
          );
        } else {
          return of(null);
        }
      }),
      tap(user => {
        let localUser = localStorage.getItem('user');
        if (localUser != JSON.stringify(user))
        {
          this.userSignal.set(user);
          localStorage.setItem('user', JSON.stringify(user));
          window.location.reload();
        }
      })
    );
  }
  createDemoAccount() {
    return this.http.post<any>(`${environment.apiUrl}/users/demo`, {}).pipe(
      tap(res => {
        const modalRef = this.modalService.open(GenericErrorModalComponent, { 
          type: 'info', 
          title: 'login.modalTitle',
          message: 'login.demoCreated',
          translateParams: { email: res.email, password: res.password }
        });
        modalRef.close =() => {
          navigator.clipboard.writeText(res.password).then(() => {
            this.auth0.loginWithRedirect({ authorizationParams: { login_hint: res.email } });
          }).catch(err => {
            console.error('Auto-copy failed:', err);
            const fallbackModal = this.modalService.open(GenericErrorModalComponent, {
              type: 'warning',
              message: 'login.copyFallback',
              translateParams: { password: res.password }
            });
            fallbackModal.close(() => {
              this.auth0.loginWithRedirect({ authorizationParams: { login_hint: res.email } });
            });
          });
        };
      })
    )
  }

  login() {
    this.deleteLocalStorage();
    this.auth0.loginWithRedirect();
  }

  logout() {
    this.deleteLocalStorage();
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  }
  deleteLocalStorage() {
    localStorage.removeItem('access_token');  
    localStorage.removeItem('user');
    localStorage.removeItem('impersonatingUserId');
  }

  switchTenant(tenantId: string) {
    return this.tenantService.switchTenant(tenantId).pipe(
      tap(user => {
        this.init().subscribe();
      })
    );
  }
}
