import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from './useAuth';
import { AppShell } from './components/AppShell';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { Library } from './components/Library';
import { Updates } from './components/Updates';
import { MangaDetail } from './components/MangaDetail';
import { Reader } from './components/Reader';
import { SourcesList } from './components/SourcesList';
import { BrowseSource } from './components/BrowseSource';
import { GenreView } from './components/GenreView';
import { ReaderSettings, ServerSettings, Settings } from './components/Settings';
import { ThemeSettings } from './components/ThemeSettings';
import { Categories } from './components/Categories';
import { Extensions } from './components/Extensions';
import { SourceSettings } from './components/SourceSettings';

export default function App() {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) return <Login />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/library" element={<Library />} />
          <Route path="/sources" element={<SourcesList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/server" element={<ServerSettings />} />
          <Route path="/settings/reader" element={<ReaderSettings />} />
          <Route path="/settings/appearance" element={<ThemeSettings />} />
          <Route path="/settings/categories" element={<Categories />} />
          <Route path="/settings/extensions" element={<Extensions />} />
        </Route>
        <Route path="/sources/:sourceId" element={<BrowseSource />} />
        <Route path="/sources/:sourceId/settings" element={<SourceSettings />} />
        <Route path="/genre/:name" element={<GenreView />} />
        <Route path="/manga/:id" element={<MangaDetail />} />
        <Route path="/manga/:mangaId/chapter/:chapterId" element={<Reader />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
