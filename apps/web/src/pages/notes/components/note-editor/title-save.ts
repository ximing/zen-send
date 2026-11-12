import type { Transaction } from '@codemirror/state';

const LOCAL_CONTENT_EVENTS = ['input', 'delete', 'undo', 'redo'];

/**
 * Yjs initialization and remote updates also change the CodeMirror document,
 * but they must not trigger automatic title persistence.
 */
export function hasLocalContentEdit(transactions: readonly Transaction[]): boolean {
  return transactions.some((transaction) =>
    LOCAL_CONTENT_EVENTS.some((event) => transaction.isUserEvent(event))
  );
}
