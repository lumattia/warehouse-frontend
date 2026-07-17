import { Injectable, ComponentRef, ApplicationRef, EnvironmentInjector, createComponent, Type } from '@angular/core';

export interface ModalConfig {
  [key: string]: any;
}

export interface ModalRef<T> {
  componentInstance: T;
  result: Promise<any>;
  close: (result?: any) => void;
  dismiss: (reason?: any) => void;
}

interface InternalModalRef<T> extends ModalRef<T> {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalContainer: HTMLElement | null = null;
  private activeModals: Map<ComponentRef<any>, ModalRef<any>> = new Map();

  constructor(private appRef: ApplicationRef, private injector: EnvironmentInjector) {
    this.createModalContainer();
  }

  private createModalContainer(): void {
    if (!this.modalContainer) {
      this.modalContainer = document.createElement('div');
      this.modalContainer.id = 'modal-container';
      this.modalContainer.style.position = 'fixed';
      this.modalContainer.style.top = '0';
      this.modalContainer.style.left = '0';
      this.modalContainer.style.right = '0';
      this.modalContainer.style.bottom = '0';
      this.modalContainer.style.zIndex = '9999';
      this.modalContainer.style.pointerEvents = 'none';
      document.body.appendChild(this.modalContainer);
    }
  }

  open<T>(componentType: Type<T>, config: ModalConfig = {}): ModalRef<T> {
    const componentRef = createComponent(componentType, {
      environmentInjector: this.injector
    });
    
    // Añadimos el elemento HTML del componente de forma limpia dentro de nuestro contenedor global
    const modalElement = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
    this.modalContainer!.appendChild(modalElement);
    
    this.appRef.attachView(componentRef.hostView);
    
    const instance = componentRef.instance as any;
  
    // Apply config to component instance using setInput to trigger change detection
    for (const key in config) {
      componentRef.setInput(key, config[key]);
    }
    
    // Enable pointer events on container when modal is open
    if (this.modalContainer) {
      this.modalContainer.style.pointerEvents = 'auto';
    }
    
    // Create ModalRef with Promise
    let resolveFn: (value: any) => void;
    let rejectFn: (reason: any) => void;
    
    const resultPromise = new Promise<any>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
    
    // Create close and dismiss methods on the component instance
    instance.close = (result?: any) => {
      const modalRef = this.activeModals.get(componentRef) as InternalModalRef<T>;
      if (modalRef) {
        modalRef.close(result);
      }
    };
    
    instance.dismiss = (reason?: any) => {
      const modalRef = this.activeModals.get(componentRef) as InternalModalRef<T>;
      if (modalRef) {
        modalRef.dismiss(reason);
      }
    };
    
    // Create ModalRef
    const modalRef: InternalModalRef<T> = {
      componentInstance: instance,
      result: resultPromise,
      resolve: resolveFn!,
      reject: rejectFn!,
      close: (result?: any) => {
        this.closeModal(componentRef, result);
      },
      dismiss: (reason?: any) => {
        this.dismissModal(componentRef, reason);
      }
    };
    
    // Store the modal ref with its resolve/reject functions
    this.activeModals.set(componentRef, modalRef);
    
    return modalRef;
  }

  private closeModal<T>(componentRef: ComponentRef<T>, result?: any): void {
    const modalRef = this.activeModals.get(componentRef) as InternalModalRef<T>;
    if (modalRef) {
      modalRef.resolve(result);
      this.destroyModal(componentRef);
    }
    
    // Disable pointer events if no more modals are open
    if (this.activeModals.size === 0 && this.modalContainer) {
      this.modalContainer.style.pointerEvents = 'none';
    }
  }

  private dismissModal<T>(componentRef: ComponentRef<T>, reason?: any): void {
    const modalRef = this.activeModals.get(componentRef) as InternalModalRef<T>;
    if (modalRef) {
      modalRef.reject(reason);
      this.destroyModal(componentRef);
    }
    
    // Disable pointer events if no more modals are open
    if (this.activeModals.size === 0 && this.modalContainer) {
      this.modalContainer.style.pointerEvents = 'none';
    }
  }

  private destroyModal<T>(componentRef: ComponentRef<T>): void {
    this.appRef.detachView(componentRef.hostView);
    componentRef.destroy();
    this.activeModals.delete(componentRef);
    
    // Clear the modal container ONLY if there are absolutely no modals left
    if (this.modalContainer && this.activeModals.size === 0) {
      this.modalContainer.innerHTML = '';
    }
  }

  closeAll(): void {
    this.activeModals.forEach((modalRef) => {
      modalRef.dismiss('close all');
    });
  }
}