import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HeaderService } from './header.service';

const HeaderContent = observer(() => {
  const service = useService(HeaderService);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await service.logout();
    navigate('/login');
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
      {/* Logo */}
      <h1 className="text-base font-semibold tracking-wider text-[var(--text-primary)]">
        ZEN_SEND
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {/* Theme toggle */}
        <button
          onClick={() => service.toggleTheme()}
          className="w-10 h-10 flex items-center justify-center rounded-md
                     hover:bg-[var(--bg-elevated)] transition-colors"
          title="Toggle theme"
        >
          {service.themeIcon}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-secondary)]">
            {service.userEmail}
          </span>
          <div className="w-8 h-8 rounded-md bg-[var(--primary)] text-[var(--on-primary)]
                          flex items-center justify-center text-xs font-semibold">
            {service.userEmail.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-xs tracking-wider uppercase
                     bg-[var(--bg-elevated)] hover:bg-[var(--border-default)]
                     rounded-md transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
});

export default bindServices(HeaderContent, [HeaderService]);
