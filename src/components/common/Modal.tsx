import React from "react";

const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode }> = ({
  open,
  title,
  onClose,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/35 p-5 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_100px_-45px_rgba(15,23,42,0.55)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#013d23]/[0.03] px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">Portal FMEA</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="p-6 md:p-7">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
