import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    HelpCircle,
    MessageCircle,
    Mail,
    Book,
    ChevronRight,
    ChevronDown,
    ExternalLink,
    LifeBuoy,
    Zap,
    Globe,
    FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

const FAQ_CATEGORIES = [
    { id: 'billing', label: 'Billing & Plans', icon: <FileText className="w-5 h-5" /> },
    { id: 'learning', label: 'Learning Flow', icon: <Book className="w-5 h-5" /> },
    { id: 'account', label: 'Account Security', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'technical', label: 'Technical Issues', icon: <Zap className="w-5 h-5" /> },
];

const FAQS = [
    { q: "How do I cancel my Pro subscription?", a: "Go to Settings > Billing, scroll to the bottom, and click 'Withdraw Plan'. Your access will remain active until the end of the period." },
    { q: "Can I use Cadence offline?", a: "Yes, Pro members can download lessons for offline practice through the mobile app." },
    { q: "How is my fluency score calculated?", a: "Our AI analyzes pronunciation, grammar, and vocabulary usage against native baseline samples in real-time." },
    { q: "How do I change my interface language?", a: "Go to Settings > Language & Region and select your preferred language from the grid." },
];

export const HelpPage = () => {
    const [search, setSearch] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20">
            {/* Search Header */}
            <div className="text-center space-y-8 py-10">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-400 mb-4 animate-pulse">
                    <LifeBuoy className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">24/7 Support Center</span>
                </div>
                <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">How can we help?</h1>

                <div className="max-w-2xl mx-auto relative group">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/20 group-focus-within:text-blue-400 transition-colors">
                        <Search className="w-6 h-6" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for articles, guides, and FAQs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-16 pr-8 text-white text-lg placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white/10 transition-all shadow-2xl"
                    />
                </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {FAQ_CATEGORIES.map((cat) => (
                    <EnhancedCard key={cat.id} className="text-center group hover:scale-105 transition-all cursor-pointer">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white/40 group-hover:text-blue-400 group-hover:bg-blue-600/10 transition-all">
                            {cat.icon}
                        </div>
                        <h3 className="text-xs font-black text-white uppercase italic tracking-widest">{cat.label}</h3>
                    </EnhancedCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-10">
                {/* FAQs */}
                <div className="lg:col-span-7 space-y-8">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Popular Questions</h3>
                    <div className="space-y-4">
                        {FAQS.map((faq, i) => (
                            <EnhancedCard key={i} className="p-0 overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="font-bold text-white tracking-tight uppercase italic text-sm">{faq.q}</span>
                                    <ChevronDown className={cn("w-5 h-5 text-white/20 transition-transform", openFaq === i && "rotate-180")} />
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden bg-white/5"
                                        >
                                            <div className="p-8 text-white/50 text-sm leading-relaxed border-t border-white/5">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </EnhancedCard>
                        ))}
                    </div>
                </div>

                {/* Contact Sidebar */}
                <div className="lg:col-span-5 space-y-6">
                    <EnhancedCard>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-8">Contact Support</h3>
                        <div className="space-y-4">
                            <button className="w-full flex items-center justify-between p-6 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl">
                                        <MessageCircle className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black uppercase italic tracking-tight">Live Chat</p>
                                        <p className="text-[10px] opacity-60 font-bold">Expect reply in ~5 mins</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button className="w-full flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 text-white transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/5 rounded-2xl text-white/40 group-hover:text-white transition-colors">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black uppercase italic tracking-tight">Email Ticket</p>
                                        <p className="text-[10px] text-white/20 font-bold uppercase">Average response: 24h</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/20 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="bg-gradient-to-br from-white/10 to-transparent">
                        <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-[10px] italic flex items-center gap-2">
                            <Book className="w-4 h-4 text-blue-400" /> Resources
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Documentation', href: '#' },
                                { label: 'Community Forum', href: '#' },
                                { label: 'Release Notes', href: '#' },
                                { label: 'Privacy Policy', href: '#' },
                            ].map(link => (
                                <a key={link.label} href={link.href} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group">
                                    <span className="text-xs font-bold text-white/40 group-hover:text-white transition-colors">{link.label}</span>
                                    <ExternalLink className="w-3 h-3 text-white/10 group-hover:text-white transition-colors" />
                                </a>
                            ))}
                        </div>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
