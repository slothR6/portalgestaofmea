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
      "bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/30 hover:from-slate-800 hover:via-blue-800 hover:to-blue-500",
    secondary: "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20",
    outline: "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-[0.3em] shadow-sm hover:shadow-md ${
        variants[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
