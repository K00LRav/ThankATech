"use client";

interface AppreciationActionsProps {
  onThankYou: () => void;
  onSendTOA: () => void;
  technicianName: string;
}

export function AppreciationActions({ onThankYou, onSendTOA, technicianName }: AppreciationActionsProps) {
  return (
    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/30 space-y-4 shadow-xl">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">🙏</span>
        </div>
        Show Appreciation
      </h3>
      
      {/* PRIMARY ACTION: Thank You - Brand-aligned */}
      <button
        onClick={onThankYou}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 group"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-lg">🙏</span>
          </div>
          <div className="text-left">
            <div className="font-bold">Say Thank You</div>
            <div className="text-xs text-blue-200">Show {technicianName.split(' ')[0]} appreciation</div>
          </div>
        </div>
      </button>
      
      {/* SECONDARY ACTION: TOA - Subtle and optional */}
      <button
        onClick={onSendTOA}
        className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 border border-white/30 hover:border-white/40 group"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="font-bold text-sm">💝</span>
          </div>
          <div className="text-left">
            <div className="font-medium">Send TOA Token</div>
            <div className="text-xs text-white/70">Optional monetary appreciation</div>
          </div>
        </div>
      </button>

      {/* Simple explanation - brand-aligned */}
      <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-xl border border-blue-400/20">
        <p className="text-xs text-slate-300 leading-relaxed text-center">
          <strong className="text-blue-200">ThankATech</strong> is about gratitude first. 
          Say thank you to show appreciation, or send a TOA token for extra support.
        </p>
      </div>
    </div>
  );
}