"use client";

import React from "react";
import { Header } from "../../components/Header";
import { CustomerHome } from "../../components/CustomerHome";

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col font-sans">
      <Header />
      <main className="flex-1 pt-16 md:pt-20">
        <CustomerHome />
      </main>
    </div>
  );
}