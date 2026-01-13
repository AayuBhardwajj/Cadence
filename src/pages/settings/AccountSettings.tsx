import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock,
    Mail,
    Shield,
    Trash2,
    Smartphone,
    History,
    Calendar,
    List,
    Search,
    Filter,
    FileText,
    Clock,
    Mic,
    BookOpen,
    Eye,
    EyeOff,
    AlertTriangle,
    ChevronRight,
    Download,
    LogOut,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    MoreVertical,
    Play
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

export const AccountSettings = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('security');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [user, setUser] = useState<any>(null);
    const [isOAuth, setIsOAuth] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [mfaData, setMfaData] = useState<any>(null);
    const [otpCode, setOtpCode] = useState('');

    const logSecurityEvent = async (eventType: string, metadata = {}) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('security_logs').insert({
            user_id: user.id,
            event_type: eventType,
            metadata,
            user_agent: navigator.userAgent
        });
    };

    const getPasswordStrength = (password: string) => {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };

    const passwordRequirements = [
        { label: '8+ Characters', met: newPassword.length >= 8 },
        { label: 'Uppercase Letter', met: /[A-Z]/.test(newPassword) },
        { label: 'Number', met: /[0-9]/.test(newPassword) },
        { label: 'Special Character', met: /[^A-Za-z0-9]/.test(newPassword) }
    ];

    const strength = getPasswordStrength(newPassword);
    const strengthConfig = [
        { label: 'Too Weak', color: 'bg-red-500/20 text-red-400 border-red-500/20' },
        { label: 'Weak', color: 'bg-red-500/40 text-red-500 border-red-500/30' },
        { label: 'Moderate', color: 'bg-amber-500/40 text-amber-500 border-amber-500/30' },
        { label: 'Strong', color: 'bg-green-500/40 text-green-500 border-green-500/30' },
        { label: 'Excellent', color: 'bg-green-500 text-white' }
    ][strength] || { label: 'Waiting...', color: 'bg-white/5 text-white/20' };

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                // Check if user is OAuth
                const isOAuthUser = user.app_metadata.provider !== 'email';
                setIsOAuth(isOAuthUser);

                // Check MFA status
                const { data: mfaFactors, error: mfaError } = await supabase.auth.mfa.listFactors();
                if (mfaFactors?.all.some(f => f.status === 'verified')) {
                    setMfaEnabled(true);
                }
            }
        };
        init();
    }, []);

    const handlePasswordAction = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match or are empty.' });
            return;
        }

        setUpdating(true);
        setMessage(null);

        try {
            // For Email users, verify current password first
            if (!isOAuth) {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: currentPassword
                });
                if (loginError) throw new Error('Current password is incorrect.');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            await logSecurityEvent(isOAuth ? 'Password Set' : 'Password Change', {
                method: isOAuth ? 'OAuth Conversion' : 'Email Manual'
            });

            setMessage({ type: 'success', text: isOAuth ? 'Password set successfully!' : 'Password changed successfully!' });
            setNewPassword('');
            setConfirmPassword('');
            setCurrentPassword('');

            // If OAuth user just set a password, they are effectively no longer "just" OAuth
            if (isOAuth) setIsOAuth(false);

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setUpdating(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleMfaSetup = async () => {
        setUpdating(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Cadence AI',
                friendlyName: `${user.email}'s Phone`
            });
            if (error) throw error;
            setMfaData(data);
            setShowMfaSetup(true);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setUpdating(false);
        }
    };

    const verifyAndEnableMfa = async () => {
        if (!mfaData || !otpCode) return;
        setUpdating(true);
        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: mfaData.id,
                code: otpCode
            });
            if (error) throw error;

            setMfaEnabled(true);
            setShowMfaSetup(false);
            setMfaData(null);
            setOtpCode('');
            await logSecurityEvent('MFA Enabled', { factorId: mfaData.id });
            setMessage({ type: 'success', text: 'Two-Factor Authentication enabled!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <>
            <div className="max-w-5xl mx-auto space-y-10 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Account Settings</h1>
                        <p className="text-white/40 font-bold text-sm mt-1">Manage your security and account preferences</p>
                    </div>
                    <div className="flex gap-2">
                        {['security', 'privacy', 'data'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    activeTab === tab
                                        ? "bg-white text-black shadow-xl"
                                        : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Security Section */}
                    <div className="lg:col-span-8 space-y-8">
                        <EnhancedCard>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Password & Authentication</h3>
                                    <p className="text-xs text-white/30 font-bold">Keep your account secure with a strong password</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {isOAuth ? (
                                    <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/20 mb-6">
                                        <div className="flex gap-4">
                                            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 h-fit">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black uppercase text-sm tracking-tight">OAuth User detected</h4>
                                                <p className="text-xs text-white/40 font-bold mt-1">
                                                    You're currently using Google/X login. Set a password to enable traditional email login.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {!isOAuth && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        {newPassword && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="space-y-4"
                                            >
                                                {/* Strength Meter */}
                                                <div className="flex gap-1.5 h-1.5">
                                                    {[1, 2, 3, 4].map((step) => (
                                                        <div
                                                            key={step}
                                                            className={cn(
                                                                "flex-1 rounded-full transition-all duration-500",
                                                                strength >= step
                                                                    ? (strength <= 2 ? 'bg-red-500' : strength === 3 ? 'bg-amber-500' : 'bg-green-500')
                                                                    : 'bg-white/10'
                                                            )}
                                                        />
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border transition-all",
                                                        strengthConfig.color
                                                    )}>
                                                        {strengthConfig.label}
                                                    </span>
                                                </div>

                                                {/* Requirements Checklist */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {passwordRequirements.map((req, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-1 h-1 rounded-full",
                                                                req.met ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-white/20"
                                                            )} />
                                                            <span className={cn(
                                                                "text-[9px] font-bold uppercase tracking-tight transition-colors",
                                                                req.met ? "text-green-400" : "text-white/20"
                                                            )}>
                                                                {req.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "p-4 rounded-xl text-xs font-bold uppercase tracking-widest border",
                                            message.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                        )}
                                    >
                                        {message.text}
                                    </motion.div>
                                )}

                                <button
                                    onClick={handlePasswordAction}
                                    disabled={updating}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {updating && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    {updating ? 'Processing...' : isOAuth ? 'Set Password' : 'Update Security'}
                                </button>
                            </div>

                            <div className="mt-12 pt-10 border-t border-white/5 space-y-6">
                                <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-400">
                                            <Smartphone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black uppercase italic tracking-tight">Two-Factor Auth</h4>
                                            <p className="text-xs text-white/30 font-bold">Add an extra layer of security to your account</p>
                                            {mfaEnabled && (
                                                <div className="flex items-center gap-2 mt-1 text-[10px] font-black text-green-400 uppercase tracking-widest bg-green-400/10 px-2 py-0.5 rounded-md w-fit">
                                                    <CheckCircle2 className="w-3 h-3" /> Enabled
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={mfaEnabled ? undefined : handleMfaSetup}
                                        disabled={updating || mfaEnabled}
                                        className={cn(
                                            "font-black text-[10px] uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl transition-all",
                                            mfaEnabled
                                                ? "bg-green-500/20 text-green-400 cursor-default"
                                                : "bg-white/10 hover:bg-white text-white hover:text-black"
                                        )}
                                    >
                                        {mfaEnabled ? 'Active' : 'Enable'}
                                    </button>
                                </div>
                            </div>
                        </EnhancedCard>

                    </div>

                    {/* Right Rail - Status & Quick Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        <EnhancedCard className="bg-gradient-to-br from-green-600/10 to-transparent border-green-500/20">
                            <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic">Account Status</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white tracking-widest uppercase">Email Verified</p>
                                        <p className="text-[10px] text-white/40 font-bold">{user?.email || 'user@email.com'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white tracking-widest uppercase">Security Score</p>
                                        <p className="text-[10px] text-white/40 font-bold tracking-widest">85 / 100 • EXCELLENT</p>
                                    </div>
                                </div>
                            </div>
                        </EnhancedCard>

                        <EnhancedCard className="bg-slate-950/40 border-white/5">
                            <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic">Danger Zone</h3>
                            <div className="space-y-4">
                                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <Download className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                        <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">Download Data</span>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-white/20" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <Trash2 className="w-4 h-4 text-red-400/50 group-hover:text-red-400 transition-colors" />
                                        <span className="text-xs font-bold text-red-400/70 group-hover:text-red-400 transition-colors">Delete Account</span>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-red-400/20" />
                                </button>
                            </div>
                        </EnhancedCard>
                    </div>
                </div>
            </div>

            {/* MFA Setup Modal */}
            <AnimatePresence>
                {showMfaSetup && mfaData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <EnhancedCard className="w-full max-w-md bg-[#0a0a1a] border-white/10 shadow-2xl overflow-hidden relative">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Secure with MFA</h3>
                                    <p className="text-xs text-white/30 font-bold">Scan the QR code in your authenticator app</p>
                                </div>
                                <button
                                    onClick={() => setShowMfaSetup(false)}
                                    className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
                                >
                                    <AlertCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-10 flex flex-col items-center">
                                <div className="p-4 bg-white rounded-3xl mb-8 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                                    <img src={mfaData.totp.qr_code} alt="MFA QR Code" className="w-48 h-48" />
                                </div>

                                <div className="w-full space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Verification Code</label>
                                        <input
                                            type="text"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            maxLength={6}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-center text-2xl tracking-[0.5em]"
                                            placeholder="000000"
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowMfaSetup(false)}
                                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase text-white/40 hover:text-white tracking-[0.2em] transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={verifyAndEnableMfa}
                                            disabled={updating || otpCode.length !== 6}
                                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Verify
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </EnhancedCard>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
