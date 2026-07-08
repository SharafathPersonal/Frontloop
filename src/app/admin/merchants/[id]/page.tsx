'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Building, ShieldAlert, Zap, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { Spinner } from '@/components/ui/Spinner';

export default function MerchantLedgerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [shop, setShop] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [totalConsumed, setTotalConsumed] = useState(0);

  // Infusion State
  const [infusionAmount, setInfusionAmount] = useState<number | ''>('');
  const [isInfusing, setIsInfusing] = useState(false);
  const [infusionConfirmOpen, setInfusionConfirmOpen] = useState(false);

  // Suspend State
  const [isSuspending, setIsSuspending] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);

  useEffect(() => {
    fetchMerchantDetails();
  }, [id]);

  const fetchMerchantDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/merchants/${id}`);
      if (res.ok) {
        const json = await res.json();
        setShop(json.shop);
        setCampaigns(json.campaigns || []);
        setTotalConsumed(json.totalConsumed || 0);
      } else {
        router.push('/admin');
      }
    } catch (e) {
      console.error(e);
      router.push('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const executeInfusion = async () => {
    setInfusionConfirmOpen(false);
    setIsInfusing(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: id, amount: Number(infusionAmount) })
      });
      if (res.ok) {
        setInfusionAmount('');
        await fetchMerchantDetails();
      } else {
        alert('Failed to infuse credits');
      }
    } catch (e) {
      alert('Error infusing credits');
    } finally {
      setIsInfusing(false);
    }
  };

  const executeSuspendToggle = async () => {
    setSuspendConfirmOpen(false);
    setIsSuspending(true);
    try {
      const newStatus = !shop.is_blocked;
      const res = await fetch(`/api/admin/merchants/${id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: newStatus })
      });
      if (res.ok) {
        setShop({ ...shop, is_blocked: newStatus });
      } else {
        alert('Failed to update suspension status');
      }
    } catch (e) {
      alert('Error updating status');
    } finally {
      setIsSuspending(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center text-[#3E3B36] font-medium tracking-wide">PULLING MERCHANT LEDGER...</div>;
  }

  if (!shop) return null;

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36]">
      
      {/* Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E8E3DA] p-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin')}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-[#E8E3DA] hover:bg-[#F5F1EA] transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-[#3E3B36]">{shop.shop_name}</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8B8378] font-mono mt-1">ID: {shop.id}</p>
          </div>
          {shop.is_blocked && (
            <div className="ml-auto bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert size={14} /> SUSPENDED
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">

        {/* SECTION A: GEOGRAPHICAL CARD & FINANCIAL COUNTERS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Profile Details Block */}
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] p-8 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E8E3DA]">
              <Building size={18} className="text-[#C4A896]" />
              <h2 className="text-sm font-semibold uppercase tracking-widest">Merchant Identity</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8E8B85] mb-1">Owner Contact</p>
                  <p className="text-sm font-medium">{shop.owner_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8E8B85] mb-1">Official Number</p>
                  <p className="text-sm font-medium">{shop.contact_number || 'Unregistered'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8E8B85] mb-1">Industry</p>
                  <p className="text-sm font-medium">{shop.industry_type}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8E8B85] mb-2">
                  <MapPin size={12} /> Geographic Coordinates
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[#8E8B85] mb-0.5">City / Locality</p>
                    <p className="text-sm">{shop.city || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[#8E8B85] mb-0.5">District</p>
                    <p className="text-sm">{shop.district || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[#8E8B85] mb-0.5">State</p>
                    <p className="text-sm">{shop.state || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[#8E8B85] mb-0.5">Country</p>
                    <p className="text-sm">{shop.country || '—'}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#E8E3DA]">
                  <p className="text-[9px] uppercase tracking-widest text-[#8E8B85] mb-0.5">Raw Address String</p>
                  <p className="text-xs">{shop.location_address || 'Not Provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Status Grid */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="bg-[#3E3B36] text-[#F5F1EA] border border-[#3E3B36] p-6 shadow-sm flex-1 flex flex-col justify-center relative overflow-hidden group">
              <Zap className="absolute top-6 right-6 opacity-10" size={48} />
              <p className="text-[10px] font-bold text-[#F5F1EA]/50 uppercase tracking-widest mb-2">Active Wallet Balance</p>
              <p className="text-4xl font-light tracking-tight">{(shop.wallets?.credits_remaining || 0).toLocaleString()}</p>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E8E3DA] p-6 shadow-sm flex-1 flex flex-col justify-center relative overflow-hidden group">
              <Activity className="absolute top-6 right-6 opacity-5" size={48} />
              <p className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-widest mb-2">Total Consumed Tokens</p>
              <p className="text-4xl font-light tracking-tight">{totalConsumed.toLocaleString()}</p>
            </div>
          </div>

        </section>


        {/* SECTION B: INLINE MANUAL INFUSION ENGINE & BLOCK ACTION CONTROLS */}
        <section className="bg-[#FFFFFF] border border-[#E8E3DA] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E8E3DA]">
            <ShieldAlert size={18} className="text-[#3E3B36]" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">Administrative Control Engine</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Manual Infusion */}
            <div className="bg-[#F5F1EA] p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-[#3E3B36]">Manual Credit Infusion</h3>
              <p className="text-xs text-[#8B8378] mb-4">Discretionary adjustments are executed instantly and bypass the payment gateway ledger.</p>
              <div className="flex items-center gap-3">
                <input 
                  type="number"
                  min="1"
                  value={infusionAmount}
                  onChange={e => setInfusionAmount(parseInt(e.target.value) || '')}
                  className="flex-1 bg-[#FFFFFF] text-sm text-[#3E3B36] px-4 py-3 border border-[#E8E3DA] focus:outline-none focus:border-[#3E3B36] transition-colors"
                  placeholder="Enter token amount..."
                  disabled={isInfusing}
                />
                <button 
                  onClick={() => {
                    if (infusionAmount && Number(infusionAmount) > 0) {
                      setInfusionConfirmOpen(true);
                    }
                  }}
                  disabled={isInfusing || !infusionAmount}
                  className="bg-[#3E3B36] text-[#F5F1EA] px-6 py-3 text-xs uppercase tracking-widest font-semibold hover:bg-black transition-colors disabled:opacity-50"
                >
                  {isInfusing ? 'EXECUTING...' : 'INFUSE'}
                </button>
              </div>
            </div>

            {/* Suspension Control */}
            <div className="p-6 border border-[#E8E3DA]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-[#3E3B36]">Security & Access Protocol</h3>
              <p className="text-xs text-[#8B8378] mb-6">Revoking access restricts API dispatching immediately. The merchant will not be able to log in or operate campaigns.</p>
              
              <button 
                onClick={() => setSuspendConfirmOpen(true)}
                disabled={isSuspending}
                className={`w-full py-4 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
                  shop.is_blocked 
                    ? 'bg-[#C4A896] text-[#FFFFFF] hover:bg-[#b09684]' 
                    : 'bg-[#3E3B36] text-[#FFFFFF] hover:bg-black'
                }`}
              >
                {isSuspending ? 'EXECUTING PROTOCOL...' : shop.is_blocked ? 'REVOKE SUSPENSION & ACTIVATE' : 'SUSPEND MERCHANT ACCESS'}
              </button>
            </div>

          </div>
        </section>

        {/* SECTION C: CAMPAIGN HISTORICAL PERFORMANCE MATRIX */}
        <section className="bg-[#FFFFFF] border border-[#E8E3DA] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E8E3DA]">
            <Activity size={18} className="text-[#3E3B36]" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">Campaign Historical Matrix</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F1EA] text-[10px] uppercase tracking-widest text-[#8E8B85]">
                  <th className="p-4 font-semibold">Dispatch Record</th>
                  <th className="p-4 font-semibold">Timestamp</th>
                  <th className="p-4 font-semibold">Delivery Volume</th>
                  <th className="p-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#E8E3DA]">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[10px] uppercase tracking-widest text-[#8B8378]">
                      No broadcast dispatches detected for this merchant.
                    </td>
                  </tr>
                ) : (
                  campaigns.map(camp => (
                    <tr key={camp.id} className="hover:bg-[#FCFAFC] transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-sm mb-0.5 text-[#3E3B36]">{camp.title}</div>
                        <div className="text-[10px] text-[#8E8B85] truncate max-w-xs">{camp.message_body}</div>
                      </td>
                      <td className="p-4 text-[11px] font-mono text-[#8B8378]">
                        {new Date(camp.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 font-medium text-[#3E3B36]">{camp.total_recipients}</td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${
                          camp.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                          camp.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Modals */}
      <CustomConfirm
        isOpen={infusionConfirmOpen}
        title="Confirm Discretionary Infusion"
        message={`Are you sure you want to permanently inject ${infusionAmount} tokens into the ledger for ${shop.shop_name}?`}
        confirmText="EXECUTE INFUSION"
        requireInput="CONFIRM"
        onConfirm={executeInfusion}
        onCancel={() => setInfusionConfirmOpen(false)}
      />

      <CustomConfirm
        isOpen={suspendConfirmOpen}
        title={shop.is_blocked ? "Revoke Merchant Suspension" : "Suspend Merchant Identity"}
        message={
          shop.is_blocked 
            ? `Are you sure you want to reactivate ${shop.shop_name}? They will immediately regain operational access.`
            : `Are you sure you want to suspend ${shop.shop_name}? All API broadcasts will be blocked immediately.`
        }
        confirmText={shop.is_blocked ? "ACTIVATE" : "SUSPEND"}
        requireInput={shop.shop_name}
        onConfirm={executeSuspendToggle}
        onCancel={() => setSuspendConfirmOpen(false)}
      />

    </div>
  );
}
