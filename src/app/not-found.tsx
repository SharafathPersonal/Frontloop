import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-[#F5F1EA] px-6 flex flex-col items-center justify-center min-h-screen">
      <div className="text-center flex flex-col items-center">
        <p className="uppercase text-[10px] tracking-[0.25em] text-[#8B8378] font-medium">
          ERROR CODE 404
        </p>
        <h1 className="serif-headline text-2xl text-[#3E3B36] font-normal tracking-tight mt-2">
          This page has dissolved into whitespace.
        </h1>
        <p className="text-sm text-[#8B8378] max-w-sm text-center mt-3 leading-relaxed">
          The reference module or campaign tracking sheet you are hunting for does not exist on this subdomain canvas.
        </p>
        
        <Link 
          href="/dashboard"
          className="bg-[#3E3B36] text-white uppercase text-xs tracking-[0.2em] py-4 px-8 mt-8 hover:bg-[#C4A896] transition-colors rounded-sm inline-block"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
