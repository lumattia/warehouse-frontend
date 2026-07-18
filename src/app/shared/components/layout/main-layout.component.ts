import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ImpersonationService } from '../../../core/services/impersonation.service';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, SelectInputComponent, ThemeToggleComponent, LanguageSelectorComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly translate = inject(TranslateService);
  readonly impersonationService = inject(ImpersonationService);

  sidenavCollapsed = signal(false);
  pageTitle = signal('nav.home');
  logo = signal(this.auth.user()?.tenant?.logo?.url??'');
  impersonatingUserId = this.impersonationService.impersonatingUserId;

  toggleSidenav(): void {
    this.sidenavCollapsed.update(collapsed => !collapsed);
  }

  switchTenant(tenantId: string): void {
    this.auth.switchTenant(tenantId).subscribe();
  }

  stopImpersonation(): void {
    this.impersonationService.stopImpersonation();
  }

  canImpersonate(): boolean {
    return this.auth.isAtLeastAdmin();
  }
}
