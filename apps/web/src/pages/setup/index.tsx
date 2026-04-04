import React, { useEffect } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { SetupService } from './setup.service';
import { isElectron } from '../../lib/env';

const SetupContent = observer(() => {
  const service = useService(SetupService);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-base font-semibold tracking-widest text-[var(--text-primary)] mb-2">
            ZEN_SEND
          </h1>
          <p className="label">SERVER_CONNECTION</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Server URL */}
          <div className="space-y-2">
            <label className="label block">SERVER_URL</label>
            <input
              type="url"
              value={service.serverUrl}
              onChange={(e) => { service.serverUrl = e.target.value; }}
              placeholder="https://zensend.example.com"
              className="w-full h-12 px-4 bg-[var(--bg-surface)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[var(--border-focus)]"
              required
            />
          </div>

          {/* Error */}
          {service.error && (
            <p className="text-xs text-[var(--color-error)]">{service.error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full h-12 bg-[var(--primary)] text-[var(--on-primary)]
                       rounded-xl font-medium tracking-wider uppercase text-sm
                       hover:bg-[var(--primary-hover)] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'CONNECTING...' : 'CONNECT'}
          </button>
        </form>

        {/* Help text */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          Contact your administrator for the server address
        </p>
      </div>
    </div>
  );
});

export default bindServices(SetupContent, [SetupService]);
