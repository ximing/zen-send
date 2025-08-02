import { Service } from '@rabjs/react';
import { HomeService } from '../../pages/home/home.service';
import type { ZenBridgeFile } from '../../lib/zen-bridge';

export type SendToolbarModalType = 'text' | 'clipboard' | null;

export class SendToolbarService extends Service {
  modalType: SendToolbarModalType = null;
  textInput = '';
  clipboardContent = '';

  get homeService() {
    return this.resolve(HomeService);
  }

  openModal(type: SendToolbarModalType) {
    this.modalType = type;
    if (type === 'clipboard') {
      this.loadClipboard();
    }
  }

  closeModal() {
    this.modalType = null;
    this.textInput = '';
    this.clipboardContent = '';
  }

  async loadClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      this.clipboardContent = text;
    } catch {
      this.clipboardContent = '';
    }
  }

  setTextInput(text: string) {
    this.textInput = text;
  }

  addFiles(files: ZenBridgeFile[]) {
    const formattedFiles = files.map((f) => ({
      name: f.name,
      size: f.size,
    }));
    this.homeService.addFiles(formattedFiles);
  }

  submitText() {
    if (!this.textInput.trim()) return;

    this.homeService.addFiles([
      {
        name: 'text.txt',
        size: new Blob([this.textInput]).size,
        data: new TextEncoder().encode(this.textInput).buffer as ArrayBuffer,
      },
    ]);
    this.closeModal();
  }

  submitClipboard() {
    if (!this.clipboardContent.trim()) return;

    this.homeService.addFiles([
      {
        name: 'clipboard.txt',
        size: new Blob([this.clipboardContent]).size,
        data: new TextEncoder().encode(this.clipboardContent).buffer as ArrayBuffer,
      },
    ]);
    this.closeModal();
  }
}
