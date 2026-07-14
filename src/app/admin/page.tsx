'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Activity, DollarSign, Users, ShieldAlert, Zap, Calendar, LayoutDashboard, Store, IndianRupee, Save, AlertTriangle, CheckCircle, MessageSquare, Star, Shield, CreditCard } from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{metrics: any, pricing: any[], feedbacks: any[]}>({ metrics: {}, pricing: [], feedbacks: [] });
  
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantsSearch, setMerchantsSearch] = useState('');
  const [merchantsSort, setMerchantsSort] = useState('date');
  const [merchantsPage, setMerchantsPage] = useState(0);
  const [hasMoreMerchants, setHasMoreMerchants] = useState(true);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
  
  const [activeView, setActiveView] = useState<'analytics' | 'merchants' | 'pricing' | 'feedbacks' | 'logs'>('analytics');

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logType, setLogType] = useState<'activity' | 'system'>('activity');

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Modals State
  const [infusionShop, setInfusionShop] = useState<any | null>(null);
  const [infusionAmount, setInfusionAmount] = useState<number | ''>('');

  // Pricing State
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState({
    whatsapp_credit_cost: 1.0,
    qr_leads_credit_cost: 10.0,
    flash_offer_base_cost: 2.0,
    flash_offer_push_cost: 2.0
  });
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [pricingStatusMsg, setPricingStatusMsg] = useState('');
  const [pricingConfirmOpen, setPricingConfirmOpen] = useState(false);

  // Ticket Modal State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [globalError, setGlobalError] = useState<{title: string, message: string} | null>(null);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchLogs = async (page = 0, type = logType, reset = false) => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/logs?page=${page}&type=${type}`);
      if (res.ok) {
        const json = await res.json();
        if (page === 0 || reset) {
          setLogs(json.logs || []);
        } else {
          setLogs(prev => [...prev, ...(json.logs || [])]);
        }
        setHasMoreLogs(json.hasMore ?? false);
        setLogsPage(page);
      }
    } catch (e) {
      // Ignored
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeView === 'logs') {
      fetchLogs(0, logType, true);
    }
  }, [isAuthenticated, activeView, logType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/data');
      if (res.status === 401) {
        setIsAuthenticated(false);
      } else if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.pricing) {
          setPricingTiers(json.pricing);
        }
        if (json.settings) {
          setSystemSettings({
            whatsapp_credit_cost: Number(json.settings.whatsapp_credit_cost) || 1.0,
            qr_leads_credit_cost: Number(json.settings.qr_leads_credit_cost) || 10.0,
            flash_offer_base_cost: Number(json.settings.flash_offer_base_cost) || 2.0,
            flash_offer_push_cost: Number(json.settings.flash_offer_push_cost) || 2.0
          });
        }
        setIsAuthenticated(true);
        fetchMerchants(0, true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMerchants = async (page = 0, reset = false) => {
    setIsLoadingMerchants(true);
    try {
      const res = await fetch(`/api/admin/merchants?page=${page}&search=${encodeURIComponent(merchantsSearch)}&sort=${merchantsSort}`);
      if (res.ok) {
        const json = await res.json();
        if (reset) {
          setMerchants(json.shops || []);
        } else {
          setMerchants(prev => [...prev, ...(json.shops || [])]);
        }
        setHasMoreMerchants((json.shops || []).length === 20);
        setMerchantsPage(page);
      } else {
        const errText = await res.text();
        console.error(`[Admin Merchants Matrix] Failed to load. Status: ${res.status}. Response: ${errText}`);
      }
    } catch (e: any) {
      console.error(`[Admin Merchants Matrix] Error fetching merchants:`, e?.message || e);
    } finally {
      setIsLoadingMerchants(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const delay = setTimeout(() => {
        fetchMerchants(0, true);
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [merchantsSearch, merchantsSort]);

  // Removed loadAuditShop as we now route to the dynamic page

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Invalid credentials');
      }
    } catch (e) {
      setLoginError('Network error');
    }
  };

  const handleInfusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infusionShop || typeof infusionAmount !== 'number' || infusionAmount <= 0) return;
    
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: infusionShop.id, amount: infusionAmount })
      });
      if (res.ok) {
        setInfusionShop(null);
        setInfusionAmount('');
        fetchMerchants(1, true); // Refresh data
      } else {
        setGlobalError({ title: 'Infusion Error', message: 'Failed to infuse credits' });
      }
    } catch (e) {
      setGlobalError({ title: 'Infusion Error', message: 'Error infusing credits' });
    }
  };

  const handleSavePricing = async () => {
    setPricingConfirmOpen(false);
    setIsSavingPricing(true);
    setPricingStatusMsg('');
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing_tiers: pricingTiers, settings: systemSettings })
      });
      if (res.ok) {
        setPricingStatusMsg('SUCCESS: Global pricing engine synchronized.');
        fetchData();
      } else {
        setPricingStatusMsg('ERROR: Failed to save tier configs.');
      }
    } catch (err) {
      setPricingStatusMsg('ERROR: Network or sync failure.');
    } finally {
      setIsSavingPricing(false);
      setTimeout(() => setPricingStatusMsg(''), 4000);
    }
  };

  const updateTier = (id: number, field: 'amount_inr' | 'credit_count', value: number) => {
    setPricingTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center text-[#3E3B36] font-medium tracking-wide">INITIALIZING SECURE LINK...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center p-4">
        <div className="bg-[#FFFFFF] p-4 sm:p-6 md:p-8 md:p-12 shadow-2xl rounded-sm w-full max-w-md border border-[#E8E3DA]">
          <div className="flex justify-center mb-6">
            <ShieldAlert size={48} className="text-[#3E3B36]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl text-center text-[#3E3B36] font-semibold tracking-widest uppercase mb-2">Master Override</h1>
          <p className="text-center text-sm text-[#8E8B85] mb-8 font-light">Restricted Access. Authenticate below.</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#3E3B36] tracking-wider uppercase mb-1">Clearance ID</label>
              <input 
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3E3B36] tracking-wider uppercase mb-1">Passcode</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all"
                required
              />
            </div>
            {loginError && <p className="text-red-700 text-xs font-medium text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-[#3E3B36] text-[#F5F1EA] uppercase tracking-widest text-sm font-semibold py-4 hover:bg-black transition-colors mt-4">
              Initialize Gateway
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Calculations for Analytics ---
  const totalShops = data.metrics?.totalShops || 0;
  const totalTokens = data.metrics?.totalTokens || 0;
  const globalMessages = data.metrics?.globalMessages || 0;
  const totalRevenue = data.metrics?.totalRevenue || 0;

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36] flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#FFFFFF] border-b border-[#E8E3DA]">
        <div className="flex items-center gap-2">
          <ShieldAlert size={20} className="text-[#3E3B36]" />
          <span className="text-sm font-bold tracking-widest uppercase">Master Base</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-[#3E3B36]">
          <LayoutDashboard size={24} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-64 bg-[#FFFFFF] flex flex-col z-10 shadow-xl overflow-y-auto">
            <div className="p-6 border-b border-[#E8E3DA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-[#3E3B36]" />
                <h1 className="text-sm font-bold tracking-widest uppercase">Master Base</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              <button onClick={() => { setActiveView('analytics'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'analytics' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85]'}`}> <LayoutDashboard size={18} /> Analytics </button>
              <button onClick={() => { setActiveView('merchants'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'merchants' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85]'}`}> <Store size={18} /> Merchants </button>
              <button onClick={() => { setActiveView('pricing'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'pricing' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85]'}`}> <IndianRupee size={18} /> Pricing Engine </button>
              <button onClick={() => { router.push('/admin/transactions'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors text-[#8E8B85]"> <CreditCard size={18} /> Transactions </button>
              <button onClick={() => { setActiveView('feedbacks'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'feedbacks' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85]'}`}> <MessageSquare size={18} /> Support Tickets </button>
              <button onClick={() => { setActiveView('logs'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'logs' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85]'}`}> <Shield size={18} /> Security & Audit </button>
            </nav>
            <div className="p-4 border-t border-[#E8E3DA]">
              <button onClick={() => { document.cookie = "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; window.location.reload(); }} className="w-full text-center text-[10px] uppercase tracking-wider font-semibold hover:text-black transition-colors">Terminate Link</button>
            </div>
          </aside>
        </div>
      )}

      <aside className="w-64 bg-[#FFFFFF] border-r border-[#E8E3DA] flex-col hidden md:flex sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 border-b border-[#E8E3DA] flex items-center gap-3">
          <ShieldAlert size={24} className="text-[#3E3B36]" />
          <h1 className="text-sm font-bold tracking-widest uppercase">Master Base</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveView('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'analytics' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50'}`}
          >
            <LayoutDashboard size={18} />
            Analytics
          </button>
          <button 
            onClick={() => setActiveView('merchants')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'merchants' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50'}`}
          >
            <Store size={18} />
            Merchants
          </button>
          <button 
            onClick={() => setActiveView('pricing')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'pricing' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50'}`}
          >
            <IndianRupee size={18} />
            Pricing Engine
          </button>
          <button 
            onClick={() => router.push('/admin/transactions')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50"
          >
            <CreditCard size={18} />
            Transactions
          </button>
          <button 
            onClick={() => setActiveView('feedbacks')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'feedbacks' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50'}`}
          >
            <MessageSquare size={18} />
            Support Tickets
          </button>
          <button 
            onClick={() => setActiveView('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${activeView === 'logs' ? 'bg-[#F5F1EA] text-[#3E3B36]' : 'text-[#8E8B85] hover:text-[#3E3B36] hover:bg-[#F5F1EA]/50'}`}
          >
            <Shield size={18} />
            Security & Audit
          </button>
        </nav>
        <div className="p-4 border-t border-[#E8E3DA]">
          <button 
            onClick={() => {
              document.cookie = "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.reload();
            }} 
            className="w-full text-center text-[10px] uppercase tracking-wider font-semibold hover:text-black transition-colors"
          >
            Terminate Link
          </button>
        </div>
      </aside>

      <main className="flex-1 w-full max-w-full p-4 sm:p-6 md:p-10 overflow-hidden">
        
        {/* VIEW 1: MASTER DASHBOARD ANALYTICS */}
        {activeView === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold uppercase tracking-widest border-b border-[#E8E3DA] pb-4">Master Analytics</h2>
            
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] p-6 border border-[#E8E3DA] shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-widest mb-2">Total Shops</p>
                <p className="text-3xl font-light tracking-tight">{totalShops}</p>
                <Users className="absolute top-6 right-6 opacity-10" size={48} />
              </div>
              <div className="bg-[#FFFFFF] p-6 border border-[#E8E3DA] shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-widest mb-2">Tokens in Circulation</p>
                <p className="text-3xl font-light tracking-tight">{totalTokens.toLocaleString()}</p>
                <Zap className="absolute top-6 right-6 opacity-10" size={48} />
              </div>
              <div className="bg-[#FFFFFF] p-6 border border-[#E8E3DA] shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-widest mb-2">Global Messages</p>
                <p className="text-3xl font-light tracking-tight">{globalMessages.toLocaleString()}</p>
                <Activity className="absolute top-6 right-6 opacity-10" size={48} />
              </div>
              <div className="bg-[#3E3B36] text-[#F5F1EA] p-6 border border-[#3E3B36] shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-bold text-[#F5F1EA]/50 uppercase tracking-widest mb-2">Gross Revenue (INR)</p>
                <p className="text-3xl font-light tracking-tight">₹{totalRevenue.toLocaleString()}</p>
                <DollarSign className="absolute top-6 right-6 opacity-10" size={48} />
              </div>
            </section>

            <section className="bg-[#FFFFFF] border border-[#E8E3DA] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-[#8E8B85]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#3E3B36]">System Status Alert Log</h3>
              </div>
              <div className="bg-[#F5F1EA] p-4 text-xs font-mono text-[#8E8B85] max-h-48 overflow-y-auto space-y-2">
                <p className="text-[#3E3B36]">[SYSTEM] Operational frameworks active. No critical faults detected.</p>
                {merchants.filter(s => !s.meta_access_token).map(s => (
                  <p key={s.id}>[WARN] Shop <span className="font-semibold">{s.shop_name}</span> lacks Meta configuration.</p>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: MERCHANTS & INLINE CONTROLS */}
        {activeView === 'merchants' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold uppercase tracking-widest border-b border-[#E8E3DA] pb-4">Merchant Matrix</h2>
            
            {/* OMNI-SEARCH & SORT BAR */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#FFFFFF] p-4 border border-[#E8E3DA] shadow-sm">
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={merchantsSearch}
                onChange={e => setMerchantsSearch(e.target.value)}
                className="flex-1 bg-[#F5F1EA] px-4 py-2 text-sm text-[#3E3B36] border-none focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all w-full"
              />
              <select 
                value={merchantsSort} 
                onChange={e => setMerchantsSort(e.target.value)}
                className="bg-[#F5F1EA] px-4 py-2 text-sm text-[#3E3B36] border-none focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all w-full sm:w-auto uppercase tracking-wider text-xs font-medium"
              >
                <option value="date">Newest First</option>
                <option value="az">Name: A-Z</option>
                <option value="za">Name: Z-A</option>
              </select>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E8E3DA] shadow-sm">
              <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F1EA] text-[10px] uppercase tracking-widest text-[#8E8B85]">
                    <th className="p-4 font-semibold">Shop Entity</th>
                    <th className="p-4 font-semibold">Contact / Location</th>
                    <th className="p-4 font-semibold">Industry</th>
                    <th className="p-4 font-semibold">Token Balance</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#E8E3DA]">
                  {merchants.map(shop => {
                    const credits = Array.isArray(shop.wallets)
                      ? (shop.wallets[0]?.credits_remaining || 0)
                      : (shop.wallets?.credits_remaining || 0);
                    const isLowCredits = credits < 10;
                    return (
                      <tr 
                        key={shop.id} 
                        className="hover:bg-[#FCFAFC] transition-colors group cursor-pointer"
                        onClick={() => router.push(`/admin/merchants/${shop.id}`)}
                      >
                        <td className="p-4">
                          <div className="font-semibold text-sm mb-0.5">{shop.shop_name}</div>
                          <div className="text-[10px] text-[#8E8B85] font-mono">{shop.owner_phone}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-[10px] text-[#8E8B85] truncate max-w-[150px]">{shop.contact_number || 'N/A'}</div>
                          <div className="text-[10px] text-[#8E8B85] truncate max-w-[150px]">{shop.location_address || 'N/A'}</div>
                        </td>
                        <td className="p-4">
                          <span className="bg-[#F5F1EA] px-2 py-1 text-[10px] font-medium uppercase tracking-wider">{shop.industry_type}</span>
                        </td>
                        <td className="p-4 font-medium">{credits.toLocaleString()}</td>
                        <td className="p-4">
                          {isLowCredits ? (
                            <span className="text-red-600 text-[10px] font-bold uppercase tracking-widest">Low Alert</span>
                          ) : (
                            <span className="text-green-700 text-[10px] font-bold uppercase tracking-widest">Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {merchants.length === 0 && !isLoadingMerchants && (
                <div className="p-4 sm:p-6 md:p-8 text-center text-[#8E8B85] text-sm tracking-widest uppercase">No merchants found.</div>
              )}
              </div>
            </div>

            {hasMoreMerchants && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => fetchMerchants(merchantsPage + 1)}
                  disabled={isLoadingMerchants}
                  className="bg-[#FFFFFF] border border-[#3E3B36] text-[#3E3B36] px-6 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-[#3E3B36] hover:text-[#FFFFFF] transition-colors disabled:opacity-50"
                >
                  {isLoadingMerchants ? 'Loading...' : 'Load More Merchants'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: GLOBAL PRICING ENGINE */}
        {activeView === 'pricing' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="border-b border-[#E8E3DA] pb-4">
              <h2 className="text-xl font-bold uppercase tracking-widest">Global Pricing Engine</h2>
            </div>
            
            {pricingStatusMsg && (
              <div className={`p-4 border text-sm font-medium ${pricingStatusMsg.startsWith('ERROR') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {pricingStatusMsg}
              </div>
            )}
            
            {/* System Cost Configurations */}
            <div className="bg-[#FFFFFF] border border-[#E8E3DA] p-4 sm:p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-6 pb-2 border-b border-[#E8E3DA]">System Credit Deduction Rates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4 sm:p-6 md:p-8">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#8E8B85] mb-2">WhatsApp Credit Cost (per message)</label>
                  <input 
                    type="number" step="0.1"
                    value={systemSettings.whatsapp_credit_cost}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, whatsapp_credit_cost: Number(e.target.value) }))}
                    className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 text-lg focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all font-medium"
                  />
                  <p className="text-[9px] text-[#8E8B85] mt-1.5 uppercase tracking-widest">Base rate for Meta & QR Express dispatch</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#8E8B85] mb-2">QR Leads Credit Cost (per scan)</label>
                  <input 
                    type="number" step="0.1"
                    value={systemSettings.qr_leads_credit_cost}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, qr_leads_credit_cost: Number(e.target.value) }))}
                    className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 text-lg focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all font-medium"
                  />
                  <p className="text-[9px] text-[#8E8B85] mt-1.5 uppercase tracking-widest">Cost deducted per QR lead captured</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#8E8B85] mb-2">Base Flash Offer Cost (per insertion)</label>
                  <input 
                    type="number" step="0.1"
                    value={(systemSettings as any).flash_offer_base_cost ?? 2.0}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, flash_offer_base_cost: Number(e.target.value) }))}
                    className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 text-lg focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all font-medium"
                  />
                  <p className="text-[9px] text-[#8E8B85] mt-1.5 uppercase tracking-widest">Base rate to insert/create a flash offer</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#8E8B85] mb-2">Web Push Broadcast Cost (per toggle)</label>
                  <input 
                    type="number" step="0.1"
                    value={(systemSettings as any).flash_offer_push_cost ?? 2.0}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, flash_offer_push_cost: Number(e.target.value) }))}
                    className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-4 py-3 text-lg focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all font-medium"
                  />
                  <p className="text-[9px] text-[#8E8B85] mt-1.5 uppercase tracking-widest">Additional cost when web push is selected</p>
                </div>
              </div>
              <div className="flex items-center justify-end mt-6 pt-4 border-t border-[#E8E3DA]">
                <button 
                  onClick={() => setPricingConfirmOpen(true)}
                  disabled={isSavingPricing}
                  className="bg-[#3E3B36] text-[#F5F1EA] flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-black transition-colors disabled:opacity-50"
                >
                  <Save size={14} /> {isSavingPricing ? 'Syncing...' : 'Save Rates'}
                </button>
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-widest mb-6 pb-2 border-b border-[#E8E3DA]">Consumer Purchase Tiers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pricingTiers.map(tier => (
                <div key={tier.id} className="bg-[#FFFFFF] border border-[#E8E3DA] p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#F5F1EA] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8E8B85]">Tier {tier.id}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#8E8B85] mb-1">Amount (INR)</label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-3 top-3 text-[#8E8B85]" />
                      <input 
                        type="number"
                        value={tier.amount_inr}
                        onChange={(e) => updateTier(tier.id, 'amount_inr', Number(e.target.value))}
                        className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] pl-9 pr-3 py-2 text-lg focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#8E8B85] mb-1">Credits Awarded</label>
                    <input 
                      type="number"
                      value={tier.credit_count}
                      onChange={(e) => updateTier(tier.id, 'credit_count', Number(e.target.value))}
                      className="w-full bg-[#F5F1EA] border-none text-[#3E3B36] px-3 py-2 text-lg focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all font-medium"
                    />
                  </div>
                  <div className="mt-auto pt-4 border-t border-[#E8E3DA]">
                    <p className="text-xs text-[#8E8B85] text-right">Effective Rate: <span className="font-semibold text-[#3E3B36]">₹{(tier.amount_inr / tier.credit_count).toFixed(2)}/msg</span></p>
                  </div>
                </div>
              ))}
              {pricingTiers.length === 0 && (
                <div className="col-span-full p-4 sm:p-6 md:p-8 text-center text-[#8E8B85] text-sm uppercase tracking-widest border border-dashed border-[#E8E3DA]">
                  No pricing tiers configured. Ensure public.pricing_tiers is populated.
                </div>
              )}
            </div>

            {/* Tiers Save Button */}
            <div className="flex items-center justify-end pt-4 border-t border-[#E8E3DA]">
              <button 
                onClick={() => setPricingConfirmOpen(true)}
                disabled={isSavingPricing}
                className="bg-[#3E3B36] text-[#F5F1EA] flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-black transition-colors disabled:opacity-50"
              >
                <Save size={14} /> {isSavingPricing ? 'Syncing...' : 'Save Tiers'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: SUPPORT TICKETS & FEEDBACK */}
        {activeView === 'feedbacks' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold uppercase tracking-widest border-b border-[#E8E3DA] pb-4">Support & Feedback Ledger</h2>
            
            <div className="space-y-4">
              {data.feedbacks?.length === 0 && (
                <div className="bg-[#FFFFFF] p-4 sm:p-6 md:p-8 border border-[#E8E3DA] text-center text-[#8E8B85] text-sm tracking-widest uppercase">
                  No support tickets found in the matrix.
                </div>
              )}
              {data.feedbacks?.map((ticket: any) => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-[#FFFFFF] p-6 border border-[#E8E3DA] shadow-sm flex flex-col md:flex-row gap-6 cursor-pointer hover:border-[#3E3B36] transition-colors"
                >
                  {/* Meta / Identity */}
                  <div className="md:w-1/3 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#F5F1EA] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#3E3B36]">{ticket.category}</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star}
                            size={12} 
                            className={star <= ticket.rating ? "text-[#C4A896] fill-current" : "text-[#E8E3DA]"} 
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#3E3B36]">{ticket.shop?.shop_name || 'Unknown Shop'}</p>
                      <p className="text-[10px] font-mono text-[#8E8B85] mt-1">{ticket.shop?.owner_phone || 'No phone'}</p>
                    </div>
                    <p className="text-[10px] tracking-widest uppercase text-[#8E8B85]">
                      {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* Message Block */}
                  <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-[#E8E3DA] pt-4 md:pt-0 md:pl-6 flex flex-col">
                    <p className="text-xs text-[#8E8B85] tracking-[0.1em] uppercase mb-2">Message Body</p>
                    <div className="bg-[#F5F1EA] p-4 text-sm text-[#3E3B36] font-sans leading-relaxed rounded-md h-full whitespace-pre-wrap">
                      {ticket.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: SECURITY & SYSTEM LOGS */}
        {activeView === 'logs' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E3DA] pb-4 gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold uppercase tracking-widest">Security & Audit Logs</h2>
                <button
                  onClick={() => router.push('/admin/logs')}
                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-[#3E3B36] text-[#F5F1EA] hover:bg-[#000000] rounded transition-colors"
                >
                  🗂️ View Dedicated Infinite Scroll Layout
                </button>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F5F1EA] p-1 rounded border border-[#E8E3DA] self-start sm:self-auto">
                <button
                  onClick={() => { setLogType('activity'); setLogs([]); }}
                  className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors rounded ${logType === 'activity' ? 'bg-[#3E3B36] text-[#F5F1EA]' : 'text-[#8E8B85] hover:text-[#3E3B36]'}`}
                >
                  User Actions
                </button>
                <button
                  onClick={() => { setLogType('system'); setLogs([]); }}
                  className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors rounded ${logType === 'system' ? 'bg-[#3E3B36] text-[#F5F1EA]' : 'text-[#8E8B85] hover:text-[#3E3B36]'}`}
                >
                  System Errors
                </button>
              </div>
            </div>
            
            <div className="bg-[#FFFFFF] border border-[#E8E3DA] shadow-sm">
              <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F1EA] text-[10px] uppercase tracking-widest text-[#8E8B85]">
                    {logType === 'activity' ? (
                      <>
                        <th className="p-4 font-semibold">Account Email</th>
                        <th className="p-4 font-semibold">Action Performed</th>
                        <th className="p-4 font-semibold">Timestamp</th>
                        <th className="p-4 font-semibold">Shop ID</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4 font-semibold">Merchant / Shop</th>
                        <th className="p-4 font-semibold">Error Category</th>
                        <th className="p-4 font-semibold">Diagnostic / Failure Reason</th>
                        <th className="p-4 font-semibold">Timestamp</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#E8E3DA]">
                  {logType === 'activity' ? (
                    logs.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-[#FCFAFC] transition-colors">
                        <td className="p-4 font-medium">{log.account_email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm ${log.action_type === 'LOGIN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {log.action_type}
                          </span>
                        </td>
                        <td className="p-4 text-[10px] text-[#8E8B85] font-mono">
                          {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-4 text-[10px] text-[#8E8B85] font-mono max-w-[150px] truncate">{log.shop_id}</td>
                      </tr>
                    ))
                  ) : (
                    logs.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-[#FCFAFC] transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-sm">{log.shops?.shop_name || 'N/A'}</div>
                          <div className="text-[10px] text-[#8E8B85] font-mono">{log.shop_id}</div>
                        </td>
                        <td className="p-4">
                          <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded">
                            {log.error_type}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-mono text-[#3E3B36] max-w-xs break-words whitespace-pre-wrap">
                          {log.failure_reason}
                        </td>
                        <td className="p-4 text-[10px] text-[#8E8B85] font-mono">
                          {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {logs.length === 0 && !isLoadingLogs && (
                <div className="p-4 sm:p-6 md:p-8 text-center text-[#8E8B85] text-sm tracking-widest uppercase">
                  {logType === 'activity' ? 'No activity logs found.' : 'No system error logs found.'}
                </div>
              )}
              </div>
            </div>

            {hasMoreLogs && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => fetchLogs(logsPage + 1)}
                  disabled={isLoadingLogs}
                  className="bg-[#FFFFFF] border border-[#3E3B36] text-[#3E3B36] px-6 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-[#3E3B36] hover:text-[#FFFFFF] transition-colors disabled:opacity-50"
                >
                  {isLoadingLogs ? 'Fetching Records...' : 'Load More Logs'}
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modals */}
      <CustomConfirm
        isOpen={pricingConfirmOpen}
        title="Confirm Pricing Sync"
        message="Are you sure you want to synchronize the global pricing engine? This will immediately affect the recharge rates for all merchants on the platform."
        confirmText="YES, SYNCHRONIZE"
        cancelText="NO, CANCEL"
        onConfirm={handleSavePricing}
        onCancel={() => setPricingConfirmOpen(false)}
      />

      <CustomConfirm
        isOpen={globalError !== null}
        title={globalError?.title || 'Error'}
        message={globalError?.message || ''}
        confirmText="DISMISS"
        onConfirm={() => setGlobalError(null)}
        onCancel={() => setGlobalError(null)}
      />

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E3B36]/60 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#E8E3DA] flex items-center justify-between bg-[#F5F1EA]">
              <div className="flex items-center gap-3">
                <Store size={20} className="text-[#3E3B36]" />
                <h3 className="text-lg font-bold tracking-widest uppercase text-[#3E3B36]">Shop Identity Ledger</h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-[#8E8B85] hover:text-[#3E3B36] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Core Profile */}
              <div>
                <h4 className="text-[10px] font-bold text-[#8E8B85] tracking-[0.2em] uppercase mb-4 border-b border-[#E8E3DA] pb-2">Merchant Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-[#8E8B85] uppercase tracking-wider mb-1">Shop Name</p>
                    <p className="text-sm font-semibold text-[#3E3B36]">{selectedTicket.shop?.shop_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8E8B85] uppercase tracking-wider mb-1">Industry Type</p>
                    <p className="text-sm font-semibold text-[#3E3B36]">{selectedTicket.shop?.industry_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8E8B85] uppercase tracking-wider mb-1">Owner Phone</p>
                    <p className="text-sm font-mono text-[#3E3B36]">{selectedTicket.shop?.owner_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8E8B85] uppercase tracking-wider mb-1">Status</p>
                    {selectedTicket.shop?.is_blocked ? (
                      <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">Blocked</span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">Active</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Geographic Block */}
              <div>
                <h4 className="text-[10px] font-bold text-[#8E8B85] tracking-[0.2em] uppercase mb-4 border-b border-[#E8E3DA] pb-2">Geographic Node</h4>
                <div className="bg-[#F5F1EA] p-4 rounded-sm grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-[#8E8B85] uppercase tracking-wider mb-1">City / District</p>
                    <p className="text-xs font-semibold text-[#3E3B36]">
                      {selectedTicket.shop?.city || 'N/A'}, {selectedTicket.shop?.district || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8E8B85] uppercase tracking-wider mb-1">State / Country</p>
                    <p className="text-xs font-semibold text-[#3E3B36]">
                      {selectedTicket.shop?.state || 'N/A'}, {selectedTicket.shop?.country || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-[#8E8B85] uppercase tracking-wider mb-1">Full Address Line</p>
                    <p className="text-xs text-[#3E3B36]">{selectedTicket.shop?.location_address || 'Not Provided'}</p>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-[#E8E3DA] bg-[#F5F1EA] flex justify-end">
              <button 
                onClick={() => setSelectedTicket(null)}
                className="bg-[#3E3B36] text-[#F5F1EA] px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
