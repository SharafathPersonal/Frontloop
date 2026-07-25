'use client';

import React from 'react';
import { Database, Upload, Loader2, X, Wand2, Sparkles } from 'lucide-react';
import { ParsedContact } from './types';

interface TechnicalMatrixSectionProps {
  csvStatus: 'idle' | 'uploading' | 'parsed';
  setCsvStatus: (status: 'idle' | 'uploading' | 'parsed') => void;
  parsedContacts: ParsedContact[];
  handleSimulatedCsvUpload: () => void;
  roughText: string;
  setRoughText: (text: string) => void;
  polishedOutput: string;
  isPolishing: boolean;
  handlePolishText: () => void;
}

export function TechnicalMatrixSection({
  csvStatus,
  setCsvStatus,
  parsedContacts,
  handleSimulatedCsvUpload,
  roughText,
  setRoughText,
  polishedOutput,
  isPolishing,
  handlePolishText,
}: TechnicalMatrixSectionProps) {
  return (
    <section
      id="technical-matrix"
      className="w-full py-24 px-6 bg-[#FAF6F0] border-t border-[#E5DCD3] scroll-reveal-section font-outfit"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
          <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
            Engineering Matrix
          </span>
          <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-4">
            Advanced Ingestion &amp; Serverless AI Architecture
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            Explore the system modules built to parse records, clean raw inputs, and secure fast response times under zero Cumulative Layout Shift limits.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto gsap-reveal">
          {/* Widget B: Unified CSV Manifest Parser */}
          <div className="bg-white border border-[#E5DCD3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#5C4033]">
                <Database size={18} className="text-[#C4A896]" />
                <h3 className="font-bold text-xs uppercase tracking-wider">CSV/Excel Registry Parser</h3>
              </div>

              <p className="text-xs text-[#7A6A5E] leading-relaxed">
                Serverless-safe Excel/CSV ingest algorithms masking raw phone formats via 10-digit regex filters to protect privacy and filter anomalies.
              </p>

              {/* CSV simulator */}
              <div className="border-t pt-4 border-slate-100 space-y-3">
                {csvStatus === 'idle' && (
                  <div
                    onClick={handleSimulatedCsvUpload}
                    className="border-2 border-dashed border-[#E5DCD3] hover:border-[#5C4033] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#FAF6F0]"
                  >
                    <Upload size={20} className="mx-auto text-slate-400 mb-2" />
                    <span className="text-[9px] text-[#5C4033] block font-bold uppercase tracking-wider">
                      Drop excel/csv here
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">Click to simulate auto-parse and clean</span>
                  </div>
                )}

                {csvStatus === 'uploading' && (
                  <div className="border border-[#E5DCD3] rounded-xl p-6 text-center bg-[#FAF6F0] flex flex-col items-center justify-center">
                    <Loader2 size={20} className="text-[#C4A896] animate-spin mb-2" />
                    <span className="text-[9px] text-[#5C4033] font-bold uppercase tracking-wider">
                      Parsing raw phone formats...
                    </span>
                  </div>
                )}

                {csvStatus === 'parsed' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="text-emerald-700">Parsed 4 contacts</span>
                      <button onClick={() => setCsvStatus('idle')} className="text-slate-400 hover:text-slate-600">
                        <X size={10} />
                      </button>
                    </div>

                    <div className="max-h-[110px] overflow-y-auto space-y-1 pr-1">
                      {parsedContacts.map((contact, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 bg-[#FAF6F0] border border-[#E5DCD3] rounded text-[9px] font-mono text-slate-700"
                        >
                          <span className="truncate max-w-[80px] font-bold">{contact.name}</span>
                          <span>{contact.maskedPhone}</span>
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-1 rounded text-[7px] font-bold uppercase">
                            {contact.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-100 mt-6 block shrink-0">
              10-Digit Masking Regex Filters
            </span>
          </div>

          {/* Widget C: 1-Credit AI Polisher */}
          <div className="bg-white border border-[#E5DCD3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#5C4033]">
                <Wand2 size={18} className="text-[#C4A896]" />
                <h3 className="font-bold text-xs uppercase tracking-wider">1-Credit AI Polisher</h3>
              </div>

              <p className="text-xs text-[#7A6A5E] leading-relaxed">
                Refine raw merchant inputs into high-converting copies with strict boundary filters preventing prompt injection and token waste.
              </p>

              <div className="space-y-2 border-t pt-4 border-slate-100 text-left">
                <textarea
                  rows={2}
                  value={roughText}
                  onChange={(e) => setRoughText(e.target.value)}
                  className="w-full p-2 bg-[#FAF6F0] border border-[#E5DCD3] rounded text-[10px] font-mono leading-relaxed focus:outline-none focus:border-[#5C4033] resize-none"
                  placeholder="Enter rough copy note..."
                />
                <button
                  onClick={handlePolishText}
                  disabled={isPolishing}
                  className="w-full bg-[#5C4033] hover:bg-[#C4A896] text-white py-1.5 px-3 rounded text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-1 shadow-sm transition-colors"
                >
                  {isPolishing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Polish With AI
                </button>

                {polishedOutput && (
                  <div className="p-2 bg-[#FAF6F0] border border-[#E5DCD3] rounded text-[10px] text-slate-700 leading-relaxed font-medium">
                    <span className="block font-bold text-[8px] text-[#5C4033] uppercase tracking-widest mb-0.5">
                      Polished (Approved Format)
                    </span>
                    {polishedOutput}
                  </div>
                )}
              </div>
            </div>

            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-100 mt-6 block shrink-0">
              Maximum 300 Characters Safe Edge
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
