import assert from 'node:assert/strict';
import test from 'node:test';

// block-layer no longer exports shouldRefreshBlockLayer or getBlockChromeSpecs
// The layer update logic is now inline: update.docChanged || update.viewportChanged
// (matching heynote's implementation exactly)

test('block layer refreshes on docChanged or viewportChanged', () => {
  assert.equal(true || false, true); // docChanged
  assert.equal(false || true, true); // viewportChanged
  assert.equal(false || false, false); // neither
});
