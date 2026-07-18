import { Component, EventEmitter, Input, OnInit, Output, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../services/modal.service'; // Ajusta tu ruta
import { ImageProcessorComponent } from '../image-processor/image-processor.component';
import { TranslatePipe } from '@ngx-translate/core';
import { GenericErrorModalComponent } from '../../modals/generic-error-modal/generic-error-modal.component';
import { FileInfoRequest } from '../../../../core/models/common.models';

@Component({
  selector: 'app-image-input',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './image-input.component.html',
  styleUrls: ['./image-input.component.css']
})
export class ImageInputComponent implements OnInit {
  private modalService = inject(ModalService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() existingImageUrl: string | null = null; 
  @Input() originalFileName: string = ''; 

  @Input() maxWidth?: number;
  @Input() maxHeight?: number;
  @Input() minAspectRatio?: number;
  @Input() maxAspectRatio?: number;
  @Input() fixedAspectRatio?: number;

  @Input() readonly: boolean = false;
  @Output() fileChanged = new EventEmitter<FileInfoRequest | null>(); 

  previewUrl = signal<string | null>(null);
  currentFileName = signal<string>('');
  rawImageSource = signal<string>('');

  ngOnInit() {
    this.currentFileName.set(this.originalFileName);
    if (this.existingImageUrl) {
      this.previewUrl.set(this.existingImageUrl);
      if (!this.originalFileName) {
        const name = this.existingImageUrl.substring(this.existingImageUrl.lastIndexOf('/') + 1);
        this.currentFileName.set(name.split('?')[0]); 
      }
    }
  }
  
  ngOnChanges() {
    this.currentFileName.set(this.originalFileName);
    this.previewUrl.set(this.existingImageUrl);
  }

  async triggerManager(event: Event) {
    event.stopPropagation();
    if (this.readonly) return;
    if (this.previewUrl()) {
      if (!this.rawImageSource() && this.existingImageUrl) {
        const downloaded = await this.downloadRemoteImage();
        if (!downloaded) return;
      }
      this.openProcessorModal();
    } 
    else {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.currentFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.rawImageSource.set(e.target.result);
        this.openProcessorModal();
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  }

  private async downloadRemoteImage(): Promise<boolean> {
    try {
      const response = await fetch(this.existingImageUrl!);
      const blob = await response.blob();
      return new Promise<boolean>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.rawImageSource.set(e.target.result);
          resolve(true);
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
      return false;
    }
  }
  
  private openProcessorModal() {
    const modalRef = this.modalService.open(ImageProcessorComponent, {
      imageBase64: this.rawImageSource(),
      maxWidth: this.maxWidth,
      maxHeight: this.maxHeight,
      minAspectRatio: this.minAspectRatio,
      maxAspectRatio: this.maxAspectRatio,
      fixedAspectRatio: this.fixedAspectRatio
    });

    modalRef.result.then((result: string | null | undefined) => {
      if (result === undefined) return;

      if (result === null) {
        // Eliminó la imagen
        this.previewUrl.set(null);
        this.rawImageSource.set('');
        this.currentFileName.set('');
        const emptyFile: FileInfoRequest = {
          base64: '',
          fileName: 'delete.txt',
          contentType: 'text/plain'
        };
        this.fileChanged.emit(emptyFile);
      } else {
        // Modificó/recortó la imagen
        this.previewUrl.set(result);
        const finalFile = this.base64ToFile(result);
        this.fileChanged.emit(finalFile);
      }
    });
  }
  private base64ToFile(base64Data: string): FileInfoRequest {
    const arr = base64Data.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    return {
      base64: base64Data,
      fileName: this.currentFileName(),
      contentType: contentType
    };
  }
}