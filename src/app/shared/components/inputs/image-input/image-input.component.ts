import { Component, EventEmitter, Input, OnInit, Output, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../services/modal.service'; // Ajusta tu ruta
import { ImageProcessorComponent } from '../image-processor/image-processor.component';
import { TranslatePipe } from '@ngx-translate/core';
import { GenericErrorModalComponent } from '../../modals/generic-error-modal/generic-error-modal.component';

@Component({
  selector: 'app-image-input',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './image-input.component.html',
  styleUrls: ['./image-input.component.css']
})
export class ImageInputComponent implements OnInit {
  private modalService = inject(ModalService);

  // Referencia al input de archivos real pero oculto
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() existingImageUrl: string | null = null; 
  @Input() originalFileName: string = ''; 

  @Input() minWidth?: number;
  @Input() maxWidth?: number;
  @Input() minHeight?: number;
  @Input() maxHeight?: number;
  @Input() minAspectRatio?: number;
  @Input() maxAspectRatio?: number;
  @Input() fixedAspectRatio?: number;

  @Output() fileChanged = new EventEmitter<File | null>(); 

  previewUrl = signal<string | null>(null);
  currentFileName = signal<string>('');
  rawImageSource = signal<string>('');

  ngOnInit() {
    this.currentFileName.set(this.originalFileName);
    if (this.existingImageUrl) {
      this.previewUrl.set(this.existingImageUrl);
      // Extraemos el nombre de la URL si no nos pasan un originalFileName
      if (!this.originalFileName) {
        const name = this.existingImageUrl.substring(this.existingImageUrl.lastIndexOf('/') + 1);
        this.currentFileName.set(name.split('?')[0]); // Limpia parámetros de query de Firebase/S3 si existen
      }
    }
  }

  // Manejador del clic en el componente
  async triggerManager(event: Event) {
    event.stopPropagation();

    // CASO A: Si ya hay imagen, abrimos el editor directo
    if (this.previewUrl()) {
      if (!this.rawImageSource() && this.existingImageUrl) {
        // Descargamos la imagen remota a base64 antes de abrir para que el cropper la renderice
        await this.downloadRemoteImage();
      }
      this.openProcessorModal();
    } 
    // CASO B: Si está vacío, disparamos el selector de archivos del sistema
    else {
      this.fileInput.nativeElement.click();
    }
  }

  // Captura el archivo seleccionado del explorador nativo
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.currentFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.rawImageSource.set(e.target.result);
        // Abrimos el modal inmediatamente tras seleccionar la imagen
        this.openProcessorModal();
      };
      reader.readAsDataURL(file);
    }
    event.target.value = ''; // Reseteamos para poder volver a elegir el mismo si se borra
  }

  private async downloadRemoteImage() {
    try {
      const response = await fetch(this.existingImageUrl!);
      const blob = await response.blob();
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.rawImageSource.set(e.target.result);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      const modalRef = this.modalService.open(GenericErrorModalComponent, {
        title: 'shared.imageInput.downloadErrorTitle',
        message: 'shared.imageInput.downloadErrorMessage'
      });
      modalRef.result.then((result) => {
        if (result) {
          this.fileInput.nativeElement.click();
        }
      });
    }
  }

  private openProcessorModal() {
    const modalRef = this.modalService.open(ImageProcessorComponent, {
      imageBase64: this.rawImageSource(),
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      minAspectRatio: this.minAspectRatio,
      maxAspectRatio: this.maxAspectRatio,
      fixedAspectRatio: this.fixedAspectRatio
    });

    modalRef.result.then((result: string | null | undefined) => {
      if (result === undefined) return; // Canceló

      if (result === null) {
        // Eliminó la imagen
        this.previewUrl.set(null);
        this.rawImageSource.set('');
        this.currentFileName.set('');
        const emptyFile = new File([], 'delete.txt', { type: 'text/plain' });
        this.fileChanged.emit(emptyFile);
      } else {
        // Modificó/recortó la imagen
        this.previewUrl.set(result);
        const finalFile = this.base64ToFile(result, this.currentFileName());
        this.fileChanged.emit(finalFile);
      }
    });
  }
  private base64ToFile(base64Data: string, fileName: string): File {
    // 1. Separar la cabecera del contenido de datos
    const arr = base64Data.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    // 2. Decodificar la cadena base64 a binario string
    const bstr = atob(arr[1] || arr[0]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    // 3. Rellenar el array de bytes
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    // 4. Crear el File real con sus datos binarios y su tipo MIME
    return new File([u8arr], fileName, { type: mime });
  }
}