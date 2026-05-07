// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { createUserProfile, getUserProfile } from '../firebase/firestore';
import { sendEmail } from '../utils/emailService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up — creates Firebase Auth user + Firestore profile
  const signup = async ({ email, password, displayName, role, institution }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const profile = { 
      email, 
      displayName, 
      role, 
      institution, 
      photoURL: '', 
      status: role === 'management' ? 'pending' : 'active',
      createdAt: new Date() 
    };
    await createUserProfile(cred.user.uid, profile);
    
    // Auto-send Welcome Email via Local Nodemailer Server (Non-blocking)
    if (role === 'management') {
      sendEmail({
        to: email,
        subject: 'Welcome to Smart League - Registration Under Review',
        html: `<p>Hello ${displayName},</p><p>Welcome to Smart League! Your management account for <strong>${institution}</strong> is currently under review by our super admins. We will notify you as soon as your account is approved.</p><p>Best regards,<br/>The Smart League Team</p>`
      }).catch(e => console.error('Failed to send welcome email:', e));
    }

    setUserProfile({ id: cred.user.uid, ...profile });
    return cred;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const logout = () => {
    setUserProfile(null);
    return signOut(auth);
  };

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = userProfile?.role === 'admin';
  const isManagement = userProfile?.role === 'management';
  const isTeacher = userProfile?.role === 'teacher';
  const isStudent = userProfile?.role === 'student';
  const isPending = userProfile?.status === 'pending';

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, loading,
      signup, login, logout, resetPassword,
      isAdmin, isManagement, isTeacher, isStudent, isPending,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
