import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutGrid, Plus, LogOut, User, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import {
  AmbientBackground,
  Avatar,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from '@nimiplatform/kit/ui';
import { useAppStore } from './app-store.js';
import { startStudioWindowDrag } from '../bridge/window-drag.js';
import { logoutStudioRuntimeAccount } from '../features/auth/studio-auth-adapter.js';
import { clearStudioNimiClient } from './studio-platform.js';
import { studioQueryClient } from '../infra/query-client.js';

const MACOS_TRAFFIC_LIGHT_SAFE_ZONE_PX = 84;
const TITLEBAR_INTERACTIVE_SELECTOR = [
  '[data-titlebar-interactive="true"]',
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[tabindex]',
].join(',');

const navItems = [
  { to: '/portfolio', label: 'Portfolio', Icon: LayoutGrid, end: true },
  { to: '/portfolio/create', label: 'Create', Icon: Plus, end: true },
  { to: '/curation/forge-imported-system', label: 'Curation', Icon: ShieldCheck, end: false },
  { to: '/ai-config', label: 'AI models', Icon: SlidersHorizontal, end: true },
] as const;

function SidebarItem({
  to,
  label,
  end,
  children,
}: {
  to: string;
  label: string;
  end: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <NavLink
        to={to}
        end={end}
        data-titlebar-interactive="true"
        aria-label={label}
        className={({ isActive }) =>
          isActive ? 'ras-sidebar__item ras-sidebar__item--active' : 'ras-sidebar__item'
        }
      >
        {children}
      </NavLink>
    </Tooltip>
  );
}

function AccountMenu() {
  const authUser = useAppStore((s) => s.auth.user);
  const clearAuth = useAppStore((s) => s.clearAuthSession);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    setLogoutPending(true);
    try {
      await logoutStudioRuntimeAccount();
      studioQueryClient.clear();
      clearStudioNimiClient();
      clearAuth();
      setOpen(false);
      navigate('/portfolio');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLogoutError(message || 'Runtime logout failed.');
    } finally {
      setLogoutPending(false);
    }
  };

  const displayName = authUser?.displayName || 'Owner';
  const avatarUrl = authUser?.avatarUrl ?? null;
  const initial = displayName.charAt(0).toUpperCase() || 'O';

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setLogoutError(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-titlebar-interactive="true"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Open account menu"
          className="ras-avatar-trigger"
        >
          <Avatar
            src={avatarUrl}
            alt={displayName}
            size="sm"
            shape="circle"
            fallback={<span style={{ fontSize: 14, fontWeight: 600 }}>{initial}</span>}
          />
          <ChevronDown
            className="ras-avatar-trigger__chevron"
            size={14}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="ras-avatar-popover">
        <div role="menu" aria-label="Account menu">
          <div className="ras-avatar-menu__header">
            <Avatar
              src={avatarUrl}
              alt={displayName}
              size="md"
              shape="circle"
              fallback={<span style={{ fontSize: 16, fontWeight: 600 }}>{initial}</span>}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="ras-avatar-menu__name">{displayName}</p>
              <p className="ras-avatar-menu__email">{authUser?.email || 'Runtime account'}</p>
            </div>
          </div>
          <div className="ras-avatar-menu__actions">
            <Button
              tone="ghost"
              size="sm"
              fullWidth
              role="menuitem"
              className="ras-avatar-menu__action"
              leadingIcon={<User size={16} strokeWidth={1.8} />}
              onClick={() => {
                setOpen(false);
                navigate('/portfolio');
              }}
            >
              Owner portfolio
            </Button>
            <Button
              tone="danger"
              size="sm"
              fullWidth
              role="menuitem"
              className="ras-avatar-menu__action"
              loading={logoutPending}
              leadingIcon={<LogOut size={16} strokeWidth={1.8} />}
              onClick={() => void handleLogout()}
            >
              Sign out
            </Button>
          </div>
          {logoutError ? (
            <p className="ras-avatar-menu__error" role="alert">
              {logoutError}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ShellLayout({ children }: { children: ReactNode }) {
  const isTitlebarInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element && target.closest(TITLEBAR_INTERACTIVE_SELECTOR) !== null;

  const handleTitlebarMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (event.detail > 1) return;
    if (event.clientX < MACOS_TRAFFIC_LIGHT_SAFE_ZONE_PX) return;
    if (isTitlebarInteractiveTarget(event.target)) return;
    void startStudioWindowDrag();
  };

  return (
    <AmbientBackground variant="mesh" className="ras-shell">
      <div className="ras-topbar" onMouseDown={handleTitlebarMouseDown}>
        <div className="ras-topbar__inner">
          <h1 className="ras-topbar__title">Realm Agent Studio</h1>
          <span className="ras-topbar__chip">Owner</span>
          <div className="ras-topbar__right">
            <AccountMenu />
          </div>
        </div>
      </div>

      <div className="ras-shell__body">
        <aside className="ras-sidebar">
          <div className="ras-sidebar__logo">
            <div className="ras-sidebar__logo-mark" aria-label="Realm Agent Studio">
              RAS
            </div>
          </div>
          <nav className="ras-sidebar__nav" aria-label="App navigation">
            {navItems.map((item) => (
              <SidebarItem key={item.to} to={item.to} label={item.label} end={item.end}>
                <item.Icon size={19} strokeWidth={1.8} />
              </SidebarItem>
            ))}
          </nav>
        </aside>

        <main
          className="ras-main"
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            if (event.detail > 1) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientY - rect.top > 40) return;
            if (event.clientX < MACOS_TRAFFIC_LIGHT_SAFE_ZONE_PX) return;
            if (isTitlebarInteractiveTarget(event.target)) return;
            void startStudioWindowDrag();
          }}
          data-testid="shell-main-drag-region"
        >
          {children}
        </main>
      </div>
    </AmbientBackground>
  );
}
