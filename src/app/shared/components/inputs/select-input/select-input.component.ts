import { Component, Input, Output, EventEmitter, signal, computed, HostListener, inject, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IdName } from '../../../../core/models/common.models';


@Component({
  selector: 'app-select-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './select-input.component.html',
  styleUrls: ['./select-input.component.css'],
})
export class SelectInputComponent implements OnInit {
  private translateService = inject(TranslateService);
  @Input() labelKey = '';
  @Input() placeholderKey = '';
  @Input() control: FormControl | null = null;
  @Input() value: any = null;
  @Input() options: IdName[] = [];
  @Input() required = false;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() errorKey = '';
  @Input() showSearch = true;
  @Input() showClearButton = true;

  @Output() valueChange = new EventEmitter<any>();

  elementRef = inject(ElementRef);

  isDropdownOpen = signal(false);
  searchTerm = signal('');
  translatedOptions = computed(() => {
    return this.options.map(opt => ({
      ...opt,
      name: this.translateService.instant(opt.name || '')
    }));
  });

  ngOnInit(): void {
    if (!this.control) {
      const validators = [];
      if (this.required) {
        validators.push(Validators.required);
      }
      
      this.control = new FormControl(this.value, validators);
    }
  }

  get isRequired(): boolean {
    return this.control?.hasValidator(Validators.required) ?? false;
  }

  get isDirty(): boolean {
    return this.control?.dirty ?? false;
  }

  get selectedOptionName(): string {
    const currentValue = this.control?.value;
    if (!currentValue) return '';
    const selectedOption = this.options.find(opt => opt.id == currentValue);
    return selectedOption ? selectedOption.name : '';
  }

  get shouldShowError(): boolean {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  }

  get errorMessage(): { key: string; params?: any } | null {
    if (!this.control || !this.shouldShowError) return null;

    if (this.control.hasError('required')) {
      return { key: this.errorKey || 'validation.required' };
    }

    return { key: this.errorKey || 'validation.invalid' };
  }

  filteredOptions = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const optionsList = this.translatedOptions();
    if (!search) return optionsList;

    // Auxiliary function to make the search ignore accents/tildes natively
    const normalizeText = (text: string) => 
      text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';

    const normalizedSearch = normalizeText(search);

    return optionsList.filter(opt => {
      if (!opt.name) return false;
      const normalizedOptionName = normalizeText(opt.name.toLowerCase());
      return normalizedOptionName.includes(normalizedSearch);
    });
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isDropdownOpen()) return;
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
    this.isDropdownOpen.set(false);
     this.searchTerm.set('');
    }
  }

  toggleDropdown(): void {
    if (!this.disabled && !this.readonly) {
      this.isDropdownOpen.update(open => !open);
      this.searchTerm.set('');
    }
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  selectOption(option: IdName): void {
    const newValue = option.id;
    this.control!.setValue(newValue);
    this.control!.markAsDirty();
    this.control!.markAsTouched();
    this.value = newValue;
    this.valueChange.emit(newValue);
    this.closeDropdown();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.control!.setValue(null);
    this.control!.markAsDirty();
    this.control!.markAsTouched();
    this.value = null;
    this.valueChange.emit(null);
  }

  get hasValue(): boolean {
    return !!this.control?.value;
  }
}
