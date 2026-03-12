import React from "react";

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = "",
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-[28px] border border-slate-200/90 shadow-[0_30px_70px_-55px_rgba(15,23,42,0.55)] p-8 transition-all duration-300 ${
      onClick ? "cursor-pointer hover:border-[#013d23]/15 hover:shadow-[0_34px_90px_-60px_rgba(1,61,35,0.45)] hover:-translate-y-1" : ""
    } ${className}`}
  >
    {children}
  </div>
);

export default Card;
