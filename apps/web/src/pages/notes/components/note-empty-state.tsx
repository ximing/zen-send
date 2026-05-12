import { observer } from '@rabjs/react';

function NoteEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      <p className="text-sm">选择或创建一个笔记开始编辑</p>
    </div>
  );
}

export default observer(NoteEmptyState);
