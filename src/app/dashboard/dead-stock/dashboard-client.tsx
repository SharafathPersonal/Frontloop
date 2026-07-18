'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, Search, Filter, Share2, Download, CheckCircle, XCircle, MoreVertical, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getMerchantShops, getDashboardInventory, toggleProductClearedStatus } from './actions';

export function DashboardClient() {
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadShops() {
      const fetchedShops = await getMerchantShops();
      setShops(fetchedShops);
      if (fetchedShops.length > 0) {
        setSelectedShopId(fetchedShops[0].id);
      }
    }
    loadShops();
  }, []);

  useEffect(() => {
    async function loadInventory() {
      if (!selectedShopId) return;
      setLoading(true);
      const data = await getDashboardInventory(selectedShopId);
      setInventory(data);
      setLoading(false);
    }
    loadInventory();
  }, [selectedShopId]);

  const handleToggleCleared = async (productId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Optimistic UI update
    setInventory(prev => prev.map(p => p.id === productId ? { ...p, is_cleared: newStatus } : p));
    const result = await toggleProductClearedStatus(productId, newStatus);
    if (!result.success) {
      // Revert on failure
      setInventory(prev => prev.map(p => p.id === productId ? { ...p, is_cleared: currentStatus } : p));
      alert('Failed to update status');
    }
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 80;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        ctx.fillStyle = '#5C4033';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Scan for Dead Stock Deals', canvas.width / 2, canvas.height - 20);
      }
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Shop-${selectedShopId}-DeadStock-QR.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const filteredInventory = inventory.filter(item => 
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeShop = shops.find(s => s.id === selectedShopId);
  const publicUrl = `https://trueattendenly.online/broadcast/dead-stock?shopId=${selectedShopId}`;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-outfit p-6 lg:p-10">
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Multi-Shop Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-[#E5DCD3]">
          <div>
            <h1 className="text-2xl font-bold text-[#2D1E17]">Dead Stock Liquidation</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your clearance inventory and WhatsApp broadcasts.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-64">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm font-semibold text-[#5C4033] appearance-none focus:outline-none focus:border-[#C4A896] cursor-pointer"
              >
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.shop_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Inventory Table Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5DCD3] overflow-hidden flex flex-col h-[700px]">
              {/* Table Toolbar */}
              <div className="p-4 border-b border-[#E5DCD3] flex flex-col sm:flex-row justify-between gap-4 bg-[#FCFBF9]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5DCD3] rounded-lg text-sm focus:outline-none focus:border-[#5C4033]"
                  />
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-[#E5DCD3] rounded-lg text-sm font-semibold text-slate-600 flex items-center gap-2 hover:bg-slate-50">
                    <Filter size={16} /> Filter
                  </button>
                  <button className="px-4 py-2 bg-[#5C4033] text-white rounded-lg text-sm font-bold tracking-wide shadow-md hover:bg-[#4A332A] transition-colors">
                    + Add New Item
                  </button>
                </div>
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#FAF6F0] text-slate-500 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Pricing</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Mark Cleared</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DCD3]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading inventory...</td>
                      </tr>
                    ) : filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No products found in this shop.</td>
                      </tr>
                    ) : (
                      filteredInventory.map((item) => {
                        const statusMessage = encodeURIComponent(`🚨 *CLEARANCE ALERT* 🚨\n\n*${item.product_name}*\nOriginal: ~₹${parseFloat(item.original_price)}~\n*Clearance: ₹${parseFloat(item.clearance_price)}* (${item.discount_percentage}% OFF!)\n\n📍 Available at ${activeShop?.shop_name}\nGrab it before it's gone! 👇\n${publicUrl}`);
                        const waStatusIntent = `https://wa.me/?text=${statusMessage}`;

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.is_cleared ? 'opacity-50 grayscale' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                  {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" /> : <Store size={20} className="m-auto h-full text-slate-300" />}
                                </div>
                                <div>
                                  <p className="font-bold text-[#2D1E17] max-w-[150px] truncate" title={item.product_name}>{item.product_name}</p>
                                  <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">{item.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-emerald-600">₹{parseFloat(item.clearance_price).toLocaleString()}</span>
                                <span className="text-xs text-slate-400 line-through">₹{parseFloat(item.original_price).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {item.is_cleared ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">
                                  <CheckCircle size={12} /> Cleared
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                                  <ShieldAlert size={12} /> Active Live
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={item.is_cleared}
                                  onChange={() => handleToggleCleared(item.id, item.is_cleared)}
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!item.is_cleared && (
                                  <a 
                                    href={waStatusIntent}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors border border-transparent hover:border-[#25D366]/20"
                                    title="Share to WhatsApp Status"
                                  >
                                    <Share2 size={16} />
                                  </a>
                                )}
                                <button className="p-2 text-slate-400 hover:text-[#5C4033] hover:bg-slate-100 rounded-lg transition-colors">
                                  <MoreVertical size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Modules */}
          <div className="space-y-6">
            
            {/* In-Store QR Code Module */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5DCD3] flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-rose-400" />
              
              <h3 className="font-bold text-[#2D1E17] mb-2 mt-2">In-Store QR Code</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Print and paste this inside your shop. Walk-in customers can scan to view your real-time dead stock deals directly.
              </p>

              <div className="p-4 bg-white border-2 border-dashed border-[#E5DCD3] rounded-2xl mb-6 relative group" ref={qrRef}>
                {selectedShopId ? (
                  <QRCodeSVG 
                    value={publicUrl}
                    size={160}
                    bgColor={"#ffffff"}
                    fgColor={"#5C4033"}
                    level={"H"}
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[160px] h-[160px] bg-slate-100 flex items-center justify-center text-slate-300">
                    <Store size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button onClick={downloadQR} className="px-4 py-2 bg-[#5C4033] text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2">
                     <Download size={14} /> Save PNG
                   </button>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                <button 
                  onClick={downloadQR}
                  className="w-full py-3 bg-[#FAF6F0] hover:bg-[#E5DCD3] text-[#5C4033] font-bold text-xs tracking-wider uppercase rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download QR Print PDF
                </button>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-left">
                  <p className="text-[10px] text-blue-800 font-semibold flex items-start gap-1.5">
                    <ShieldAlert size={12} className="shrink-0 mt-0.5" />
                    Scanning this auto-filters the public marketplace to show ONLY your inventory. Keep customers focused on your deals.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats / Info */}
            <div className="bg-[#5C4033] text-white p-6 rounded-2xl shadow-sm border border-[#4A332A] relative overflow-hidden">
               <div className="absolute -bottom-6 -right-6 text-white/5">
                 <Store size={120} />
               </div>
               <h3 className="font-bold text-sm tracking-widest uppercase mb-4 text-[#C4A896]">Active Pipeline</h3>
               <div className="space-y-4 relative z-10">
                 <div>
                   <p className="text-3xl font-black">{inventory.filter(i => !i.is_cleared).length}</p>
                   <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Live Products</p>
                 </div>
                 <div className="h-px bg-white/10" />
                 <div>
                   <p className="text-xl font-bold">₹{inventory.filter(i => !i.is_cleared).reduce((sum, i) => sum + parseFloat(i.clearance_price), 0).toLocaleString()}</p>
                   <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Total Liquidation Value</p>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
