import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Package,
    History,
    Check,
    ShieldCheck,
    Download,
    ChevronRight,
    Plus,
    AlertCircle,
    Clock,
    Zap,
    Crown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

const PLANS = [
    {
        name: 'Free',
        price: '$0',
        features: ['Basic AI Analysis', '1 Assessment/Day', 'Web Dashboard'],
        current: false,
        color: 'gray'
    },
    {
        name: 'Pro',
        price: '$12.99',
        features: ['Unlimited AI Analysis', 'Real-time Feedback', 'Priority Support', 'Offline Mode'],
        current: true,
        color: 'blue'
    },
    {
        name: 'Family',
        price: '$19.99',
        features: ['Up to 5 Users', 'Shared Analytics', 'Custom Goals', 'Premium Content'],
        current: false,
        color: 'purple'
    },
];

const BILLING_HISTORY = [
    { id: '#INV-001', date: 'Jan 12, 2024', amount: '$12.99', status: 'Paid' },
    { id: '#INV-002', date: 'Dec 12, 2023', amount: '$12.99', status: 'Paid' },
    { id: '#INV-003', date: 'Nov 12, 2023', amount: '$12.99', status: 'Paid' },
];

export const BillingSettings = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Subscription & Billing</h1>
                    <p className="text-white/40 font-bold text-sm mt-1 uppercase italic tracking-widest">Manage your plan and payment methods</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-600/10 px-4 py-2 rounded-2xl border border-blue-500/20">
                    <Crown className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Pro Member</span>
                </div>
            </div>

            {/* Plans Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan) => (
                    <EnhancedCard
                        key={plan.name}
                        className={cn(
                            "flex flex-col group relative overflow-hidden",
                            plan.current && "border-blue-500/50 bg-blue-600/5 shadow-[0_0_40px_rgba(59,130,246,0.1)]"
                        )}
                    >
                        {plan.current && (
                            <div className="absolute top-4 right-4 text-blue-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-3xl font-black text-white">{plan.price}</span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">/ Month</span>
                            </div>
                        </div>

                        <div className="flex-grow space-y-4 mb-10">
                            {plan.features.map(f => (
                                <div key={f} className="flex items-start gap-3 text-xs font-bold text-white/50 group-hover:text-white transition-colors duration-300">
                                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>

                        <button className={cn(
                            "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95",
                            plan.current
                                ? "bg-white/5 text-white/20 cursor-default border border-white/5"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                        )}>
                            {plan.current ? 'Active Plan' : `Upgrade to ${plan.name}`}
                        </button>
                    </EnhancedCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Payment Methods */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl">
                                    <CreditCard className="w-6 h-6 text-white/40" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Payment Methods</h3>
                                    <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Cards and accounts on file</p>
                                </div>
                            </div>
                            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-colors">
                                <Plus className="w-3 h-3" /> Add Card
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer group">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-10 bg-black rounded-lg border border-white/10 flex items-center justify-center font-black italic text-white/20 text-[10px]">VISA</div>
                                    <div>
                                        <p className="font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                                            •••• •••• •••• 4242
                                            <span className="text-[9px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 ml-2">PRIMARY</span>
                                        </p>
                                        <p className="text-[10px] text-white/30 font-bold uppercase">Expires 12/26</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </EnhancedCard>

                    {/* Billing History */}
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-white/5 rounded-2xl">
                                <History className="w-6 h-6 text-white/40" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Invoice History</h3>
                                <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Past payments and receipts</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {BILLING_HISTORY.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                                            <Download className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white italic tracking-tight">{inv.id}</p>
                                            <p className="text-[10px] text-white/30 font-bold uppercase">{inv.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white italic">{inv.amount}</p>
                                            <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">{inv.status}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </EnhancedCard>
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard className="bg-gradient-to-br from-indigo-900/10 to-transparent">
                        <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic">Next Payment</h3>
                        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 text-center">
                            <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-1">February 12, 2024</p>
                            <p className="text-4xl font-black text-white italic">$12.99</p>
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                <Clock className="w-3 h-3" /> Auto-renew enabled
                            </div>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="border-red-500/20 bg-red-500/5">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <AlertCircle className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-widest italic outline-none">Cancel Subscription</h3>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold leading-relaxed mb-6">
                            Canceling will end your Pro access at the end of the current billing period. You'll lose all premium features and analysis history.
                        </p>
                        <button className="w-full py-3 rounded-xl border border-red-500/20 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest transition-all">
                            Withdraw Plan
                        </button>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
