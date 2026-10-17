"use client";

import React from "react";
import { Header } from "../../components/Header";
import { KitchenDashboard } from "../../components/KitchenDashboard";
import { ProtectedRoute } from "../../components/ProtectedRoute";

export default function KitchenPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col font-sans">
      <Header />
      <main className="flex-1 pt-20 md:pt-24">
        <ProtectedRoute allowedRoles={["kitchen", "manager", "admin"]} pageTitle="Kitchen Staff">
          <KitchenDashboard />
        </ProtectedRoute>
      </main>
    </div>
  );
}
