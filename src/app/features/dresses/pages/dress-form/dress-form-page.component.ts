import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DressService } from '../../../../core/services/dress.service';
import { CustomFieldService } from '../../../../core/services/custom-field.service';
import { Dress } from '../../../../core/models/dress.model';
import { ModuleType } from '../../../../core/models/tenant.model';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { ColorInputComponent } from '../../../../shared/components/inputs/color-input/color-input.component';
import { NumberInputComponent } from '../../../../shared/components/inputs/number-input/number-input.component';
import { DynamicFormComponent } from '../../../../shared/components/dynamic-form/dynamic-form.component';
import { CollapsibleSectionComponent } from '../../../../shared/components/collapsible-section/collapsible-section.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CanDeactivateComponent } from '../../../../core/guards/unsaved-changes.guard';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { ModalService } from '../../../../shared/services/modal.service';
import { GenericErrorModalComponent } from '../../../../shared/components/modals/generic-error-modal/generic-error-modal.component';

@Component({
  selector: 'app-dress-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    TextInputComponent,
    ColorInputComponent,
    NumberInputComponent,
    DynamicFormComponent,
    CollapsibleSectionComponent,
    ButtonComponent,
    LoadingComponent,
  ],
  templateUrl: './dress-form-page.component.html',
  styleUrls: ['./dress-form-page.component.css'],
})
export class DressFormPageComponent implements OnInit, CanDeactivateComponent {
  private dressService = inject(DressService);
  private customFieldService = inject(CustomFieldService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(ModalService);

  id: number | null = null;
  dressForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.maxLength(20)]),
    sku: new FormControl('', Validators.required),
    size: new FormControl(''),
    color: new FormControl('#000000'),
    price: new FormControl(0, [Validators.required, Validators.min(0.01)])
  });
  customFieldsForm = new FormGroup({});
  editingSections = new Set<string>();
  initialData!: Dress;
  module = ModuleType.DRESS;
  isEditMode = false;
  sectionFields: Record<string, string[]> = {
    basicInfo: ['title', 'sku', 'size'],
    details: ['color', 'price']
  };
  loading = signal<boolean>(false);

  getControl(name: string): FormControl {
    return this.dressForm.get(name) as FormControl;
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

  saveAll(): void {
    this.loading.set(true);
    const formValue = this.dressForm.value;
    const dress: Partial<Dress> = {
      title: formValue.title || '',
      sku: formValue.sku || '',
      size: formValue.size || '',
      color: formValue.color || '#000000',
      price: formValue.price || 0
    };

    this.dressService.create(dress).subscribe({
      next: (createdDress) => {
        this.id = createdDress.id;
        // Save custom fields if any
        const customFields: Record<number, string> = {};
        Object.keys(this.customFieldsForm.controls).forEach(key => {
            customFields[parseInt(key)] = this.customFieldsForm.get(key)?.value || '';
        });

        if (Object.keys(customFields).length > 0) {
          this.customFieldService.saveValues(this.module, this.id, { customFields }).subscribe({
            next: () => {
              this.loading.set(false);
              this.dressForm.reset();
              this.customFieldsForm.reset();
              this.router.navigate(['/dresses']);
            },
            error: (error) => {
              this.loading.set(false);
              this.modalService.open(GenericErrorModalComponent, {
                title: 'dresses.error.title',
                message: 'dresses.error.customFieldsSaveFailed',
                type: 'error'
              });
              console.error('Error saving custom fields:', error);
            }
          });
        } else {
          this.loading.set(false);
          this.dressForm.reset();
          this.customFieldsForm.reset();
          this.router.navigate(['/dresses']);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'dresses.error.title',
          message: 'dresses.error.createFailed',
          type: 'error'
        });
        console.error('Error creating dress:', error);
      }
    });
  }

  isSectionValid(section: string): boolean {
    const fields = this.sectionFields[section];
    if (!fields) return true;
    let isValid = true;
    fields.forEach(f => {
      const ctrl = this.dressForm.get(f);
      if (ctrl?.invalid) isValid = false;
    });
    return isValid;
  }

  saveSection(section: string): void {
    if (!this.id) return;

    this.loading.set(true);
    const fields = this.sectionFields[section];
    if (!fields) return;

    const partialDress: Partial<Dress> = { ...this.initialData };
    fields.forEach(f => {
      partialDress[f as keyof Dress] = this.dressForm.get(f)?.value;
    });
    this.dressService.update(this.id, partialDress).subscribe({
      next: () => {
        this.loading.set(false);
        Object.keys(partialDress).forEach(key => {
          (this.initialData as any)[key] = (partialDress as any)[key];
        });
        this.resetSection(section);
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'dresses.error.title',
          message: 'dresses.error.saveFailed',
          type: 'error'
        });
        console.error('Error saving:', error);
      }
    });
  }

  resetSection(section: string): void {
    const fields = this.sectionFields[section];
    fields.forEach(f => {
      const originalValue = this.initialData[f as keyof Dress];
      this.dressForm.get(f)?.reset(originalValue);
    });

    this.editingSections.delete(section);
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.id = +idParam;
      this.route.queryParamMap.subscribe((params: ParamMap) => {
        const editParam = params.get('edit');
        if (editParam === 'true') {
          this.isEditMode = true;
          this.editingSections.add('basicInfo');
          this.editingSections.add('details');
        }
      });
      this.loading.set(true);
      this.dressService.getById(this.id).subscribe(data => {
        this.loading.set(false);
        this.initialData = data;
        this.dressForm.patchValue({
          title: data.title,
          sku: data.sku,
          size: data.size,
          color: data.color,
          price: data.price
        });
      }, error => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'dresses.error.title',
          message: 'dresses.error.loadFailed',
          type: 'error'
        });
        console.error('Error loading dress:', error);
      });
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.dressForm.dirty || this.customFieldsForm.dirty;
  }
}
