// src/pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ENDPOINTS } from '../../config/api';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, userProfile, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state?.from?.pathname;
  const resetSuccess = searchParams.get('resetSuccess');
  const prefillEmail = searchParams.get('email');

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  const handleRedirect = (profile) => {
    if (profile.requiresPasswordReset) {
      return navigate('/force-password-reset');
    }
    if (profile.role === 'admin') return navigate('/super-admin');
    if (['management', 'teacher', 'editor', 'administrator'].includes(profile.role)) {
      if (profile.status === 'pending') {
        // Stay on login or a separate "Waiting" page
        return navigate('/login', { state: { approvalPending: true } });
      }
      return navigate('/admin');
    }
    navigate(from || '/');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteToken = params.get('inviteToken');
    const legacyEmail = params.get('email');
    const legacyPass = params.get('password');

    if (inviteToken) {
      const handleTokenLogin = async () => {
        setLoading(true);
        setError('');
        try {
          const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
          const { db } = await import('../../firebase/config');
          
          const tokenRef = doc(db, 'tempInviteTokens', inviteToken);
          const tokenSnap = await getDoc(tokenRef);

          if (tokenSnap.exists()) {
            const { email: tokenEmail, password: tokenPass, expiresAt } = tokenSnap.data();
            
            if (expiresAt.toMillis() < Date.now()) {
              setError('Invite token has expired. Please ask for a new invite.');
            } else {
              const cred = await login(tokenEmail, tokenPass);
              const { getUserProfile } = await import('../../firebase/firestore');
              let profile = null;
              try {
                profile = await getUserProfile(cred.user.uid);
              } catch (pErr) {
                console.warn("Profile fetch failed during token login:", pErr);
              }
              
              await deleteDoc(tokenRef);
              
              if (profile) handleRedirect(profile);
              else navigate(from || '/');
            }
          } else {
            setError('Invalid or already used invite token. Try logging in manually.');
          }
        } catch (err) {
          console.error("Token login error:", err);
          setError(`Auto-login failed: ${err.message || 'Unknown error'}. Please sign in manually.`);
        }
        setLoading(false);
      };
      handleTokenLogin();
    } else if (legacyEmail && legacyPass) {
      const handleLegacyLogin = async () => {
        setLoading(true);
        setError('');
        try {
          const cred = await login(legacyEmail, legacyPass);
          const { getUserProfile } = await import('../../firebase/firestore');
          let profile = null;
          try {
            profile = await getUserProfile(cred.user.uid);
          } catch (pErr) {
            console.warn("Profile fetch failed, continuing with auth user only:", pErr);
          }
          
          if (profile) handleRedirect(profile);
          else navigate(from || '/');
        } catch (err) {
          console.error("Legacy login error:", err);
          setError(`Auto-login failed: ${err.message || 'User account not found'}. Please sign in manually.`);
        }
        setLoading(false);
      };
      handleLegacyLogin();
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await login(email, password);
      const { getUserProfile } = await import('../../firebase/firestore');
      let profile = null;
      try {
        profile = await getUserProfile(cred.user.uid);
      } catch (pErr) {
        console.warn("Profile fetch failed during manual login:", pErr);
      }
      
      if (profile) handleRedirect(profile);
      else navigate(from || '/');
    } catch (err) {
      console.error("Login Error:", err.code, err.message);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Sign in failed: ' + err.message);
      }
    }
    setLoading(false);
  };

  const isPendingApproval = userProfile?.status === 'pending' && (userProfile?.role === 'management' || userProfile?.role === 'teacher');

  if (currentUser && userProfile && !isPendingApproval) {
    return (
      <div className="min-h-screen bg-[#faf9fd] flex flex-col items-center justify-center p-6 text-center font-manrope">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full border border-slate-100">
          <span className="material-symbols-outlined text-6xl text-[#002045] mb-4">verified_user</span>
          <h1 className="text-2xl font-black text-[#002045] mb-2">Already Signed In</h1>
          <p className="text-[#43474e] mb-8">You are currently logged in as <b>{userProfile.displayName}</b>.</p>
          <button 
            onClick={() => handleRedirect(userProfile)}
            className="w-full bg-[#002045] text-white h-14 rounded-full font-bold shadow-lg shadow-[#002045]/20 hover:scale-[1.02] active:scale-95 transition-all mb-4"
          >
            Go to My Dashboard
          </button>
          <button onClick={logout} className="text-red-600 font-bold text-sm hover:underline">Sign out of this account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <span className="text-on-primary font-headline text-xl font-extrabold tracking-tight uppercase">Smart League</span>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="font-headline text-5xl font-extrabold text-on-primary leading-none tracking-tight mb-6">
            Celebrate<br /><span className="text-secondary-container">Excellence.</span>
          </h1>
          <p className="text-on-primary/70 font-body text-lg max-w-sm leading-relaxed">
            The platform that recognizes, records, and celebrates student achievements across institutions.
          </p>
        </div>
        <div className="relative z-10 flex gap-6">
          {['Students', 'Teachers', 'Institutions'].map((label) => (
            <div key={label} className="text-center">
              <p className="text-on-primary font-headline text-2xl font-extrabold">—</p>
              <p className="text-on-primary/60 text-xs uppercase tracking-widest font-bold">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <span className="text-primary font-headline text-lg font-extrabold uppercase">Smart League</span>
          </div>

          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight mb-1">Welcome back</h2>
          <p className="text-on-surface-variant text-sm mb-8">Sign in to your account to continue.</p>

          {resetSuccess && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl text-green-800 text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Password reset successful. Please sign in with your new password.
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-error-container rounded-xl text-error text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {location.state?.approvalPending && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-[2rem] text-amber-900 text-center animate-in fade-in slide-in-from-top-4 duration-500">
              <span className="material-symbols-outlined text-4xl mb-2 block">hourglass_empty</span>
              <h3 className="font-bold text-lg">Waiting for Approval</h3>
              <p className="text-sm opacity-80">Your management account for <b>{userProfile?.institution}</b> is currently being reviewed by the Smart League Super Admin.</p>
              <p className="text-xs mt-4">You will receive an email once your account is activated.</p>
              <button onClick={logout} className="mt-6 text-xs font-bold underline">Sign out & try later</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
              <div className="flex items-center bg-surface-container-low rounded-xl h-12 px-4 gap-3 focus-within:ring-2 ring-primary/30 transition-all">
                <span className="material-symbols-outlined text-outline text-sm">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-on-surface text-sm placeholder:text-outline"
                  placeholder="you@institution.edu"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
              <div className="flex items-center bg-surface-container-low rounded-xl h-12 px-4 gap-3 focus-within:ring-2 ring-primary/30 transition-all">
                <span className="material-symbols-outlined text-outline text-sm">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-on-surface text-sm placeholder:text-outline"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">Forgot password?</Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 bg-primary text-on-primary rounded-xl font-bold text-sm tracking-wide hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── SIGNUP PAGE ──────────────────────────────────────────────────────────────
export const Signup = () => {
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'management', institution: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingInvite, setFetchingInvite] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const inviteId = queryParams.get('invite');

  useEffect(() => {
    if (inviteId) {
      setFetchingInvite(true);
      const fetchInvite = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../../firebase/config');
          const snap = await getDoc(doc(db, 'invites', inviteId));
          if (snap.exists() && snap.data().status === 'pending') {
            const data = snap.data();
            setForm(prev => ({
              ...prev,
              displayName: data.name || '',
              email: data.email || '',
              institution: data.institution || '',
              password: data.tempPassword || '',
              role: 'teacher'
            }));
          } else {
            alert('This invitation is invalid or has already been used.');
            navigate('/signup');
          }
        } catch (err) {
          console.error("Error fetching invite:", err);
        }
      };
      fetchInvite();
      setFetchingInvite(false);
    }
  }, [inviteId, navigate]);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await signup(form);
      
      // If used an invite, mark it as completed
      if (inviteId) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');
        await updateDoc(doc(db, 'invites', inviteId), { status: 'completed' });
      }

      if (form.role === 'management') {
        navigate('/login', { state: { approvalPending: true } });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message.includes('email-already-in-use') ? 'This email is already registered.' : 'Failed to create account.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
          <span className="text-primary font-headline text-lg font-extrabold uppercase">Smart League</span>
        </div>

        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight mb-1">Create Account</h2>
        <p className="text-on-surface-variant text-sm mb-8">Join Smart League and start showcasing achievements.</p>

        {error && (
          <div className="mb-6 flex flex-col gap-2">
            <div className="p-4 bg-error-container rounded-xl text-error text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
            
            {/* DEV TOOL: Instant Wipe if email exists */}
            {(error.includes('already registered') || error.includes('already-in-use')) && window.location.hostname === 'localhost' && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`DEV ONLY: Wipe ${form.email} completely and retry?`)) return;
                  try {
                    const res = await fetch(ENDPOINTS.DELETE_BY_EMAIL, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: form.email })
                    });
                    if (res.ok) {
                      alert('Account wiped! Click "Create Account" again.');
                      setError('');
                    } else {
                      const d = await res.json();
                      alert('Wipe failed: ' + d.error);
                    }
                  } catch (e) {
                    alert('Server not responding. Is backend running?');
                  }
                }}
                className="text-[10px] uppercase font-black tracking-tighter text-error border border-error/30 py-1.5 rounded-lg hover:bg-error hover:text-white transition-all"
              >
                [Dev Only] Wipe Email & Retry
              </button>
            )}
          </div>
        )}

        {fetchingInvite ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            <p className="text-on-surface-variant font-medium">Validating Invitation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { field: 'displayName', label: 'Full Name', type: 'text', icon: 'person', placeholder: 'Your full name' },
            { field: 'email', label: 'Email', type: 'email', icon: 'mail', placeholder: 'you@institution.edu' },
            { field: 'institution', label: 'Institution', type: 'text', icon: 'account_balance', placeholder: 'Your school/university' },
            { field: 'password', label: 'Password', type: 'password', icon: 'lock', placeholder: 'Min. 6 characters' },
          ].map(({ field, label, type, icon, placeholder }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{label}</label>
              <div className="flex items-center bg-surface-container-low rounded-xl h-12 px-4 gap-3 focus-within:ring-2 ring-primary/30 transition-all">
                <span className="material-symbols-outlined text-outline text-sm">{icon}</span>
                <input type={type} value={form[field]} onChange={update(field)}
                  className="flex-1 bg-transparent border-none outline-none text-on-surface text-sm placeholder:text-outline"
                  placeholder={placeholder} required />
              </div>
            </div>
          ))}


          <button type="submit" disabled={loading}
            className="h-12 bg-primary text-on-primary rounded-xl font-bold text-sm tracking-wide hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {loading ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating...</> : 'Create Account'}
          </button>
        </form>
        )}

        <p className="text-center text-sm text-on-surface-variant mt-6">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage('Check your inbox for a password reset link.');
    } catch {
      setError('Failed to send reset email. Check the address and try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h2 className="font-headline text-3xl font-extrabold text-primary mb-2">Reset Password</h2>
        <p className="text-on-surface-variant text-sm mb-8">We'll send a reset link to your email.</p>
        {message && <div className="mb-4 p-4 bg-surface-container-low rounded-xl text-primary text-sm font-medium">{message}</div>}
        {error && <div className="mb-4 p-4 bg-error-container rounded-xl text-error text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="h-12 bg-surface-container-low rounded-xl px-4 text-sm outline-none focus:ring-2 ring-primary/30"
            placeholder="your@email.com" required />
          <button type="submit" disabled={loading}
            className="h-12 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <Link to="/login" className="block text-center text-sm text-primary font-bold mt-4 hover:underline">← Back to Login</Link>
      </div>
    </div>
  );
};
