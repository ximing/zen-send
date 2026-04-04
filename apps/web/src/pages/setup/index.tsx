import React, { useEffect } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { SetupService } from './setup.service';
import { isElectron } from '../../lib/env';

const SetupContent = observer(() => {
  const service = useService(SetupService);
  const navigate = useNavigate();

  // 浏览器模式下重定向到主页
  if (!isElectron) {
    navigate('/');
    return null;
  }

  useEffect(() => {
    service.init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await service.saveAndConnect();
    if (success) {
      navigate('/');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Zen Send</h1>
          <p className="text-text-secondary">Welcome! Please enter your server address</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              value={service.serverUrl}
              onChange={(e) => { service.serverUrl = e.target.value; }}
              placeholder="https://zensend.aimo.plus"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {service.error && (
            <p className="text-error text-sm">{service.error}</p>
          )}

          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full py-3 bg-primary text-on-primary rounded-lg font-medium
                       hover:bg-primary-hover transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        <p className="text-center text-text-muted text-sm mt-6">
          Contact your administrator for the server address
        </p>
      </div>
    </div>
  );
});

export default bindServices(SetupContent, [SetupService]); 
