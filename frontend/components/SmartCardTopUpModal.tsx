import React, { useState } from "react";
import { useApp } from "../app/context/AppContext";

interface SmartCardTopUpModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESETS = [100, 250, 500, 1000];

/**
 * Demo "Add Money" flow for the campus smart card. No external gateway —
 * the amount is credited instantly through POST /auth/smart-card/topup.
 */
export const SmartCardTopUpModal: React.FC<SmartCardTopUpModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { currentUser, topUpSmartCard } = useApp();
  const [amount, setAmount] = useState<string>("250");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const balance = currentUser.smartCardBalance ?? 0;
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= 100000;

  const handleAddMoney = async () => {
    if (!valid) {
      setError("Enter an amount between Rs. 1 and Rs. 100000.");
      return;
    }
    setError("");
    setIsProcessing(true);
    const ok = await topUpSmartCard(parsed);
    setIsProcessing(false);
    if (ok) {
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => {
        if (!isProcessing) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-orange-600">
              add_card
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              Add Money to Smart Card
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-500 flex items-center justify-center"
            aria-label="Close top up"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Current balance
          </span>
          <span className="font-extrabold text-slate-900 text-base">
            Rs. {balance.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Top-up amount (Rs.)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setAmount(String(preset));
                  setError("");
                }}
                className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                  Number(amount) === preset
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                } disabled:opacity-60`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            disabled={isProcessing}
            placeholder="Custom amount"
            className="bg-slate-50 text-slate-900 text-sm font-semibold rounded-xl px-3 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          />
        </div>

        {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Demo recharge for the campus canteen — the amount is credited
          instantly and no real money is charged.
        </p>

        <button
          onClick={handleAddMoney}
          disabled={isProcessing || !valid}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isProcessing ? "progress_activity" : "account_balance_wallet"}
          </span>
          <span>
            {isProcessing
              ? "Adding money…"
              : valid
              ? `Add Rs. ${parsed.toFixed(2)}`
              : "Add Money"}
          </span>
        </button>
      </div>
    </div>
  );
};
