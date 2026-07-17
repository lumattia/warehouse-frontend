import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../../../../core/services/user.service';
import { User, UserFilter } from '../../../../core/models/user.model';
import { ProTableComponent } from '../../../../shared/components/table/pro-table/pro-table.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { IdName, PaginationState, SortState } from '../../../../core/models/common.models';
import { ModalService } from '../../../../shared/services/modal.service';
import { ConfirmModalComponent } from '../../../../shared/components/modals/confirm-modal/confirm-modal.component';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { GenericErrorModalComponent } from '../../../../shared/components/modals/generic-error-modal/generic-error-modal.component';

@Component({
  selector: 'app-user-list-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, ReactiveFormsModule, ProTableComponent, TextInputComponent, LoadingComponent],
  templateUrl: './user-list-page.component.html',
  styleUrls: ['./user-list-page.component.css'],
})
export class UserListPageComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  users = signal<User[]>([]);
  loading = signal<boolean>(true);
  filter: UserFilter = { username: '', role: undefined };
  filterForm = new FormGroup({
    username: new FormControl('')
  });
  sort = signal<string>('id');

  get usernameControl(): FormControl {
    return this.filterForm.controls['username'] as FormControl;
  }
  order = signal<'asc' | 'desc'>('asc');
  pageNumber = signal<number>(0);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);

  columns = [
    { key: 'username', labelKey: 'users.list.columns.username' },
    { key: 'role', labelKey: 'users.list.columns.role', translation: 'users.form.roleOptions' },
  ];

  sortOptions: IdName[] = [
    { id: 'username', name: 'users.list.sort.username' },
    { id: 'role', name: 'users.list.sort.role' },
  ];

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.filter.username = this.filterForm.value.username || '';
    this.userService.getAll(this.filter, this.pageNumber(), this.pageSize(), this.sort(), this.order()).subscribe({
      next: (data) => {
        this.users.set(data.content);
        this.totalItems.set(data.totalElements);
        this.pageNumber.set(data.number);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.modalService.open(GenericErrorModalComponent, {
          title: 'users.error.title',
          message: 'users.error.loadFailed',
          type: 'error'
        });
        console.error('Error loading users:', error);
      }
    });
  }

  onSortChange(sortState: SortState) {
    this.sort.set(sortState.field);
    this.order.set(sortState.direction);
    this.loadUsers();
  }

  onPaginationChange(pagination: PaginationState) {
    this.pageNumber.set(pagination.pageNumber);
    this.pageSize.set(pagination.pageSize);
    this.loadUsers();
  }

  onFilterChange() {
    this.pageNumber.set(0);
    this.loadUsers();
  }

  deleteUser(id: number) {
    const modalRef = this.modalService.open(ConfirmModalComponent, {
      open: true,
      title: 'shared.delete',
      message: 'users.form.deleteConfirm'
    });
    
    modalRef.result.then((confirmed) => {
      if (confirmed) {
        this.userService.delete(id).subscribe({
          next: () => this.loadUsers(),
          error: (error) => {
            this.modalService.open(GenericErrorModalComponent, {
              title: 'users.error.title',
              message: 'users.error.deleteFailed',
              type: 'error'
            });
            console.error('Error deleting user:', error);
          }
        });
      }
    })
  }

  onRowClick(user: User): void {
    this.router.navigate(['/users', user.id]);
  }

  onEditClick(user: User): void {
    this.router.navigate(['/users', user.id], { queryParams: { edit: true } });
  }
}
