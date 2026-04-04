import { Service } from '@rabjs/react';
import { HomeService } from '../../pages/home/home.service';
import type { ZenBridgeFile } from '../../lib/zen-bridge';

export type SendToolbarModalType = 'text' | null;

export class SendToolbarService extends Service {
  modalType: SendToolbarModalType = null;
  textInput = '';

  get homeService() {
    return this.resolve(HomeService);
  }

  openModal(type: SendToolbarModalType) {
    this.modalType = type;
  }

  closeModal() {
    this.modalType = null;
    this.textInput = '';
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
}
