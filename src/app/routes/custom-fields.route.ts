import { Routes } from '@angular/router';
import { CustomFieldsPageComponent } from '../features/custom-fields/custom-fields-page.component';
import { UnsavedChangesGuard } from '../core/guards/unsaved-changes.guard';

export const customFieldsRoutes: Routes = [
  {
    path: 'custom-fields',
    component: CustomFieldsPageComponent,
    canDeactivate: [UnsavedChangesGuard],
  },
];
