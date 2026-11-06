import { Navigate, Route, Routes } from 'react-router-dom';
import { AssetsPage } from './features/assets/AssetsPage';
import { LayoutPage } from './features/layout/LayoutPage';
import { PreviewPage } from './features/preview/PreviewPage';
import { TemplatesPage } from './features/templates/TemplatesPage';
import { AppShell } from './features/shell/AppShell';
import { WritePage } from './features/write/WritePage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/write" replace />} />
        <Route path="write" element={<WritePage />} />
        <Route path="layout" element={<LayoutPage />} />
        <Route path="preview" element={<PreviewPage />} />
        <Route path="photos" element={<AssetsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="*" element={<Navigate to="/write" replace />} />
      </Route>
    </Routes>
  );
}
