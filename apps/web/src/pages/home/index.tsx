import React, { useEffect } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService } from './home.service';
import { AuthService } from '../../services/auth.service';
import { SendToolbarService } from '../../components/send-toolbar/send-toolbar.service';
import { TransferListService } from '../../components/transfer-list/transfer-list.service';
import SendToolbar from '../../components/send-toolbar';
import TransferList from '../../components/transfer-list';
import Header from '../../components/header';
import Toast from '../../components/toast';

const HomeContent = observer(() => {
  const service = useService(HomeService);
  const authService = useService(AuthService);
  const navigate = useNavigate();

  if (!authService.isAuthenticated) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    service.loadTransfers();
  }, [service]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <SendToolbar />
        <TransferList />

        {/* Online devices */}
        <div className="mt-10 p-5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
          <h3 className="label mb-2">ONLINE_DEVICES</h3>
          <p className="text-sm text-[var(--text-muted)]">No devices online</p>
        </div>
      </main>

      <Toast />
    </div>
  );
});

export default bindServices(HomeContent, [HomeService, SendToolbarService, TransferListService]); 
