import React from 'react';
import { observer } from '@rabjs/react';
import NavContent from '../nav-content';

function SidebarInner() {
  return (
    <aside className="w-[240px] shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <NavContent />
      </div>
    </aside>
  );
}

export default observer(SidebarInner);
