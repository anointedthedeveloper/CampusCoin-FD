import { assets } from '@/assets/images';

export function PageLoader() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[#e5f1e8] px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading Campus Coin"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-[#b8ddc4]" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#168c50] motion-reduce:animate-none" />
          <img src={assets.logo} alt="" className="h-14 w-14 object-contain" />
        </div>
        <p className="mt-5 text-sm font-extrabold tracking-[0.14em] text-[#176c42]">CAMPUS COIN</p>
        <p className="mt-1 text-sm text-[#5c7568]">Getting your campus wallet ready</p>
      </div>
    </main>
  );
}
