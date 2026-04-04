import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginService } from './login.service';

const LoginContent = observer(() => {
  const service = useService(LoginService);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await service.login();
    if (success) {
      navigate('/', { replace: true });
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
          <p className="label">SIGN_IN</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label className="label block">EMAIL</label>
            <input
              type="email"
              value={service.email}
              onChange={(e) => { service.email = e.target.value; }}
              placeholder="email@example.com"
              autoComplete="email"
              className="w-full h-12 px-4 bg-[var(--bg-surface)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[var(--border-focus)]"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="label block">PASSWORD</label>
            <input
              type="password"
              value={service.password}
              onChange={(e) => { service.password = e.target.value; }}
              placeholder="••••••••"
              autoComplete="current-password"
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
            {service.isLoading ? 'SIGNING_IN...' : 'SIGN_IN'}
          </button>
        </form>

        {/* Link */}
        <p className="text-center text-sm text-[var(--text-secondary)] mt-8">
          No account?{' '}
          <Link to="/register" className="text-[var(--text-primary)] hover:underline">
            SIGN_UP
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(LoginContent, [LoginService]);
