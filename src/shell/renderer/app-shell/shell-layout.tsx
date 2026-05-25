import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, LogOut, User } from 'lucide-react';
import { Avatar, Tooltip } from '@nimiplatform/kit/ui';
import { useAppStore } from './app-store.js';
import { startStudioWindowDrag } from '../bridge/window-drag.js';
import { logoutStudioRuntimeAccount } from '../features/auth/studio-auth-adapter.js';

const navItems = [
  { to: '/portfolio', label: 'Portfolio', Icon: LayoutGrid, end: true },
  { to: '/portfolio/create', label: 'Create', Icon: Plus, end: true },
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
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
  };
  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    closeMenu();
    try {
      await logoutStudioRuntimeAccount();
    } catch {
      // best-effort
    }
    clearAuth();
    navigate('/portfolio');
  };

  const displayName = authUser?.displayName || 'Owner';
  const avatarUrl = authUser?.avatarUrl ?? null;
  const initial = displayName.charAt(0).toUpperCase() || 'O';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        aria-expanded={open}
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
      </button>
      {mounted ? (
        <div
          className={open ? 'ras-avatar-menu' : 'ras-avatar-menu ras-avatar-menu--closed'}
          onTransitionEnd={() => {
            if (!open) setMounted(false);
          }}
        >
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
          <hr className="ras-avatar-menu__divider" />
          <button
            type="button"
            className="ras-avatar-menu__item"
            onClick={() => {
              closeMenu();
              navigate('/portfolio');
            }}
          >
            <User size={16} strokeWidth={1.8} />
            Owner portfolio
          </button>
          <hr className="ras-avatar-menu__divider" />
          <button
            type="button"
            className="ras-avatar-menu__item ras-avatar-menu__item--danger"
            onClick={() => void handleLogout()}
          >
            <LogOut size={16} strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ShellLayout({ children }: { children: ReactNode }) {
  const handleTitlebarMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const interactive = target.closest('a, button, input, select, textarea, [role="button"], [tabindex]');
    if (interactive) return;
    void startStudioWindowDrag();
  };

  return (
    <div className="ras-shell">
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
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientY - rect.top > 40) return;
            const target = event.target as HTMLElement;
            const interactive = target.closest('a, button, input, select, textarea, [role="button"], [tabindex]');
            if (interactive) return;
            void startStudioWindowDrag();
          }}
          data-testid="shell-main-drag-region"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
