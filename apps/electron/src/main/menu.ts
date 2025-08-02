import { app, Menu, shell, dialog, type MenuItemConstructorOptions } from 'electron';
import { WindowManager } from './window';

export class MenuManager {
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  private createEditMenu(): MenuItemConstructorOptions[] {
    return [
      { label: 'Undo', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
      { label: 'Redo', role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
      { type: 'separator' },
      { label: 'Cut', role: 'cut', accelerator: 'CmdOrCtrl+X' },
      { label: 'Copy', role: 'copy', accelerator: 'CmdOrCtrl+C' },
      { label: 'Paste', role: 'paste', accelerator: 'CmdOrCtrl+V' },
      { label: 'Select All', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
    ];
  }

  private createViewMenu(): MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';
    return [
      {
        label: 'Reload',
        role: 'reload',
        accelerator: 'CmdOrCtrl+R',
      },
      {
        label: 'Toggle Developer Tools',
        role: 'toggleDevTools',
        accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
      },
      { type: 'separator' },
      { label: 'Reset Zoom', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
      { label: 'Zoom In', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
      { label: 'Zoom Out', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
      { type: 'separator' },
      { label: 'Toggle Full Screen', role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11' },
    ];
  }

  private createWindowMenu(): MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';
    const items: MenuItemConstructorOptions[] = [
      { label: 'Minimize', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
      { label: 'Close', role: 'close', accelerator: 'CmdOrCtrl+W' },
      { type: 'separator' },
      {
        label: 'Show Main Window',
        click: () => this.windowManager.show(),
      },
    ];

    if (isMac) {
      items.push(
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' },
        { label: 'Enter Full Screen', role: 'togglefullscreen' }
      );
    }

    return items;
  }

  private createHelpMenu(): MenuItemConstructorOptions[] {
    return [
      {
        label: 'Visit GitHub',
        click: () => {
          shell.openExternal('https://github.com/ximing/zen-send');
        },
      },
      {
        label: 'About Zen Send',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: 'About Zen Send',
            message: 'Zen Send',
            detail: `Version: ${app.getVersion()}\nCross-platform clipboard, text, and file transfer tool`,
          });
        },
      },
    ];
  }

  create(): void {
    const isMac = process.platform === 'darwin';
    const template: MenuItemConstructorOptions[] = [];

    if (isMac) {
      template.push({
        label: app.getName(),
        submenu: [
          { label: `About ${app.getName()}`, role: 'about' },
          { type: 'separator' },
          { label: 'Hide', role: 'hide', accelerator: 'Command+H' },
          { label: 'Hide Others', role: 'hideOthers', accelerator: 'Command+Alt+H' },
          { label: 'Show All', role: 'unhide' },
          { type: 'separator' },
          {
            label: `Quit ${app.getName()}`,
            accelerator: 'Command+Q',
            click: () => app.quit(),
          },
        ],
      });
    }

    template.push(
      {
        label: 'Edit',
        submenu: this.createEditMenu(),
      },
      {
        label: 'View',
        submenu: this.createViewMenu(),
      },
      {
        label: 'Window',
        role: 'window',
        submenu: this.createWindowMenu(),
      },
      {
        label: 'Help',
        role: 'help',
        submenu: this.createHelpMenu(),
      }
    );

    // Windows/Linux: Add File menu
    if (!isMac) {
      template.unshift({
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            accelerator: 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}
