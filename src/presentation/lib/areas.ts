import { BookOpenText, Eye, Image, LayoutDashboard, PenLine, Printer, type LucideIcon } from 'lucide-react';
import type { Area } from '@domain/entities/Workflow';

/** Where each area lives, what it is called in the nav (a locale key) and its icon. */
export const AREA_INFO: Readonly<Record<Area, { path: string; key: string; icon: LucideIcon }>> = {
  write: { path: '/write', key: 'write', icon: PenLine },
  newsroom: { path: '/newsroom', key: 'newsroom', icon: LayoutDashboard },
  studio: { path: '/layout', key: 'studio', icon: BookOpenText },
  publish: { path: '/preview', key: 'publish', icon: Printer },
  photos: { path: '/photos', key: 'photos', icon: Image },
  templates: { path: '/templates', key: 'templates', icon: Eye },
};

export const pathOf = (area: Area): string => AREA_INFO[area].path;
