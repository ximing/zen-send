import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import AppLayout from './components/app-layout';

import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';
import DevicesPage from './pages/devices';
import SettingsPage from './pages/settings';
import SearchPage from './pages/search';
import NotesPage from './pages/notes';
import SharedNotePage from './pages/shared-note';
import NoteEmbedPage from './pages/notes-embed';

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <Routes>
          {/* Auth routes - no AppLayout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/notes/shared/:token" element={<SharedNotePage />} />
          <Route path="/notes/embed/:id" element={<NoteEmbedPage />} />

          {/* Authenticated routes - wrapped by AppLayout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:id" element={<NotesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
