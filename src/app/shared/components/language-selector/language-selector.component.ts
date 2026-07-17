import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, SelectInputComponent],
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.css']
})
export class LanguageSelectorComponent {
  private translate = inject(TranslateService);

  languages = [
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'en', name: 'English', flag: '🇬🇧' },
    { id: 'it', name: 'Italiano', flag: '🇮🇹' },
    { id: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  currentLang = signal(this.translate.currentLang || 'es');
  ngOnInit() {
    const savedLang = localStorage.getItem('user_language') || this.translate.currentLang || 'es';
    this.translate.use(savedLang);
    this.currentLang.set(savedLang);
  }
  changeLanguage(langCode: string): void {
    this.translate.use(langCode);
    this.currentLang.set(langCode);
    localStorage.setItem('user_language', langCode);
  }
}
