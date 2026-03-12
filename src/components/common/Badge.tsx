import React from "react";

const Badge: React.FC<{ type: "status" | "priority"; value: string }> = ({ type, value }) => {
  const normalizedValue = value.toUpperCase().replace(/\s+/g, "_");

  const getColors = () => {
    if (type === "status") {
      switch (normalizedValue) {
        case "APROVADO":
        case "APROVADA":
        case "GANHA":
        case "CONCLUIDO":
        case "CONCLUIDA":
          return "bg-[#013d23]/10 text-[#013d23] border-[#013d23]/15";
        case "ATRASADO":
        case "RECUSADA":
        case "PERDIDA":
        case "CANCELED":
        case "CANCELADA":
          return "bg-red-50 text-red-700 border-red-200";
        case "AJUSTES":
        case "EM_ANALISE":
        case "NEGOCIACAO":
          return "bg-[#d5d88e]/45 text-[#556019] border-[#c3ca70]";
        case "REVISAO":
        case "PROPOSTA":
        case "DIAGNOSTICO":
          return "bg-emerald-50 text-emerald-800 border-emerald-200";
        case "FAZENDO":
        case "EM_ANDAMENTO":
          return "bg-teal-50 text-teal-700 border-teal-200";
        case "NOVA":
        case "QUALIFICACAO":
        case "RASCUNHO":
        case "PENDENTE":
        case "A_FAZER":
          return "bg-slate-100 text-slate-700 border-slate-200";
        default:
          return "bg-[#e5e7ea] text-slate-700 border-slate-200";
      }
    }
    switch (normalizedValue) {
      case "ALTA":
        return "bg-red-50 text-red-700 border-red-200";
      case "MEDIA":
        return "bg-[#d5d88e]/45 text-[#556019] border-[#c3ca70]";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-[0.25em] ${getColors()}`}
    >
      {value}
    </span>
  );
};

export default Badge;
