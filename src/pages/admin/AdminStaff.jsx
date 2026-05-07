import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { sendEmail } from '../../utils/emailService';
import { ENDPOINTS } from '../../config/api';

export const StaffView = () => {
  const { userProfile } = useAuth();
  const [staff, setStaff] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'editor' });
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing staff (editors & administrators) for this institution
      const qStaff = query(
        collection(db, 'users'),
        where('role', 'in', ['editor', 'administrator']),
        where('institution', '==', userProfile.institution)
      );
      const snapStaff = await getDocs(qStaff);
      setStaff(snapStaff.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch pending invites for this institution
      const qInvites = query(
        collection(db, 'invites'),
        where('institution', '==', userProfile.institution),
        where('status', '==', 'pending')
      );
      const snapInvites = await getDocs(qInvites);
      setInvites(snapInvites.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching staff data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userProfile?.institution) {
      fetchData();
    }
  }, [userProfile]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const institutionName = userProfile?.institution || 'Smart League Member';
      
      // Call Backend to Create User Directly
      const response = await fetch(ENDPOINTS.CREATE_STAFF, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          name: inviteForm.name,
          role: inviteForm.role,
          institution: institutionName,
          invitedBy: userProfile.uid || userProfile.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create staff account');
      }

      alert('Staff account created and welcome email sent! ✅');
      setShowInviteModal(false);
      setInviteForm({ email: '', name: '', role: 'editor' });
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSending(false);
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      alert('Error revoking invite: ' + err.message);
    }
  };

  const handleWipeStaff = async (email, staffId = null) => {
    if (!window.confirm(`Wipe ${email} completely? This removes their login so you can reuse the email.`)) return;
    try {
      const response = await fetch(ENDPOINTS.DELETE_BY_EMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Wipe failed');
      }

      if (staffId) {
        setStaff(prev => prev.filter(s => s.id !== staffId));
      }
      setInvites(prev => prev.filter(i => i.email !== email));
      alert('Wiped successfully! ✅');
    } catch (err) {
      alert('Error wiping: ' + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-primary">Staff Management</h2>
          <p className="text-on-surface-variant">Manage editors and contributors for {userProfile?.institution}.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Invite Staff
        </button>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
          <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">mail</span>
            Pending Invitations
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between bg-surface p-4 rounded-xl border border-outline-variant/30">
                <div>
                  <h4 className="font-bold text-primary">{invite.name}</h4>
                  <p className="text-sm text-on-surface-variant">{invite.email}</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleWipeStaff(invite.email)}
                    className="text-error font-bold text-xs uppercase tracking-tighter hover:underline"
                  >
                    Wipe & Clear
                  </button>
                  <button 
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-on-surface-variant text-xs hover:underline"
                  >
                    Remove Log Only
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
        <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">groups</span>
          Active Editors
        </h3>
        {loading ? (
          <p className="text-on-surface-variant animate-pulse">Loading staff...</p>
        ) : staff.length === 0 ? (
          <div className="text-center py-8 bg-surface rounded-xl border border-dashed border-outline-variant">
            <p className="text-on-surface-variant">No staff members added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staff.map(member => (
              <div key={member.id} className="flex items-center justify-between bg-surface p-4 rounded-xl border border-outline-variant/30 group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary font-bold text-lg">
                    {member.displayName?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">{member.displayName}</h4>
                    <p className="text-sm text-on-surface-variant flex gap-2 items-center">
                      {member.email}
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                        {member.role}
                      </span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleWipeStaff(member.email, member.id)}
                  className="p-2 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                  title="Wipe & Remove Staff"
                >
                  <span className="material-symbols-outlined text-xl">delete_forever</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-extrabold text-primary mb-2">Invite Staff</h3>
            <p className="text-on-surface-variant text-sm mb-6">Send an invitation to a staff member. A temporary password will be emailed to them automatically.</p>
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">Full Name</label>
                <input 
                  type="text" 
                  value={inviteForm.name}
                  onChange={e => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Dr. Sarah Johnson"
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface outline-none focus:ring-2 ring-primary/30"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">Email Address</label>
                <input 
                  type="email" 
                  value={inviteForm.email}
                  onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="staff@institution.edu"
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface outline-none focus:ring-2 ring-primary/30"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">Assign Role</label>
                <select 
                  value={inviteForm.role}
                  onChange={e => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface outline-none focus:ring-2 ring-primary/30"
                  required
                >
                  <option value="editor">Editor (Requires Approval to Post)</option>
                  <option value="administrator">Administrator (Can Approve & Publish)</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 h-12 rounded-full font-bold text-on-surface hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={sending}
                  className="flex-1 h-12 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {sending ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
