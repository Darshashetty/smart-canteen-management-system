"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "../app/context/AppContext";

export const LoginPromptModal: React.FC = () => {
  const { loginPromptOpen, loginPromptMessage, dismissLoginPrompt } = useApp();

  if (!loginPromptOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm anim-fade-in-up"
      onClick={dismissLoginPrompt}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 sm:p-6 flex flex-col gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismissLoginPrompt}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <div className="flex flex-col">
            <h2
              id="login-prompt-title"
              className="font-extrabold text-base text-slate-900"
            >
              Login Required
            </h2>
            <p className="text-xs text-slate-500">{loginPromptMessage}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/login"
            onClick={dismissLoginPrompt}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span>Log In</span>
          </Link>
          <Link
            href="/login?signup=1"
            onClick={dismissLoginPrompt}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">
              person_add
            </span>
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
