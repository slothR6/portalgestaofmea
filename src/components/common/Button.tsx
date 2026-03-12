import React from "react";

const Button: React.FC<{
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}> = ({ onClick, children, variant = "primary", className = "", disabled, type = "button" }) => {
  const variants = {
    primary:
      "bg-[#013d23] text-white shadow-[0_14px_30px_-18px_rgba(1,61,35,0.75)] hover:bg-[#02502e]",
    secondary:
      "bg-[#d5d88e] text-[#013d23] shadow-[0_14px_30px_-18px_rgba(85,96,25,0.45)] hover:bg-[#c8cf7b]",
    outline:
      "border border-[#013d23]/16 bg-white text-[#013d23] hover:border-[#013d23]/30 hover:bg-[#013d23]/5",
    danger: "bg-red-600 text-white shadow-[0_14px_30px_-18px_rgba(220,38,38,0.55)] hover:bg-red-700",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-[0.24em] hover:-translate-y-[1px] ${
        variants[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
