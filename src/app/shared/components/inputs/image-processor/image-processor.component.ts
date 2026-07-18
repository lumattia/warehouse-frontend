import { Component, Input, OnChanges, ChangeDetectorRef, inject, signal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, CropperPosition, ImageCroppedEvent, ImageTransform } from 'ngx-image-cropper';
import { ButtonComponent } from '../../button/button.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-image-processor',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent, ButtonComponent, TranslatePipe],
  templateUrl: './image-processor.component.html',
  styleUrls: ['./image-processor.component.css']
})
export class ImageProcessorComponent implements OnChanges {
  // Inyectados automáticamente por tu ModalService al abrir el modal
  close?: (result?: any) => void;
  dismiss?: (reason?: any) => void;

  // Inputs asignados dinámicamente por tu ModalService
  @Input() imageBase64: string = '';
  @Input({ transform: (v: number | null | undefined) => v ?? 1920 }) maxWidth = 1920; 
  @Input({ transform: (v: number | null | undefined) => v ?? 1080 }) maxHeight = 1080; 
  @Input({ transform: (v: number | null | undefined) => v ?? 0.25 }) minAspectRatio = 0.25; // Alto 4, Ancho 1
  @Input({ transform: (v: number | null | undefined) => v ?? 4.0 }) maxAspectRatio = 4.0; // Alto 1, Ancho 4
  @Input() fixedAspectRatio?: number;

  private cdr = inject(ChangeDetectorRef);
  // Estado reactivo basado en Signals
  imageBase64Signal = signal<string>('');
  resultBase64 = signal<string>('');
  quality = signal<number>(0.8);
  cropCoords = signal<CropperPosition | null>(null);

  // Signals computados para validar en tiempo real
  currentCropRatio: Signal<number> = computed(() => {
    const coords = this.cropCoords();
    if (!coords) return 1;
    const w = coords.x2 - coords.x1;
    const h = coords.y2 - coords.y1;
    return h > 0 ? w / h : 1;
  });

  isRatioValid = computed(() => {
    if (this.fixedAspectRatio) return true; // Si es fixed, se asume blindado y válido
    const ratio = this.currentCropRatio();
    return ratio >= this.minAspectRatio && ratio <= this.maxAspectRatio;
  });


  isFormValid = computed(() => {
    // Si la imagen se eliminó, el form es válido (representa una confirmación de borrado)
    if (!this.imageBase64Signal()) return true;
    return this.isRatioValid() && this.cropCoords() !== null;
  });
  ratioInstructionMessage = computed(() => {
    const current = this.currentCropRatio();
    
    if (current > this.maxAspectRatio) {
      return 'shared.imageInput.tooWide';
    }
    if (current < this.minAspectRatio) {
      return 'shared.imageInput.tooHigh';
    }
    return '';
  });
  ngOnChanges() {
    // Sincronizamos las propiedades dinámicas inyectadas con nuestros signals de control
    this.imageBase64Signal.set(this.imageBase64 || '')
    // El truco de magia de tu ModalService para asegurar que la UI se entere de los cambios de inputs
    this.cdr.detectChanges();
  }

  removeImage() {
    this.imageBase64Signal.set('');
    this.cropCoords.set(null);
    this.close?.('')
  }

  onCropChange(event: CropperPosition) {
    if (event) {
      const newCoords = {
        x1: Math.round(event.x1),
        y1: Math.round(event.y1),
        x2: Math.round(event.x2),
        y2: Math.round(event.y2)
      };

      this.cropCoords.set(newCoords);
    }
  }
  onCrop(event:ImageCroppedEvent){
    this.resultBase64.set(event.base64!)
  }

  saveImage() {
    if (!this.isFormValid()) return;

    if (!this.imageBase64Signal()) {
      this.close?.(null); // Retorna null indicando al input que borre el archivo
      return;
    }
    this.close?.(this.resultBase64())
  }
  onCancelClick(): void {
    this.close?.(undefined); // Retorna undefined para ignorar cualquier cambio
  }
}