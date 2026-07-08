'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, X, Activity, DollarSign, Users, ShieldAlert, Zap, Calendar, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{shops: any[], campaigns: any[], payments: any[]}>({ shops: [], campaigns: [], payments: [] });
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Modals State
  const [infusionShop, setInfusionShop] = useState<any | null>(null);
  const [infusionAmount, setInfusionAmount] = useState<number | ''>('');
  
  const [auditShop, setAuditShop] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/data');
      if (res.status === 401) {
        setIsAuthenticated(false);
      } else if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

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
        fetchData(); // Refresh data
      } else {
        alert('Failed to infuse credits');
      }
    } catch (e) {
      alert('Error infusing credits');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center text-[#3E3B36] font-medium tracking-wide">INITIALIZING SECURE LINK...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center p-4">
        <div className="bg-[#FFFFFF] p-8 md:p-12 shadow-2xl rounded-sm w-full max-w-md border border-[#E8E3DA]">
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
  const totalShops = data.shops.length;
  const totalTokens = data.shops.reduce((sum, shop) => sum + (shop.wallets?.credits_remaining || 0), 0);
  const globalMessages = data.campaigns.length;

  // Monthly Activity Ledger
  // Group campaigns and payments by YYYY-MM
  const monthlyLedger: Record<string, { campaigns: number; payments: number; paymentTotal: number }> = {};
  
  data.campaigns.forEach(c => {
    const month = new Date(c.created_at).toISOString().slice(0, 7);
    if (!monthlyLedger[month]) monthlyLedger[month] = { campaigns: 0, payments: 0, paymentTotal: 0 };
    monthlyLedger[month].campaigns += 1;
  });
  data.payments.forEach(p => {
    const month = new Date(p.created_at).toISOString().slice(0, 7);
    if (!monthlyLedger[month]) monthlyLedger[month] = { campaigns: 0, payments: 0, paymentTotal: 0 };
    monthlyLedger[month].payments += 1;
    monthlyLedger[month].paymentTotal += parseFloat(p.amount);
  });
  
  const ledgerEntries = Object.entries(monthlyLedger).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36] pb-24">
      {/* Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E8E3DA] sticky top-0 z-10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert size={24} className="text-[#3E3B36]" />
          <h1 className="text-xl font-bold tracking-widest uppercase">Master Admin Base</h1>
        </div>
        <button 
          onClick={async () => {
            // Need a quick logout endpoint or just clear cookie via JS if possible. 
            // Since HTTPOnly, let's just reload to a non-existent logout route or clear UI.
            // A simple hack: window.location.href = '/' might not clear cookie.
            document.cookie = "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
          }} 
          className="text-xs uppercase tracking-wider font-semibold hover:text-black transition-colors"
        >
          Terminate Link
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Step 2: Global Analytics Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFFFFF] p-8 border border-[#E8E3DA] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={120} />
            </div>
            <p className="text-xs font-bold text-[#8E8B85] uppercase tracking-widest mb-2">Total Operational Shops</p>
            <p className="text-5xl font-light tracking-tight">{totalShops}</p>
          </div>
          <div className="bg-[#FFFFFF] p-8 border border-[#E8E3DA] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={120} />
            </div>
            <p className="text-xs font-bold text-[#8E8B85] uppercase tracking-widest mb-2">Tokens Circulating</p>
            <p className="text-5xl font-light tracking-tight">{totalTokens.toLocaleString()}</p>
          </div>
          <div className="bg-[#FFFFFF] p-8 border border-[#E8E3DA] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity size={120} />
            </div>
            <p className="text-xs font-bold text-[#8E8B85] uppercase tracking-widest mb-2">Global Message Traffic</p>
            <p className="text-5xl font-light tracking-tight">{globalMessages.toLocaleString()}</p>
          </div>
        </section>

        {/* Step 3: Merchant Management System */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold uppercase tracking-widest">Merchant Management Matrix</h2>
          </div>
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F1EA] text-[10px] uppercase tracking-widest text-[#8E8B85]">
                  <th className="p-5 font-semibold">Shop Entity</th>
                  <th className="p-5 font-semibold">Industry</th>
                  <th className="p-5 font-semibold">Date Joined</th>
                  <th className="p-5 font-semibold">Token Balance</th>
                  <th className="p-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#E8E3DA]">
                {data.shops.map(shop => {
                  const credits = shop.wallets?.credits_remaining || 0;
                  const shopCampaigns = data.campaigns.filter(c => c.shop_id === shop.id);
                  const isHighVolume = shopCampaigns.length > 20 || shopCampaigns.reduce((sum, c) => sum + c.total_recipients, 0) > 5000;
                  const isLowCredits = credits < 10;
                  
                  return (
                    <tr 
                      key={shop.id} 
                      className="hover:bg-[#FCFAFC] transition-colors group cursor-pointer"
                      onClick={() => setAuditShop(shop)}
                    >
                      <td className="p-5">
                        <div className="font-semibold text-base mb-1">{shop.shop_name}</div>
                        <div className="text-xs text-[#8E8B85] font-mono">{shop.owner_phone}</div>
                      </td>
                      <td className="p-5">
                        <span className="bg-[#F5F1EA] px-3 py-1 text-xs font-medium uppercase tracking-wider">{shop.industry_type}</span>
                      </td>
                      <td className="p-5 text-[#8E8B85] whitespace-nowrap">
                        {new Date(shop.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-medium ${isLowCredits ? 'text-red-700 font-bold' : ''}`}>
                            {credits.toLocaleString()}
                          </span>
                          {isLowCredits && <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">Low Credits Alert</span>}
                          {!isLowCredits && isHighVolume && <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">High Vol Sender</span>}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfusionShop(shop);
                          }}
                          className="bg-[#3E3B36] text-[#F5F1EA] px-4 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-black transition-colors"
                        >
                          Manage Credits
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Step 4: Monthly Activity Ledger */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold uppercase tracking-widest">Chronological Monthly Ledger</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ledgerEntries.map(([month, stats]) => (
              <div key={month} className="bg-[#FFFFFF] border border-[#E8E3DA] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-[#8E8B85]">
                  <Calendar size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">{month}</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#8E8B85] mb-1">Campaigns Fired</p>
                    <p className="text-xl font-medium">{stats.campaigns}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#8E8B85] mb-1">Infusion Events</p>
                    <p className="text-xl font-medium">{stats.payments}</p>
                  </div>
                </div>
              </div>
            ))}
            {ledgerEntries.length === 0 && (
              <div className="col-span-full bg-[#FFFFFF] p-10 text-center border border-[#E8E3DA] text-sm text-[#8E8B85] uppercase tracking-widest">
                No historical data recorded.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Credit Infusion Modal */}
      {infusionShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md border border-[#E8E3DA] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#F5F1EA] p-6 border-b border-[#E8E3DA] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Credit Infusion</h3>
                <p className="text-xs text-[#8E8B85] mt-1">Target: {infusionShop.shop_name}</p>
              </div>
              <button onClick={() => setInfusionShop(null)} className="text-[#8E8B85] hover:text-black transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInfusion} className="p-8">
              <label className="block text-xs font-medium text-[#3E3B36] tracking-wider uppercase mb-3">Amount to Inject</label>
              <input 
                type="number"
                min="1"
                value={infusionAmount}
                onChange={e => setInfusionAmount(parseInt(e.target.value) || '')}
                className="w-full bg-[#F5F1EA] text-2xl font-light text-[#3E3B36] p-4 text-center focus:outline-none focus:ring-1 focus:ring-[#3E3B36] transition-all mb-8"
                required
                autoFocus
                placeholder="0"
              />
              <button type="submit" className="w-full bg-[#3E3B36] text-[#F5F1EA] uppercase tracking-widest text-sm font-semibold py-4 hover:bg-black transition-colors">
                Confirm Infusion
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Audit Slideout Panel */}
      {auditShop && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#FFFFFF] border-l border-[#E8E3DA] shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Slideout Header */}
            <div className="p-8 border-b border-[#E8E3DA] flex items-start justify-between bg-[#F5F1EA]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8B85] mb-2 block">Comprehensive Audit</span>
                <h2 className="text-2xl font-semibold tracking-tight mb-1">{auditShop.shop_name}</h2>
                <p className="text-sm font-mono text-[#8E8B85]">{auditShop.owner_phone}</p>
              </div>
              <button onClick={() => setAuditShop(null)} className="bg-white p-2 rounded-full shadow-sm hover:scale-105 transition-transform text-[#3E3B36]">
                <X size={20} />
              </button>
            </div>

            {/* Slideout Metrics */}
            <div className="p-8 border-b border-[#E8E3DA] grid grid-cols-2 gap-6 bg-white">
              <div>
                <p className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-widest mb-1">Active Balance</p>
                <p className="text-3xl font-light text-[#3E3B36]">{(auditShop.wallets?.credits_remaining || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-widest mb-1">Total Consumed</p>
                <p className="text-3xl font-light text-[#3E3B36]">
                  {data.campaigns
                    .filter(c => c.shop_id === auditShop.id && c.status === 'completed')
                    .reduce((sum, c) => sum + (c.total_recipients || 0), 0)
                    .toLocaleString()
                  }
                </p>
              </div>
            </div>

            {/* Slideout Campaign Log */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-[#E8E3DA] pb-4">Total Campaigns Log</h3>
              
              <div className="space-y-4">
                {data.campaigns.filter(c => c.shop_id === auditShop.id).length === 0 ? (
                  <p className="text-sm text-[#8E8B85] italic">No historical campaigns detected.</p>
                ) : (
                  data.campaigns
                    .filter(c => c.shop_id === auditShop.id)
                    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(campaign => (
                      <div key={campaign.id} className="border border-[#E8E3DA] p-5 hover:bg-[#F5F1EA] transition-colors rounded-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-[#3E3B36]">{campaign.title}</h4>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${
                            campaign.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                            campaign.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#8E8B85]">
                          <span>{new Date(campaign.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span className="font-medium text-[#3E3B36]">{campaign.total_recipients} Delivered</span>
                        </div>
                      </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
