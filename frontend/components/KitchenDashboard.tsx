"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "../app/context/AppContext";
import { OrderStatus } from "../app/types";
import { collectionAPI, orderAPI } from "../app/lib/api";

export const KitchenDashboard: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    menu,
    toggleItemStatus,
    showToast,
    slots,
    refreshSlots,
  } = useApp();

  const [scanTokenInput, setScanTokenInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("Active");
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    order?: any;
  } | null>(null);
  const [pendingCollection, setPendingCollection] = useState<{
    confirmation: { token_number?: string; order_id?: string };
    order: any;
  } | null>(null);

  // Sourced from shared context state so socket `pickup_slots_updated` events
  // refresh capacity in real time without a manual reload.
  const pickupSlots = useMemo(
    () =>
      slots.map((s) => ({
        slot: s.timeSlot,
        booked: s.currentOrders,
        remaining: Math.max(0, s.maxCapacity - s.currentOrders),
        capacity: s.maxCapacity,
        status: s.status || (s.isAvailable ? "Available" : "Full"),
      })),
    [slots]
  );

  const refreshPickupSlots = async () => {
    try {
      await refreshSlots();
    } catch (error) {
      showToast(`⚠️ ${error instanceof Error ? error.message : "Could not load pickup slots."}`);
    }
  };

  const clearPickupSlot = async (slot: string) => {
    try {
      await orderAPI.clearPickupSlot(slot);
      showToast(`✅ Slot ${slot} is empty and available again.`);
      await refreshSlots();
    } catch (error) {
      showToast(`⚠️ ${error instanceof Error ? error.message : "Slot could not be cleared."}`);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === "Active")
      return ["Placed", "Accepted", "Preparing", "Ready"].includes(o.status);
    if (selectedFilter === "Preparing") return o.status === "Preparing";
    if (selectedFilter === "Ready") return o.status === "Ready";
    if (selectedFilter === "Completed")
      return ["Collected", "Completed"].includes(o.status);
    return true;
  });

  const performVerification = async (value: string) => {
    const tokenOrId = value.trim();
    if (!tokenOrId) return;

    let lookup: { token_number?: string; order_id?: string; qr_payload?: string };
    try {
      const qrPayload = JSON.parse(tokenOrId);
      lookup =
        qrPayload.token || qrPayload.order_id
          ? { qr_payload: JSON.stringify(qrPayload) }
          : {};
    } catch {
      // Token numbers look like C-023 (case-insensitive); everything else
      // (ORD-... order IDs or 24-hex Mongo IDs) is sent as an order identifier.
      lookup = /^c-\d+$/i.test(tokenOrId)
        ? { token_number: tokenOrId.toUpperCase() }
        : { order_id: tokenOrId };
    }

    if (!lookup.token_number && !lookup.order_id && !lookup.qr_payload) return;

    try {
      const verification = await collectionAPI.verify(lookup);
      if (!verification.can_collect) {
        const message = verification.message || "Order is not ready for collection.";
        setPendingCollection(null);
        setVerificationResult({ success: false, message, order: verification.data });
        showToast(`⚠️ ${message}`);
        return;
      }

      setPendingCollection({
        confirmation: { order_id: verification.data.order_id },
        order: verification.data
      });
      setVerificationResult({
        success: true,
        message: `Token ${verification.data.token_number} verified. Check the food before handing it over.`,
        order: verification.data,
      });
      setScanTokenInput("");
    } catch (err: any) {
      const message =
        err?.message || "Could not verify this order. Check the token or QR code and try again.";
      setPendingCollection(null);
      setVerificationResult({ success: false, message });
      showToast(`⚠️ ${message}`);
    }
    setScanTokenInput("");
  };

  const confirmPendingCollection = async () => {
    if (!pendingCollection) return;

    try {
      const res = await collectionAPI.confirm(pendingCollection.confirmation);
      showToast(`✅ Food handed over for token ${res.data.token_number}.`);
      updateOrderStatus(res.data._id || res.data.order_id, "Completed", { skipBackend: true });
      setVerificationResult({
        success: true,
        message: `Food handed over. Token ${res.data.token_number} is completed.`,
        order: res.data,
      });
      setPendingCollection(null);
    } catch (err: any) {
      const message = err.message || "Collection failed. The order may already be collected.";
      setVerificationResult({ success: false, message, order: pendingCollection.order });
      showToast(`⚠️ ${message}`);
    }
  };

  const handleVerifyQRScan = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(scanTokenInput);
  };

  const simulateOpticalScan = (token: string) => {
    setIsScanningSimulated(true);
    setTimeout(() => {
      setIsScanningSimulated(false);
      performVerification(token);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4 pb-32 flex flex-col gap-4 sm:gap-6">
      {/* Optical / Digital Scanner Modal */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <span className="material-symbols-outlined text-[24px]">
                    qr_code_scanner
                  </span>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-extrabold text-white">
                    Collection Counter Digital Scanner
                  </h3>
                  <p className="text-xs text-slate-400">
                    Scan Customer QR or Enter Token Number (e.g. C-023)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsScannerModalOpen(false);
                  setVerificationResult(null);
                  setPendingCollection(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Live Camera / Scanner Viewport View */}
            <div className="relative w-full h-56 bg-slate-950 rounded-2xl border-2 border-dashed border-emerald-500/40 flex flex-col items-center justify-center p-4 overflow-hidden">
              {/* Laser Animation Bar */}
              <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-10 laser-scanner-line shadow-[0_0_15px_#10b981]"></div>

              {isScanningSimulated ? (
                <div className="flex flex-col items-center gap-2 text-emerald-400 animate-pulse">
                  <span className="material-symbols-outlined text-[44px]">
                    document_scanner
                  </span>
                  <span className="text-xs font-mono font-bold">
                    DECODING DIGITAL TOKEN QR...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-28 h-28 border border-slate-700/60 rounded-xl flex items-center justify-center p-2 bg-slate-900/50">
                    <span className="material-symbols-outlined text-[40px] text-slate-600">
                      qr_code_2
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    Scan the customer QR, then check the food before handover
                  </span>
                </div>
              )}
            </div>

            {/* Quick One-Click Simulated Scans for Live Demo */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Demo Tokens in Queue:
                </span>
                <div className="flex flex-wrap gap-2">
                  {orders.filter((o) => o.status === "Ready").slice(0, 4).map((ord) => (
                    <button
                      key={ord.id}
                      onClick={() => simulateOpticalScan(ord.tokenNumber)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 border border-slate-700 text-xs font-mono font-bold transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        qr_code
                      </span>
                      Scan {ord.tokenNumber} ({ord.status})
                    </button>
                  ))}
                  {orders.every((o) => o.status !== "Ready") && (
                    <span className="text-xs text-slate-500">
                      No orders are Ready for collection yet.
                    </span>
                  )}
                </div>
              </div>

            {/* Manual Entry Form */}
            <form onSubmit={handleVerifyQRScan} className="flex gap-2">
              <input
                type="text"
                value={scanTokenInput}
                onChange={(e) => setScanTokenInput(e.target.value)}
                placeholder="Type Token (e.g. C-023 or Order ID)..."
                className="flex-1 h-11 px-4 bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-sm font-mono outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-5 h-11 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-900/30 shrink-0"
              >
                Check Order
              </button>
            </form>

            {/* Verification Alert Banner */}
            {verificationResult && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold border flex items-start gap-3 ${
                  verificationResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">
                  {verificationResult.success ? "check_circle" : "error"}
                </span>
                <div className="flex flex-col gap-1">
                  <span>{verificationResult.message}</span>
                  {verificationResult.order && (
                    <div className="text-[11px] text-slate-300 font-normal mt-2 space-y-1">
                      <div>
                        Customer: {verificationResult.order.customer_name} • Total: Rs.{" "}
                        {Number(verificationResult.order.total_amount || 0).toFixed(2)}
                      </div>
                      <div className="font-semibold text-white">Food to hand over:</div>
                      {verificationResult.order.items?.map((item: any) => (
                        <div key={item.order_item_id || item.item_id} className="flex justify-between gap-4">
                          <span>{item.quantity} × {item.item_name}</span>
                          <span>Rs. {Number(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendingCollection && verificationResult.success && (
                    <button
                      type="button"
                      onClick={confirmPendingCollection}
                      className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-500"
                    >
                      Give Food & Confirm Collection
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kitchen Banner Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 flex flex-col gap-3 md:flex-row items-start md:items-center justify-between md:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[28px]">
              soup_kitchen
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold text-white font-headline">
                Kitchen Staff Display & Queue
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Socket.io Live Sync
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Counter Station B — Hot Express Griddle
            </span>
          </div>
        </div>

        {/* Dedicated Digital Scanner Button */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">
              qr_code_scanner
            </span>
            <span>Open Digital Token / QR Scanner</span>
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Today&apos;s Pickup Slots</h2>
            <p className="text-xs text-slate-500">Completed orders free capacity automatically.</p>
          </div>
          <button
            type="button"
            onClick={refreshPickupSlots}
            className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pickupSlots.map((slot) => (
            <div key={slot.slot} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{slot.slot}</span>
                <span className={`text-[10px] font-bold ${slot.status === "Full" ? "text-red-600" : "text-emerald-600"}`}>
                  {slot.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {slot.booked}/{slot.capacity} booked · {slot.remaining} available
              </div>
              <button
                type="button"
                onClick={() => clearPickupSlot(slot.slot)}
                disabled={slot.booked === 0}
                className="mt-3 w-full rounded-lg bg-orange-100 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Slot
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Main Grid: Queue & Menu Availability Toggle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Live Orders Queue */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Live Kitchen Queue
              </h2>
              <span className="bg-orange-100 text-orange-800 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                {filteredOrders.length} Orders
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {["Active", "Preparing", "Ready", "Completed"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedFilter(tab)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    selectedFilter === tab
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 text-slate-400">
              <span className="material-symbols-outlined text-[48px] text-slate-300 mb-2">
                check_circle
              </span>
              <p className="font-bold text-slate-700 text-sm">
                No orders in this queue filter
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* Status Banner Stripe */}
                  <div
                    className={`h-1.5 w-full absolute top-0 left-0 right-0 ${
                      order.status === "Ready"
                        ? "bg-emerald-500"
                        : order.status === "Preparing"
                        ? "bg-orange-500"
                        : "bg-blue-500"
                    }`}
                  ></div>

                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-orange-400 font-extrabold text-base flex items-center justify-center font-headline shadow-md">
                        {order.tokenNumber}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {order.customerName}
                        </span>
                        <span className="text-xs text-slate-500">
                          Ordered: {order.orderTime} • Pickup Slot:{" "}
                          <strong className="text-slate-900">
                            {order.pickupSlot}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          order.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.paymentStatus === "Failed"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : order.paymentStatus === "Refunded"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {order.paymentStatus === "Paid" ? "✓ Paid" : "⏳ " + (order.paymentStatus || "Pending")}
                      </span>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          order.status === "Ready"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.status === "Preparing"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col gap-2 border border-slate-100">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col pb-1.5 border-b border-slate-200/60 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span>Rs. {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.specialInstruction && (
                          <div className="mt-1 bg-amber-50 text-amber-900 px-2 py-1 rounded text-[11px] font-semibold border border-amber-200/60 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-amber-700">
                              edit_note
                            </span>
                            <span>
                              Special Note: "{item.specialInstruction}"
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Kitchen Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => updateOrderStatus(order.id, "Delayed")}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        report_problem
                      </span>
                      <span>Report Issue / Delay</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === "Placed" && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, "Rejected")}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 text-xs font-bold transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, "Accepted")}
                            className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-all"
                          >
                            Accept Order
                          </button>
                        </>
                      )}

                      {order.status === "Accepted" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Preparing")}
                          className="px-4 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-sm hover:bg-orange-700 transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            skillet
                          </span>
                          <span>Start Preparation</span>
                        </button>
                      )}

                      {order.status === "Preparing" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Ready")}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            notifications_active
                          </span>
                          <span>Mark Order Ready</span>
                        </button>
                      )}

                      {order.status === "Ready" && (
                        <button
                          onClick={() => {
                            setIsScannerModalOpen(true);
                            performVerification(order.tokenNumber);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm hover:bg-slate-800 transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            task_alt
                          </span>
                          <span>Confirm Collection</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Food Item Sold Out Controls */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Menu Item Availability
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Live Toggle
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Kitchen staff can instantly toggle items as Sold Out when stock runs out.
            </p>

            <div className="divide-y divide-slate-100 mt-1">
              {menu.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Stock: {item.availableQuantity} Left
                    </span>
                  </div>

                  <button
                    onClick={() => toggleItemStatus(item.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      item.status === "Available"
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {item.status === "Available" ? "Available" : "Sold Out"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
