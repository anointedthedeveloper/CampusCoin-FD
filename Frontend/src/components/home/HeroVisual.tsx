import { ShieldCheck } from 'lucide-react';

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[380px] pb-6 pt-2 sm:max-w-[440px] sm:pb-8 lg:max-w-none">
      <div className="absolute -inset-3 -z-10 rounded-[3rem] bg-gradient-to-br from-[#bfe8b8] via-[#a9d9a4] to-[#7cc278] sm:-inset-5" />

      <div className="animate-fade-in-up overflow-hidden rounded-tl-[3.5rem] rounded-tr-2xl rounded-bl-2xl rounded-br-[3.5rem] shadow-xl shadow-[#16603e]/10 [animation-delay:150ms]">
        <img
          src="/hero-illustration.png"
          alt="A student checking their Campus Coin balance and spending trend on a laptop"
          className="h-[280px] w-full object-cover sm:h-[340px] lg:h-[420px]"
        />
      </div>

      <div className="absolute inset-x-0 bottom-1 mx-auto flex w-max animate-fade-in-up items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-[11px] font-bold text-[#1d3d2d] shadow-md shadow-black/10 [animation-delay:500ms] sm:bottom-3">
        <ShieldCheck className="h-3.5 w-3.5 text-[#1c8f53]" />
        Private
        <span className="text-gray-300">&middot;</span>
        Simple
        <span className="text-gray-300">&middot;</span>
        Free
      </div>
    </div>
  );
}
