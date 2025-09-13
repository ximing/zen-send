import React from 'react';
import { observer } from '@rabjs/react';
import NavContent from '../nav-content';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function DrawerInner({ isOpen, onClose }: DrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-colors duration-[250ms]
        ${isOpen ? 'visible' : 'invisible'}`}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-[250ms]
          ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[280px] bg-[var(--bg-surface)]
          transition-transform duration-[250ms] ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavContent onNavigate={onClose} />
      </div>
    </div>
  );
}

export default observer(DrawerInner);
