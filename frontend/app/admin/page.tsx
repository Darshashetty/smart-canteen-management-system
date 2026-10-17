"use client";

import React from "react";
import { Header } from "../../components/Header";
import { AdminDashboard } from "../../components/AdminDashboard";
import { ProtectedRoute } from "../../components/ProtectedRoute";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col font-sans">
      <Header />
      <main className="flex-1 pt-20 md:pt-24">
        <ProtectedRoute allowedRoles={["admin"]} pageTitle="System Administrator">
          <AdminDashboard />
        </ProtectedRoute>
      </main>
    </div>
  );
}
