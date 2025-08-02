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

  // Redirect to login if not authenticated
  if (!authService.isAuthenticated) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    service.loadTransfers();
  }, [service]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="max-w-4xl mx-auto p-5">
        <SendToolbar />
        <TransferList />

        {/* Online devices */}
        <div className="mt-8 p-4 bg-surface border border-border-default rounded-lg">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            📱 Online Devices
          </h3>
          <p className="text-text-muted text-sm">No devices online</p>
        </div>
      </main>

      <Toast />
    </div>
  );
});

export default bindServices(HomeContent, [HomeService, SendToolbarService, TransferListService]); 
