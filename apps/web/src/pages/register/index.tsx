import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterService } from './register.service';

const RegisterContent = observer(() => {
  const service = useService(RegisterService);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await service.register();
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
          <p className="label">CREATE_ACCOUNT</p>
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
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
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
              autoComplete="new-password"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="label block">CONFIRM_PASSWORD</label>
            <input
              type="password"
              value={service.confirmPassword}
              onChange={(e) => { service.confirmPassword = e.target.value; }}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
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
                       rounded-md font-medium tracking-wider uppercase text-sm
                       hover:bg-[var(--primary-hover)] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'CREATING...' : 'CREATE_ACCOUNT'}
          </button>
        </form>

        {/* Link */}
        <p className="text-center text-sm text-[var(--text-secondary)] mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--text-primary)] hover:underline">
            SIGN_IN
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(RegisterContent, [RegisterService]);
