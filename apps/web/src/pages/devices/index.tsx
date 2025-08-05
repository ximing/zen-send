import React from 'react';
import Sidebar from '../../components/sidebar';

const DevicesPage = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      <Sidebar />
      <main className="flex-1 ml-16 p-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Devices</h1>
        <p className="mt-4 text-[var(--text-secondary)]">Devices page coming soon.</p>
      </main>
    </div>
  );
};

export default DevicesPage;
