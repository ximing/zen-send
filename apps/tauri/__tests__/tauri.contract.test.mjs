import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

describe('Tauri desktop contract', () => {
  const conf = JSON.parse(read('src-tauri/tauri.conf.json'));
  const lib = read('src-tauri/src/lib.rs');
  const windowRs = read('src-tauri/src/window.rs');
  const tray = read('src-tauri/src/tray.rs');
  const bridge = read('src-tauri/scripts/zen-bridge.js');
  const caps = JSON.parse(read('src-tauri/capabilities/default.json'));

  it('loads the hosted site in production and vite on 5274 in dev', () => {
    assert.equal(conf.identifier, 'com.zensend.app');
    assert.equal(conf.productName, 'Zen Send');
    assert.equal(conf.build.devUrl, 'http://localhost:5274');
    assert.equal(conf.build.frontendDist, 'https://zs.aimo.plus');
    assert.equal(conf.build.beforeDevCommand, 'node scripts/before-dev.mjs');
    assert.equal(conf.app.withGlobalTauri, false);
    assert.equal(conf.app.windows[0].label, 'main');
    assert.equal(conf.app.windows[0].create, false);
    assert.match(windowRs, /WebviewWindowBuilder::from_config/);
    assert.match(windowRs, /FrontendDist::Url/);
    assert.match(lib, /#\[cfg\(target_os = "macos"\)\]\n\s+if let RunEvent::Reopen/);
  });

  it('keeps the desktop bridge on the remote page without the global Tauri object', () => {
    assert.match(bridge, /window\.zenBridge/);
    assert.match(bridge, /isElectron: true/);
    assert.match(bridge, /__TAURI_INTERNALS__/);
    assert.doesNotMatch(bridge, /window\.__TAURI__/);
    assert.match(windowRs, /initialization_script/);
    assert.match(lib, /create_main_window/);
  });

  it('puts text, not an icon, on the macOS status item', () => {
    assert.match(tray, /target_os = "macos"/);
    assert.match(tray, /\.title\("Zen Send"\)/);
    assert.match(tray, /not\(target_os = "macos"\)/);
    const macos = tray.slice(tray.indexOf('target_os = "macos"'), tray.indexOf('not(target_os'));
    assert.doesNotMatch(macos, /\.icon\(/);
  });

  it('limits the webview to shell commands', () => {
    assert.equal(caps.local, true);
    assert.deepEqual(caps.windows, ['main']);
    assert.equal(caps.permissions.includes('core:default'), false);
    for (const command of [
      'allow-set-server-url',
      'allow-get-global-shortcut',
      'allow-set-global-shortcut',
      'allow-clear-global-shortcut',
      'allow-open-file-dialog',
      'allow-save-file-dialog',
      'allow-read-file',
      'allow-write-file',
    ]) {
      assert.equal(caps.permissions.includes(command), true, command);
    }
  });

  it('ad-hoc signs macOS bundles', () => {
    assert.equal(conf.bundle.macOS.signingIdentity, '-');
  });
});
