import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ImpersonationService } from '../../../../core/services/impersonation.service';
import { UserCreateRequest, UserUpdateRequest } from '../../../../core/models/user.model';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select-input/select-input.component';
import { EnumService } from '../../../../core/services/enum.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CollapsibleSectionComponent } from '../../../../shared/components/collapsible-section/collapsible-section.component';
import { CanDeactivateComponent } from '../../../../core/guards/unsaved-changes.guard';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { ModalService } from '../../../../shared/services/modal.service';
import { GenericErrorModalComponent } from '../../../../shared/components/modals/generic-error-modal/generic-error-modal.component';

@Component({
  selector: 'app-user-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    TextInputComponent,
    SelectInputComponent,
    ButtonComponent,
    CollapsibleSectionComponent,
    LoadingComponent,
  ],
  templateUrl: './user-form-page.component.html',
  styleUrls: ['./user-form-page.component.css'],
})
export class UserFormPageComponent implements OnInit, CanDeactivateComponent {
  private userService = inject(UserService);
  private enumService = inject(EnumService);
  private authService = inject(AuthService);
  private impersonationService = inject(ImpersonationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(ModalService);

  id: number | null = null;
  userForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    role: new FormControl('USER', [Validators.required])
  });
  allowedTenantIds: string[] = [];
  assignableRoles: string[] = [];
  isEditMode = false;
  initialData: any = null;
  isEditable = true;
  editingSections = new Set<string>();
  currentUserRole: string | null = null;
  loading = signal<boolean>(false);

  get roleOptions() {
    return this.assignableRoles.map(role => ({
      id: role,
      name: `users.form.roleOptions.${role}`
    }));
  }

  getControl(name: string): FormControl {
    return this.userForm.get(name) as FormControl;
  }

  isSectionEditing(section: string): boolean {
    return this.editingSections.has(section);
  }

  toggleSectionEdit(section: string): void {
    if (this.editingSections.has(section)) {
      this.editingSections.delete(section);
    } else {
      this.editingSections.add(section);
    }
  }

  isSectionValid(section: string): boolean {
    switch (section) {
      case 'basicInfo':
        return (this.userForm.get('username')?.valid ?? false) && (this.userForm.get('role')?.valid ?? false);
      default:
        return true;
    }
  }

  saveSection(section: string): void {
    if (!this.isSectionValid(section)) return;
    if (!this.id) return;
    this.loading.set(true);
    const updateRequest: UserUpdateRequest = {
      id: this.id,
      username: this.initialData.username || '',
      role: this.initialData.role,
      allowedTenantIds: this.initialData.allowedTenantIds,
    };
    const formValue = this.userForm.value;
    switch(section){
      case ('basicInfo'): 
        updateRequest.username = formValue.username || '';
        updateRequest.role = (formValue.role || 'USER') as 'USER' | 'ADMIN' | 'SUPERADMIN';
        updateRequest.allowedTenantIds= this.allowedTenantIds;
        break;
    }
    this.userService.update(this.id, updateRequest).subscribe({
      next: () => {
        this.loading.set(false);
        this.editingSections.delete(section);
        if (this.id) {
          this.userService.getById(this.id).subscribe(data => {
            this.initialData = {
              username: data.username,
              role: data.role,
              allowedTenantIds: data.allowedTenants?.map(t => t.id.toString()) || []
            };
          });
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'users.error.title',
          message: 'users.error.saveFailed',
          type: 'error'
        });
        console.error('Error saving:', error);
      }
    });
  }

  resetSection(section: string): void {
    if (this.initialData) {
      this.userForm.patchValue({
        username: this.initialData.username,
        role: this.initialData.role
      });
    }
    this.editingSections.delete(section);
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.id = +idParam;
      this.isEditMode = false;
      this.loading.set(true);

      this.route.queryParamMap.subscribe((params: ParamMap) => {
        const editParam = params.get('edit');
        if (editParam === 'true') {
          this.isEditMode = true;
        }
      });

      this.userService.getById(this.id).subscribe(data => {
        this.loading.set(false);
        this.initialData = {
          username: data.username,
          role: data.role,
          allowedTenantIds: data.allowedTenants?.map(t => t.id.toString()) || []
        };
        this.currentUserRole = data.role;
        this.userForm.patchValue({
          username: data.username,
          role: data.role
        });
        this.allowedTenantIds = data.allowedTenants?.map(t => t.id.toString()) || [];
        this.isEditable = data.isEditable !== false;

        this.enumService.getAssignableRoles().subscribe(roles => {
          this.assignableRoles = roles;

          // If editing own profile and current role not in assignable roles, add it manually
          const currentUser = this.authService.user();
          if (currentUser && this.id === currentUser.id && !roles.includes(currentUser.role)) {
            this.assignableRoles = [...roles, currentUser.role];
          }
        });
      }, error => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'users.error.title',
          message: 'users.error.loadFailed',
          type: 'error'
        });
        console.error('Error loading user:', error);
      });
    } else {
      this.isEditMode = true;
      this.enumService.getAssignableRoles().subscribe(roles => {
        this.assignableRoles = roles;
      });
    }
  }

  save(): void {
    this.loading.set(true);
    const formValue = this.userForm.value;
    const createRequest: UserCreateRequest = {
      username: formValue.username || '',
      role: (formValue.role || 'USER') as 'USER' | 'ADMIN' | 'SUPERADMIN',
      allowedTenantIds: this.allowedTenantIds,
    };
    this.userService.create(createRequest).subscribe({
      next: () => {
        this.loading.set(false);
        this.userForm.reset();
        this.router.navigate(['/users']);
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'users.error.title',
          message: 'users.error.createFailed',
          type: 'error'
        });
        console.error('Error creating user:', error);
      }
    });
  }

  enableEditMode(): void {
    this.isEditMode = true;
  }

  cancelEdit(): void {
    if (!this.id) {
      this.router.navigate(['/users']);
      return;
    }
    this.isEditMode = false;
    if (this.initialData) {
      this.userForm.patchValue({
        username: this.initialData.username,
        role: this.initialData.role
      });
      this.allowedTenantIds = this.initialData.allowedTenantIds;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: null },
      queryParamsHandling: 'merge'
    });
  }

  exit(): void {
    this.router.navigate(['/users']);
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.userForm.dirty;
  }

  canImpersonate(): boolean {
    const currentUser = this.authService.user();
    if (!currentUser || !this.currentUserRole) return false;

    const roleHierarchy: { [key: string]: number } = {
      'SUPERADMIN': 4,
      'RESELLER': 3,
      'ADMIN': 2,
      'USER': 1
    };

    const currentRoleLevel = roleHierarchy[currentUser.role] || 0;
    const targetRoleLevel = roleHierarchy[this.currentUserRole] || 0;
    if (currentRoleLevel < 3) return false;
    return currentRoleLevel > targetRoleLevel;
  }

  startImpersonation(): void {
    if (this.id) {
      this.impersonationService.startImpersonation(this.id);
    }
  }
}
