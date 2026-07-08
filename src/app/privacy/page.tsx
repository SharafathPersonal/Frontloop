import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36] py-20 px-6 sm:px-12 md:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#2C2A26] mb-4">Privacy Policy</h1>
          <p className="text-[#8B8378] text-sm uppercase tracking-widest">True Attendly Broadcast</p>
        </div>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#2C2A26]">Section 1: Data Collection</h2>
          <p className="text-[#5C574F] leading-relaxed">
            We parse phone numbers via uploaded spreadsheets strictly processed under encrypted PostgreSQL isolation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#2C2A26]">Section 2: Data Usage</h2>
          <p className="text-[#5C574F] leading-relaxed">
            Information is never traded and strictly channeled to Meta Cloud API endpoints.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#2C2A26]">Section 3: Payment Handling</h2>
          <p className="text-[#5C574F] leading-relaxed">
            Payment Handling via Cashfree.
          </p>
        </section>
      </div>
    </div>
  );
}
