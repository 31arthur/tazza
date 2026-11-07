import { Navigate, Route, Routes } from 'react-router-dom';
import { AssetsPage } from './features/assets/AssetsPage';
import { HomePage } from './features/home/HomePage';
import { LayoutPage } from './features/layout/LayoutPage';
import { NewsroomPage } from './features/newsroom/NewsroomPage';
import { PreviewPage } from './features/preview/PreviewPage';
import { RenderPage } from './features/preview/RenderPage';
import { AppShell } from './features/shell/AppShell';
import { TemplatesPage } from './features/templates/TemplatesPage';
import { WritePage } from './features/write/WritePage';

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="render" element={<RenderPage />} />
      <Route element={<AppShell />}>
        <Route path="write" element={<WritePage />} />
        <Route path="newsroom" element={<NewsroomPage />} />
        <Route path="layout" element={<LayoutPage />} />
        <Route path="preview" element={<PreviewPage />} />
        <Route path="photos" element={<AssetsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
