"use client";

import React from "react";
import { useApp } from "../app/context/AppContext";

type BooleanPreference =
  | "vegetarianOnly"
  | "veganOnly"
  | "glutenFree"
  | "nutAllergyWarning"
  | "notifyOnReady"
  | "notifyOnDelay";

export const CustomerPreferences: React.FC = () => {
  const { preferences, updatePreferences } = useApp();

  const toggle = (field: BooleanPreference) =>
    updatePreferences({ [field]: !preferences[field] });

  return (
    <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4 pb-32 flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="font-headline text-xl sm:text-2xl font-extrabold text-slate-900">
          Preferences
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Your choices are saved to your customer account.
        </p>
      </div>

      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
        <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
          Dietary preferences
        </h2>
        <PreferenceToggle label="Vegetarian meals" description="Highlight vegetarian meals in the menu" checked={preferences.vegetarianOnly} onChange={() => toggle("vegetarianOnly")} />
        <PreferenceToggle label="Vegan meals" description="Highlight vegan meals in the menu" checked={preferences.veganOnly} onChange={() => toggle("veganOnly")} />
        <PreferenceToggle label="Gluten-free meals" description="Highlight gluten-free meals in the menu" checked={preferences.glutenFree} onChange={() => toggle("glutenFree")} />
        <PreferenceToggle label="Nut allergy warning" description="Warn when meals contain nuts or traces of nuts" checked={preferences.nutAllergyWarning} onChange={() => toggle("nutAllergyWarning")} />
      </section>

      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
        <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
          Ordering preferences
        </h2>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Preferred pickup slot
          <input type="text" value={preferences.preferredPickupSlot} onChange={(e) => updatePreferences({ preferredPickupSlot: e.target.value })} className="h-11 px-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30" placeholder="e.g. 1:15 PM - 1:30 PM" />
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Maximum daily budget
          <input type="number" min="0" step="0.01" value={preferences.maxDailyBudget} onChange={(e) => updatePreferences({ maxDailyBudget: Number(e.target.value) })} className="h-11 px-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
        </label>
      </section>

      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
        <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
          Notifications
        </h2>
        <PreferenceToggle label="Order ready alerts" description="Notify me when my order is ready for pickup" checked={preferences.notifyOnReady} onChange={() => toggle("notifyOnReady")} />
        <PreferenceToggle label="Delay alerts" description="Notify me when my order is delayed" checked={preferences.notifyOnDelay} onChange={() => toggle("notifyOnDelay")} />
      </section>
    </div>
  );
};

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const PreferenceToggle: React.FC<PreferenceToggleProps> = ({ label, description, checked, onChange }) => (
  <label className="flex items-start sm:items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0 cursor-pointer">
    <span className="flex flex-col gap-0.5">
      <span className="text-xs sm:text-sm font-bold text-slate-900">{label}</span>
      <span className="text-[11px] sm:text-xs text-slate-500">{description}</span>
    </span>
    <input type="checkbox" checked={checked} onChange={onChange} className="w-5 h-5 accent-orange-600 rounded cursor-pointer shrink-0 mt-0.5 sm:mt-0" />
  </label>
);