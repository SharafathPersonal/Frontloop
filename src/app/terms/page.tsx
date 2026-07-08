import React from 'react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36] py-20 px-6 sm:px-12 md:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#2C2A26] mb-4">Terms and Conditions</h1>
          <p className="text-[#8B8378] text-sm uppercase tracking-widest">True Attendly Broadcast</p>
        </div>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#2C2A26]">Clause 1: Account Terms</h2>
          <p className="text-[#5C574F] leading-relaxed">
            Merchants are completely legally responsible for acquiring explicit opt-in permissions from customer contact lists prior to broadcast.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#2C2A26]">Clause 2: Credit Lifecycle</h2>
          <p className="text-[#5C574F] leading-relaxed">
            Credits operate on prepaid metrics and carry zero expiration locks.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#2C2A26]">Clause 3: Suspensions</h2>
          <p className="text-[#5C574F] leading-relaxed">
            System admins retain active authority to trigger 'is_blocked' flags on spam compliance breaches.
          </p>
        </section>
      </div>
    </div>
  );
}
