import React from "react";

const Badge: React.FC<{ type: "status" | "priority"; value: string }> = ({ type, value }) => {
  const getColors = () => {
    if (type === "status") {
      switch (value) {
        case "APROVADO":
          return "bg-emerald-100/70 text-emerald-700 border-emerald-200";
        case "ATRASADO":
          return "bg-red-100/70 text-red-700 border-red-200";
        case "AJUSTES":
          return "bg-amber-100/70 text-amber-700 border-amber-200";
        case "REVISAO":
          return "bg-blue-100/70 text-blue-700 border-blue-200";
        case "FAZENDO":
          return "bg-indigo-100/70 text-indigo-700 border-indigo-200";
        default:
          return "bg-slate-100 text-slate-700 border-slate-200";
      }
    }
    switch (value) {
      case "ALTA":
        return "bg-red-100/70 text-red-700 border-red-200";
      case "MEDIA":
        return "bg-amber-100/70 text-amber-700 border-amber-200";
      default:
        return "bg-sky-100/70 text-sky-700 border-sky-200";
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-[0.25em] ${getColors()}`}>
      {value}
    </span>
  );
};

export default Badge;
