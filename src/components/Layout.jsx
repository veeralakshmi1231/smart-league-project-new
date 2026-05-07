// src/components/Layout.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── BOTTOM NAV (Mobile - Student/Teacher) ───────────────────────────────────
// ─── BOTTOM NAV (Mobile - Student) ───────────────────────────────────────────
export const BottomNav = () => {
  const location = useLocation();
  const { userProfile, unreadCount } = useAuth();
  
  if (userProfile?.role === 'admin' || userProfile?.role === 'management') return null;

  const links = [
    { to: '/explore', icon: 'explore', label: 'Explore' },
    { to: '/events', icon: 'calendar_month', label: 'Events' },
    { to: '/activity', icon: 'notifications', label: 'Activity', badge: unreadCount },
    { to: `/profile/${userProfile?.slug || 'me'}`, icon: 'account_circle', label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-outline-variant/10 pb-safe lg:hidden flex justify-around items-center px-4 py-3 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      {links.map(({ to, icon, label, badge }) => {
        const active = location.pathname.startsWith(to);
        return (
          <Link 
            key={to} 
            to={to} 
            className={`relative flex flex-col items-center justify-center gap-1 px-4 py-1 transition-all duration-300 ${active ? 'text-primary' : 'text-on-surface-variant/60'}`}
          >
            {active && (
              <div className="absolute -top-3 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
            <span className="material-symbols-outlined text-[24px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
            <p className={`text-[10px] font-bold tracking-tight ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</p>
            {badge > 0 && (
              <span className="absolute top-0.5 right-3 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full ring-2 ring-white">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

// ─── GLASS TOP BAR (Mobile - Student/Teacher) ────────────────────────────────
export const MobileTopBar = ({ title, showSearch, showBack }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="flex items-center p-4 pb-2 justify-between">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="flex size-12 shrink-0 items-center">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
        ) : (
          <div className="flex size-12 shrink-0 items-center">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="avatar" className="size-10 rounded-full border-2 border-primary-fixed object-cover" />
            ) : (
              <div className="size-10 rounded-full border-2 border-primary-fixed bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm">
                {(userProfile?.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        )}
        <h2 className="text-primary font-headline text-xl font-extrabold leading-tight tracking-[-0.02em] flex-1 text-center uppercase">
          {title || 'Smart League'}
        </h2>
        <div className="flex w-12 items-center justify-end">
          <button className="flex items-center justify-center rounded-full h-10 w-10 bg-surface-container-low text-primary transition-colors hover:bg-surface-container">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
          </button>
        </div>
      </div>
      {showSearch && (
        <div className="px-4 py-3">
          <div className="flex w-full items-stretch rounded-full bg-surface-container-low h-12 overflow-hidden focus-within:ring-2 ring-primary/20 transition-all">
            <div className="text-on-surface-variant flex items-center justify-center pl-4">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input className="w-full border-none bg-transparent focus:ring-0 px-3 text-on-surface placeholder:text-outline text-base" placeholder="Search students or achievements" />
          </div>
        </div>
      )}
    </header>
  );
};

// ─── ADMIN SIDEBAR ────────────────────────────────────────────────────────────
// ─── STUDENT SIDEBAR (Desktop) ────────────────────────────────────────────────
export const StudentSidebar = () => {
  const location = useLocation();
  const { userProfile, logout, unreadCount } = useAuth();

  const links = [
    { to: '/explore', icon: 'explore', label: 'Explore Feed' },
    { to: '/events', icon: 'calendar_month', label: 'Upcoming Events' },
    { to: '/activity', icon: 'notifications', label: 'Recent Activity', badge: unreadCount },
    
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-outline-variant/10 hidden lg:flex flex-col p-6 z-40">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-on-primary">star</span>
        </div>
        <span className="text-lg font-black text-primary uppercase tracking-tighter">Smart League</span>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map(({ to, icon, label, badge }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link 
              key={to} 
              to={to} 
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group ${active ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
              <span className={`font-bold text-sm ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
              {badge > 0 && (
                <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-white text-primary' : 'bg-red-500 text-white'}`}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        {userProfile && (
          <div className="bg-surface-container-low p-4 rounded-[1.5rem] flex items-center gap-3 border border-outline-variant/10">
            <img 
              src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || 'U')}`}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{userProfile.displayName}</p>
              <p className="text-[10px] uppercase font-black text-primary opacity-60 tracking-widest">Student</p>
            </div>
          </div>
        )}
        <button 
          onClick={logout}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl w-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-all font-bold text-sm"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

// ─── ADMIN SIDEBAR ────────────────────────────────────────────────────────────
export const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userProfile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/admin/students', icon: 'school', label: 'Students' },
    { to: '/admin/achievements', icon: 'workspace_premium', label: 'Achievements' },
    { to: '/admin/news', icon: 'edit_note', label: 'Newsroom' },
    { to: '/admin/criteria', icon: 'rule', label: 'Criteria Editor' },
    { to: '/admin/users', icon: 'manage_accounts', label: 'Users & Permissions' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`h-screen ${collapsed ? 'w-16' : 'w-64'} fixed left-0 top-0 flex-col hidden lg:flex bg-slate-50 border-r border-slate-200/50 pt-0 transition-all duration-300 z-40`}>
      {/* Header */}
      <div className="h-16 flex items-center px-4 justify-between border-b border-slate-200/50">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-sm">star</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary font-headline tracking-tight">Admin Portal</h2>
              <p className="text-[9px] uppercase tracking-widest text-outline font-medium">Smart League</p>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-lg hover:bg-slate-200 transition-colors ml-auto">
          <span className="material-symbols-outlined text-outline text-sm">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-grow flex flex-col gap-1 px-2 pt-4">
        {navItems.map(({ to, icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-inter text-sm font-medium ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:translate-x-0.5'}`}>
              <span className="material-symbols-outlined text-xl shrink-0" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 mt-auto border-t border-slate-200/50 pt-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {(userProfile?.displayName || 'A')[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-on-surface truncate">{userProfile?.displayName || 'Admin'}</p>
              <p className="text-[10px] text-outline uppercase tracking-wider">Administrator</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className={`flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-error transition-all`}>
          <span className="material-symbols-outlined text-xl shrink-0">logout</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

// ─── ADMIN TOP BAR ────────────────────────────────────────────────────────────
export const AdminTopBar = () => {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-xl h-16 flex items-center px-8 border-b border-slate-200/30 lg:pl-72">
      <div className="flex items-center justify-between w-full">
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-sm">star</span>
          </div>
          <span className="font-bold text-primary text-sm tracking-tight">Smart League Admin</span>
        </div>
        <div className="hidden lg:flex items-center bg-surface-container-low px-3 py-1.5 rounded-lg">
          <span className="material-symbols-outlined text-outline text-sm">search</span>
          <input className="bg-transparent border-none focus:ring-0 text-sm w-48 ml-2 outline-none" placeholder="Search..." />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button onClick={() => navigate('/admin/news/new')} className="bg-primary text-on-primary px-4 py-1.5 rounded-full font-label text-sm font-semibold hover:opacity-90 transition-all hidden md:block">
            + Publish News
          </button>
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-primary cursor-pointer">
            {(userProfile?.displayName || 'A')[0]}
          </div>
        </div>
      </div>
    </header>
  );
};

// ─── ROUTE GUARDS ─────────────────────────────────────────────────────────────
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!loading) {
      if (!currentUser) navigate('/login', { state: { from: location }, replace: true });
      else if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [currentUser, userProfile, loading, navigate, location, allowedRoles]);

  if (loading || !currentUser) return <LoadingScreen />;
  return children;
};

// ─── STUDENT LAYOUT ───────────────────────────────────────────────────────────
export const StudentLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface">
      <StudentSidebar />
      <div className="lg:pl-72 min-h-screen flex flex-col">
        <main className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export const LoadingScreen = () => (
  <div className="min-h-screen bg-surface flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
        <span className="material-symbols-outlined text-on-primary">star</span>
      </div>
      <p className="text-outline font-medium text-sm tracking-wide">Smart League</p>
    </div>
  </div>
);
