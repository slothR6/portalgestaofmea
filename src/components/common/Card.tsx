import React from "react";

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = "",
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-3xl border border-slate-200/80 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.45)] p-8 transition-all duration-300 ${
      onClick ? "cursor-pointer hover:shadow-[0_30px_70px_-40px_rgba(15,23,42,0.5)] hover:-translate-y-1" : ""
    } ${className}`}
  >
    {children}
  </div>
);

export default Card;
