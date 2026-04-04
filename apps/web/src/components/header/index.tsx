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
    <header className="flex items-center justify-between px-5 py-4 bg-surface border-b border-border-default">
      <h1 className="text-xl font-semibold text-text-primary">Zen Send</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={() => service.toggleTheme()}
          className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
          title="Toggle theme"
        >
          {service.themeIcon}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">{service.userEmail}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-bg-elevated hover:bg-border-default
                       rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
});

export default bindServices(HeaderContent, [HeaderService]);
