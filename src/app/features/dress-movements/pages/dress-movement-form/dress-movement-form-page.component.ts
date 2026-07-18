import { Component, inject, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DressMovementService } from '../../../../core/services/dress-movement.service';
import { DressService } from '../../../../core/services/dress.service';
import { CustomFieldService } from '../../../../core/services/custom-field.service';
import { DressMovement } from '../../../../core/models/dress-movement.model';
import { ModuleType } from '../../../../core/models/tenant.model';
import { IdName } from '../../../../core/models/common.models';
import { SelectInputComponent } from '../../../../shared/components/inputs/select-input/select-input.component';
import { NumberInputComponent } from '../../../../shared/components/inputs/number-input/number-input.component';
import { DynamicFormComponent } from '../../../../shared/components/dynamic-form/dynamic-form.component';
import { CollapsibleSectionComponent } from '../../../../shared/components/collapsible-section/collapsible-section.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CanDeactivateComponent } from '../../../../core/guards/unsaved-changes.guard';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { ModalService } from '../../../../shared/services/modal.service';
import { GenericErrorModalComponent } from '../../../../shared/components/modals/generic-error-modal/generic-error-modal.component';

@Component({
  selector: 'app-dress-movement-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, SelectInputComponent, NumberInputComponent, DynamicFormComponent, CollapsibleSectionComponent, ButtonComponent, LoadingComponent],
  templateUrl: './dress-movement-form-page.component.html',
  styleUrls: ['./dress-movement-form-page.component.css'],
})
export class DressMovementFormPageComponent implements OnInit, CanDeactivateComponent {
  private dressMovementService = inject(DressMovementService);
  private dressService = inject(DressService);
  private customFieldService = inject(CustomFieldService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private modalService = inject(ModalService);

  id: number | null = null;
  dressMovementForm = new FormGroup({
    dressId: new FormControl('', [Validators.required]),
    quantity: new FormControl('', [Validators.required, Validators.min(1)])
  });
  customFieldsForm = new FormGroup({});
  dresses: IdName[] = [];
  editingSections = new Set<string>();
  initialData: any = null;
  module = ModuleType.DRESS_MOVEMENT;
  isEditMode = false;
  loading = signal<boolean>(false);

  sectionFields: Record<string, string[]> = {
    basicInfo: ['dressId', 'quantity']
  };

  getControl(name: string): FormControl {
    return this.dressMovementForm.get(name) as FormControl;
  }

  isSectionEditing(section: string): boolean {
    return this.editingSections.has(section);
  }

  isSectionValid(section: string): boolean {
    const fields = this.sectionFields[section];
    if (!fields) return true;

    return fields.every(field => {
      const control = this.dressMovementForm.get(field);
      return control?.valid;
    });
  }

  toggleSectionEdit(section: string): void {
    if (this.editingSections.has(section)) {
      this.editingSections.delete(section);
    } else {
      this.editingSections.add(section);
    }
    this.cdr.detectChanges();
  }

  saveAll(): void {
    this.loading.set(true);
    const formValue = this.dressMovementForm.value;
    const item: Partial<DressMovement> = {
      dressId: formValue.dressId ? Number(formValue.dressId) : 0,
      quantity: formValue.quantity ? Number(formValue.quantity) : 0
    };

    this.dressMovementService.create(item).subscribe({
      next: (createdMovement) => {
        this.id = createdMovement.id;
        // Save custom fields if any
        const customFields: Record<number, string> = {};
        Object.keys(this.customFieldsForm.controls).forEach(key => {
            customFields[parseInt(key)] = this.customFieldsForm.get(key)?.value || '';
        });

        if (Object.keys(customFields).length > 0) {
          this.customFieldService.saveValues(this.module, this.id, { customFields }).subscribe({
            next: () => {
              this.loading.set(false);
              this.dressMovementForm.reset();
              this.customFieldsForm.reset();
              this.router.navigate(['/dress-movements']);
            },
            error: (error) => {
              this.loading.set(false);
              this.modalService.open(GenericErrorModalComponent, {
                title: 'dressMovements.error.title',
                message: 'dressMovements.error.customFieldsSaveFailed',
                type: 'error'
              });
              console.error('Error saving custom fields:', error);
            }
          });
        } else {
          this.loading.set(false);
          this.dressMovementForm.reset();
          this.customFieldsForm.reset();
          this.router.navigate(['/dress-movements']);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'dressMovements.error.title',
          message: 'dressMovements.error.createFailed',
          type: 'error'
        });
        console.error('Error creating dress movement:', error);
      }
    });
  }

  saveSection(section: string): void {
    if (!this.id) return;

    this.loading.set(true);
    const fields = this.sectionFields[section];
    if (!fields) return;

    const partialDressMovement: Partial<DressMovement> = { ...this.initialData };

    fields.forEach(f => {
      partialDressMovement[f as keyof DressMovement] = this.dressMovementForm.get(f)?.value;
    });

    this.dressMovementService.update(this.id, partialDressMovement).subscribe({
      next: () => {
        this.loading.set(false);
        Object.keys(partialDressMovement).forEach(key => {
          (this.initialData as any)[key] = (partialDressMovement as any)[key];
        });
        this.resetSection(section);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'dressMovements.error.title',
          message: 'dressMovements.error.saveFailed',
          type: 'error'
        });
        console.error('Error saving:', error);
      }
    });
  }

  resetSection(section: string): void {
    const fields = this.sectionFields[section];
    if (!fields) return;

    const resetValue: any = {};
    fields.forEach(field => {
      resetValue[field] = this.initialData[field];
    });

    this.dressMovementForm.patchValue(resetValue);
    this.editingSections.delete(section);
    this.cdr.detectChanges();
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.id = +idParam;
      this.loading.set(true);
      this.dressMovementService.getById(this.id).subscribe((data: DressMovement) => {
        this.loading.set(false);
        this.initialData = {
          dressId: data.dress.id.toString(),
          quantity: data.quantity.toString(),
          dress: data.dress
        };
        this.dressMovementForm.patchValue({
          dressId: data.dress.id.toString(),
          quantity: data.quantity.toString()
        });
        this.cdr.detectChanges();
      }, error => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'dressMovements.error.title',
          message: 'dressMovements.error.loadFailed',
          type: 'error'
        });
        console.error('Error loading movement:', error);
      });
    }
    this.dressService.list().subscribe(data => this.dresses = data);

    this.route.queryParamMap.subscribe((params: ParamMap) => {
      const editParam = params.get('edit');
      if (editParam === 'true') {
        this.isEditMode = true;
        this.editingSections.add('basicInfo');
      }
    });
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.dressMovementForm.dirty || this.customFieldsForm.dirty;
  }
}
