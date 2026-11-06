import { Navigate, Route, Routes } from 'react-router-dom';
import { LayoutPage } from './features/layout/LayoutPage';
import { PreviewPage } from './features/preview/PreviewPage';
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
        <Route path="*" element={<Navigate to="/write" replace />} />
      </Route>
    </Routes>
  );
}
