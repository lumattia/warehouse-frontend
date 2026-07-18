import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { TenantCreateRequest, TenantUpdateRequest, ModuleType } from '../../../../core/models/tenant.model';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CollapsibleSectionComponent } from '../../../../shared/components/collapsible-section/collapsible-section.component';
import { CanDeactivateComponent } from '../../../../core/guards/unsaved-changes.guard';
import { CheckboxInputComponent } from '../../../../shared/components/inputs/checkbox-input/checkbox-input.component';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { ModalService } from '../../../../shared/services/modal.service';
import { GenericErrorModalComponent } from '../../../../shared/components/modals/generic-error-modal/generic-error-modal.component';
import { ImageInputComponent } from '../../../../shared/components/inputs/image-input/image-input.component';
import { AuthService } from '../../../../core/services/auth.service';
import { FileInfoRequest, FileInfoResponse } from '../../../../core/models/common.models';

@Component({
  selector: 'app-tenant-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    TextInputComponent,
    ButtonComponent,
    CollapsibleSectionComponent,
    CheckboxInputComponent,
    LoadingComponent,
    ImageInputComponent
  ],
  templateUrl: './tenant-form-page.component.html',
  styleUrls: ['./tenant-form-page.component.css'],
})
export class TenantFormPageComponent implements OnInit, CanDeactivateComponent {
  private authService = inject(AuthService);
  private tenantService = inject(TenantService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(ModalService);

  id: string | null = null;
  tenantForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    existingLogo: new FormControl<FileInfoResponse | undefined>(undefined),
    newLogo: new FormControl<FileInfoRequest | undefined>(undefined),
  });
  modules: ModuleType[] = [];
  moduleOptions = [
    { id: ModuleType.DRESS, name: 'tenants.form.modules.DRESS' },
    { id: ModuleType.DRESS_MOVEMENT, name: 'tenants.form.modules.DRESS_MOVEMENT' },
  ];
  initialData: any = null;
  editingSections = new Set<string>();
  loading = signal<boolean>(false);

  getControl(name: string): FormControl {
    return this.tenantForm.get(name) as FormControl;
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
      case 'logo':
        return true;
      case 'basicInfo':
        return this.tenantForm.get('name')?.valid ?? false;
      case 'modules':
        return true;
      default:
        return false;
    }
  }

  saveSection(section: string): void {
    if (!this.isSectionValid(section)) return;
    if (!this.id) return;
    this.loading.set(true);
    const updateRequest: TenantUpdateRequest = {
      id: this.id,
      name: this.initialData.name,
      modules: this.initialData.modules,
    };
    const formValue = this.tenantForm.value;
    switch(section){
      case ('logo'): 
        updateRequest.logo = formValue.newLogo || undefined;
        break;
      case ('basicInfo'): 
        updateRequest.name = formValue.name || '';
        break;
      case ('modules'): 
        updateRequest.modules = this.modules;
        break;
    }
    this.tenantService.update(this.id, updateRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.editingSections.delete(section);
        this.initialData = {
          name: data.name,
          logo: data.logo,
          modules: data.modules || [],
        };
        if (this.id == this.authService.user()?.tenant?.id) {
          // Cheat to update tenant
          this.authService.init().subscribe();
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'tenants.error.title',
          message: 'tenants.error.saveFailed',
          type: 'error'
        });
        console.error('Error saving:', error);
      }
    });
  }

  resetSection(section: string): void {
    if (this.initialData) {
      if (section === 'logo') {
        this.tenantForm.patchValue({
          existingLogo: this.initialData.logo,
          newLogo: undefined,
        });
      }
      else if (section === 'basicInfo') {
        this.tenantForm.patchValue({
          name: this.initialData.name
        });
      } else if (section === 'modules') {
        this.modules = [...this.initialData.modules];
      }
    }
    this.editingSections.delete(section);
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.id = idParam;
      this.loading.set(true);

      this.route.queryParamMap.subscribe((params: ParamMap) => {
        const editParam = params.get('edit');
        if (editParam === 'true') {
          this.editingSections.add('logo');
          this.editingSections.add('basicInfo');
          this.editingSections.add('modules');
        }
      });

      this.tenantService.getById(this.id).subscribe(data => {
        this.loading.set(false);
        this.initialData = {
          name: data.name,
          modules: data.modules || [],
          logo: data.logo
        };
        this.tenantForm.patchValue({
          name: data.name,
          existingLogo: data.logo,
        });
        this.modules = data.modules || [];
      }, error => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'tenants.error.title',
          message: 'tenants.error.loadFailed',
          type: 'error'
        });
        console.error('Error loading tenant:', error);
      });
    }
  }

  save(): void {
    this.loading.set(true);
    const formValue = this.tenantForm.value;
    const createRequest: TenantCreateRequest = {
      name: formValue.name || '',
      modules: this.modules || [],
      logo: formValue.newLogo || undefined
    };
    this.tenantService.create(createRequest).subscribe({
      next: () => {
        this.loading.set(false);
        this.tenantForm.reset();
        this.router.navigate(['/tenants']);
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'tenants.error.title',
          message: 'tenants.error.createFailed',
          type: 'error'
        });
        console.error('Error creating tenant:', error);
      }
    });
  }


  exit(): void {
    this.router.navigate(['/tenants']);
  }

  onModuleChange(module: ModuleType) {
    const index = this.modules.indexOf(module);
    if (index > -1) {
      this.modules.splice(index, 1);
    }
    else{
      this.modules.push(module);
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.tenantForm.dirty;
  }
}
