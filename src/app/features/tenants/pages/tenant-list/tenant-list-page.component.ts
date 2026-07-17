import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { Tenant } from '../../../../core/models/tenant.model';
import { ProTableComponent } from '../../../../shared/components/table/pro-table/pro-table.component';
import { IdName, PaginationState, SortState } from '../../../../core/models/common.models';
import { ModalService } from '../../../../shared/services/modal.service';
import { ConfirmModalComponent } from '../../../../shared/components/modals/confirm-modal/confirm-modal.component';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { GenericErrorModalComponent } from '../../../../shared/components/modals/generic-error-modal/generic-error-modal.component';

@Component({
  selector: 'app-tenant-list-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, ProTableComponent, LoadingComponent],
  templateUrl: './tenant-list-page.component.html',
  styleUrls: ['./tenant-list-page.component.css'],
})
export class TenantListPageComponent implements OnInit {
  private tenantService = inject(TenantService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  tenants = signal<Tenant[]>([]);
  loading = signal<boolean>(true);
  sort = signal<string>('id');
  order = signal<'asc' | 'desc'>('asc');
  pageNumber = signal<number>(0);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);

  columns = [
    { key: 'name', labelKey: 'tenants.list.columns.name' },
    { key: 'createdAt', labelKey: 'tenants.list.columns.createdAt', type: 'date' },
    { key: 'expiresAt', labelKey: 'tenants.list.columns.expiresAt', type: 'date' },
    { key: 'modules', labelKey: 'tenants.list.columns.modules', translation: 'tenants.form.modules' },
  ];

  sortOptions: IdName[] = [
    { id: 'name', name: 'tenants.list.sort.name' },
    { id: 'createdAt', name: 'tenants.list.sort.createdAt' },
  ];

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.loading.set(true);
    this.tenantService.getAll(this.pageNumber(), this.pageSize(), this.sort(), this.order()).subscribe({
      next: (data) => {
        this.tenants.set(data.content);
        this.totalItems.set(data.totalElements);
        this.pageNumber.set(data.number);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'tenants.error.title',
          message: 'tenants.error.loadFailed',
          type: 'error'
        });
        console.error('Error loading tenants:', error);
      }
    });
  }

  onSortChange(sortState: SortState) {
    this.sort.set(sortState.field);
    this.order.set(sortState.direction);
    this.loadTenants();
  }

  onPaginationChange(pagination: PaginationState) {
    this.pageNumber.set(pagination.pageNumber);
    this.pageSize.set(pagination.pageSize);
    this.loadTenants();
  }

  deleteTenant(id: string) {
    const modalRef = this.modalService.open(ConfirmModalComponent, {
      open: true,
      title: 'shared.delete',
      message: 'tenants.form.deleteConfirm'
    });
    
    modalRef.result.then((confirmed) => {
      if (confirmed) {
        this.tenantService.delete(id).subscribe({
          next: () => this.loadTenants(),
          error: (error) => {
            this.modalService.open(GenericErrorModalComponent, {
              title: 'tenants.error.title',
              message: 'tenants.error.deleteFailed',
              type: 'error'
            });
            console.error('Error deleting tenant:', error);
          }
        });
      }
    })
  }

  onRowClick(tenant: Tenant): void {
    this.router.navigate(['/tenants', tenant.id]);
  }

  onEditClick(tenant: Tenant): void {
    this.router.navigate(['/tenants', tenant.id], { queryParams: { edit: true } });
  }
}
