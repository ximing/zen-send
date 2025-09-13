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
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-center text-[var(--text-primary)] mb-2">
          Zen Send
        </h1>
        <p className="text-sm text-center text-[var(--text-secondary)] mb-8">Create an account</p>

        {service.error && (
          <div className="p-3 rounded-lg bg-[var(--accent-soft)] mb-4">
            <p className="text-xs text-center text-[var(--accent)]">{service.error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-1">
          <label className="block text-xs text-[var(--text-secondary)] mb-1 ml-1">Email</label>
          <input
            type="email"
            value={service.email}
            onChange={(e) => {
              service.email = e.target.value;
            }}
            placeholder="your@email.com"
            autoComplete="email"
            className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                       rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
                       focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[var(--border-focus)]"
            required
          />

          <label className="block text-xs text-[var(--text-secondary)] mb-1 ml-1 mt-3">
            Password
          </label>
          <input
            type="password"
            value={service.password}
            onChange={(e) => {
              service.password = e.target.value;
            }}
            placeholder="Enter password"
            autoComplete="new-password"
            className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                       rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
                       focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[var(--border-focus)]"
            required
          />

          <label className="block text-xs text-[var(--text-secondary)] mb-1 ml-1 mt-3">
            Confirm Password
          </label>
          <input
            type="password"
            value={service.confirmPassword}
            onChange={(e) => {
              service.confirmPassword = e.target.value;
            }}
            placeholder="Confirm password"
            autoComplete="new-password"
            className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                       rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
                       focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[var(--border-focus)]"
            required
          />

          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full h-12 bg-[var(--accent)] text-white
                       rounded-lg font-medium text-sm
                       hover:opacity-90 transition-opacity
                       disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {service.isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--text-primary)] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(RegisterContent, [RegisterService]);
