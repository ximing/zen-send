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
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Zen Send</h1>
          <p className="text-text-secondary">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={service.email}
              onChange={(e) => { service.email = e.target.value; }}
              placeholder="Email"
              autoComplete="email"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={service.password}
              onChange={(e) => { service.password = e.target.value; }}
              placeholder="Password"
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={service.confirmPassword}
              onChange={(e) => { service.confirmPassword = e.target.value; }}
              placeholder="Confirm password"
              autoComplete="new-password"
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
            {service.isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(RegisterContent, [RegisterService]);
