'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface BackButtonProps {
  href?: string;
  label?: string;
}

export default function BackButton({ href, label = "Back" }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center justify-center p-2 mb-6 rounded-lg border border-[#E8E3DA] bg-white text-[#8B8378] hover:bg-[#F5F1EA] hover:text-[#3E3B36] transition-colors shadow-sm"
      title={label}
    >
      <ChevronLeft size={16} />
      <span className="sr-only">{label}</span>
    </motion.button>
  );
}
