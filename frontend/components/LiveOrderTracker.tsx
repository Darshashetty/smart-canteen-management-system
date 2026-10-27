import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../app/context/AppContext";
import { mapBackendOrder, orderAPI } from "../app/lib/api";
import { Order, OrderStatus } from "../app/types";

export const LiveOrderTracker: React.FC = () => {
  const router = useRouter();
  const { activeOrder: contextOrder, updateOrderStatus } = useApp();
  const [qrFallback, setQrFallback] = useState<{ id?: string; qr?: string }>({});
  const [localQr, setLocalQr] = useState<{ id?: string; qr?: string }>({});
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [scanNotice, setScanNotice] = useState("");
  // Phone cameras open the QR link with ?order=ORD-...&token=C-023 — show
  // exactly that order (owned by this account), not just the active one.
  const activeOrder = scannedOrder ?? contextOrder;
  const orderId = activeOrder?.id;
  const orderTokenNumber = activeOrder?.tokenNumber;
  const hasQr = Boolean(activeOrder?.qrCode);
  // While an order is being confirmed by the server it temporarily carries an
  // optimistic local id ("ord-...") that the API cannot resolve. Only ask the
  // backend for a QR once the real ObjectId / ORD- id is available.
  const isBackendOrderId = Boolean(
    orderId && (/^[a-f0-9]{24}$/i.test(orderId) || orderId.startsWith("ORD-"))
  );

  useEffect(() => {
    const scannedId = new URLSearchParams(window.location.search).get("order");
    if (!scannedId || contextOrder?.id === scannedId || scannedOrder?.id === scannedId) return;
    let cancelled = false;
    orderAPI
      .getById(scannedId)
      .then((res) => {
        if (!cancelled && res.data) setScannedOrder(mapBackendOrder(res.data));
      })
      .catch((err) => {
        if (!cancelled)
          setScanNotice(
            err?.message || "Could not load the order from this QR code."
          );
      });
    return () => {
      cancelled = true;
    };
  }, [contextOrder?.id, scannedOrder?.id]);

  // Generate the QR against the origin the customer is actually using. The
  // backend's stored QR may contain an old localhost/tunnel URL that a phone
  // cannot reach, while this one works over the same LAN/tunnel as the app.
  useEffect(() => {
    if (!orderId || !orderTokenNumber || !isBackendOrderId) return;
    let cancelled = false;
    const payload = `${window.location.origin}/live-order?order=${encodeURIComponent(
      orderId
    )}&token=${encodeURIComponent(orderTokenNumber)}`;
    import("qrcode")
      .then((mod) => {
        const QRCode = mod.default ?? mod;
        return QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 250,
          color: { dark: "#000000", light: "#ffffff" },
        });
      })
      .then((url) => {
        if (!cancelled && url) setLocalQr({ id: orderId, qr: url });
      })
      .catch(() => {
        /* fall back to the server-generated QR below */
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, orderTokenNumber, isBackendOrderId]);

  // Lazily fetch/regenerate the QR for legacy orders that were created without
  // one. setState only happens in the async callback, never synchronously.
  useEffect(() => {
    if (!orderId || hasQr || !isBackendOrderId) return;
    let cancelled = false;
    orderAPI
      .getQR(orderId)
      .then((res) => {
        if (!cancelled && res.data?.qr_code) setQrFallback({ id: orderId, qr: res.data.qr_code });
      })
      .catch(() => {
        /* keep the placeholder; the order payload has no QR yet */
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, hasQr, isBackendOrderId]);

  if (!activeOrder) {
    return (
      <div className="max-w-xl mx-auto w-full px-4 pt-12 pb-32 text-center flex flex-col items-center">
        <span className="material-symbols-outlined text-[64px] text-text-muted/50 mb-3">
          confirmation_number
        </span>
        <h2 className="text-xl font-bold text-text-primary">
          No Active Token Found
        </h2>
        <p className="text-xs text-text-muted mt-1 max-w-sm">
          You do not have any active canteen pre-orders currently in progress.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 bg-primary text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md hover:bg-primary-hover transition-all"
        >
          Browse Canteen Menu
        </button>
      </div>
    );
  }

  const steps: { label: OrderStatus; icon: string }[] = [
    { label: "Placed", icon: "assignment" },
    { label: "Accepted", icon: "check_circle" },
    { label: "Preparing", icon: "skillet" },
    { label: "Ready", icon: "notifications_active" },
    { label: "Collected", icon: "task_alt" },
  ];

  const rawStepIdx = steps.findIndex((s) => s.label === activeOrder.status);
  const currentStepIdx =
    activeOrder.status === "Completed" || activeOrder.status === "Collected"
      ? steps.length - 1
      : activeOrder.status === "Delayed"
      ? steps.findIndex((s) => s.label === "Preparing")
      : rawStepIdx;

  const canCancel = ["Placed", "Accepted"].includes(activeOrder.status);

  const qrCode =
    (localQr.id === activeOrder.id ? localQr.qr : undefined) ||
    activeOrder.qrCode ||
    (qrFallback.id === activeOrder.id ? qrFallback.qr : undefined);

  return (
    <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-4 pb-32 flex flex-col gap-5">
      {scanNotice && (
        <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 text-xs font-bold flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{scanNotice}</span>
        </div>
      )}
      {/* Live Kitchen Banner with WebSocket Indicator */}
      <div className="w-full bg-gradient-to-r from-primary-fixed to-amber-50 border border-primary-fixed-dim text-on-primary-fixed rounded-2xl p-4 shadow-sm flex flex-col gap-2 relative overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-primary-fixed flex items-center gap-1.5">
              <span>Real-Time WebSocket Sync</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                LIVE
              </span>
            </span>
          </div>
          <span className="text-[11px] font-bold bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-on-primary-fixed shadow-sm flex items-center gap-1 border border-primary-fixed-dim">
            <span className="material-symbols-outlined text-[13px] text-primary">
              schedule
            </span>
            Status {Math.max(1, currentStepIdx + 1)} of 5
          </span>
        </div>

        <div className="flex items-start gap-3 mt-1">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">
              {activeOrder.status === "Ready"
                ? "notifications_active"
                : "skillet"}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-base font-extrabold text-on-primary-fixed leading-tight">
              {activeOrder.status === "Ready"
                ? "Order is Ready for Pickup at Counter!"
                : activeOrder.status === "Delayed"
                ? "Your order is delayed — kitchen is catching up"
                : activeOrder.status === "Preparing"
                ? "Kitchen is freshly preparing your meal"
                : activeOrder.status === "Accepted"
                ? "Canteen staff accepted your pre-order"
                : "Order received in kitchen queue"}
            </h2>
            <p className="text-xs text-on-primary-fixed-variant flex items-center gap-1 mt-0.5 font-medium">
              <span className="material-symbols-outlined text-[15px] text-primary">
                storefront
              </span>
              {activeOrder.pickupCounter}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-border-subtle flex items-start justify-between gap-1 overflow-hidden">
        {steps.map((step, idx) => {
          const isDone = currentStepIdx >= idx;
          const isCurrent = currentStepIdx === idx;
          return (
            <div
              key={step.label}
              className="flex min-w-0 flex-col items-center gap-1 flex-1 relative"
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCurrent
                    ? "bg-primary text-white ring-4 ring-primary-fixed shadow-md scale-110"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-surface-container-low text-text-muted/70"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {step.icon}
                </span>
              </div>
              <span
                className={`text-[9px] sm:text-[10px] font-bold text-center leading-tight ${
                  isCurrent
                    ? "text-primary"
                    : isDone
                    ? "text-emerald-700"
                    : "text-text-muted/70"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Digital Token Hero Card with Laser Scan Effect */}
      <div className="w-full bg-white rounded-2xl shadow-md border border-border-subtle p-4 sm:p-6 flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between w-full mb-2">
          <span className="text-[11px] font-semibold bg-surface-container-low text-text-primary px-3 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">
              verified
            </span>
            Verified Digital Pass
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 border ${
                activeOrder.paymentStatus === "Paid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : activeOrder.paymentStatus === "Failed"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : activeOrder.paymentStatus === "Refunded"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">
                {activeOrder.paymentStatus === "Paid"
                  ? "check_circle"
                  : activeOrder.paymentStatus === "Failed"
                  ? "error"
                  : activeOrder.paymentStatus === "Refunded"
                  ? "replay"
                  : "schedule"}
              </span>
              Payment: {activeOrder.paymentStatus || "Pending"}
            </span>

            <span className="text-[11px] font-bold bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-full">
              Slot: {activeOrder.pickupSlot}
            </span>
          </div>
        </div>

        <p className="text-xs font-bold text-text-muted/70 uppercase tracking-widest mt-2">
          Pickup Digital Token
        </p>
        <div className="text-4xl font-extrabold text-primary tracking-tight my-1 font-headline">
          {activeOrder.tokenNumber}
        </div>
        <p className="text-xs text-text-muted mb-4">
          Order #{activeOrder.id} • Campus Dining
        </p>

        {/* QR Code Interactive Scanner Frame */}
        <div className="relative w-48 h-48 bg-surface-container-low p-3 rounded-2xl flex items-center justify-center shadow-inner my-2 border border-border-strong">
          {/* Laser Scanner animation line */}
          <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent z-10 laser-scanner-line"></div>

          {qrCode ? (
            <img
              src={qrCode}
              alt={`QR code for token ${activeOrder.tokenNumber}`}
              className="w-40 h-40 object-contain"
            />
          ) : (
            <div className="px-5 text-center text-xs font-semibold text-text-muted">
              Generating your secure QR code...
            </div>
          )}
        </div>

        {qrCode && (
          <a
            href={qrCode}
            download={`token-${activeOrder.tokenNumber}.png`}
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Download QR Code
          </a>
        )}

        <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] text-primary">
            qr_code_scanner
          </span>
          Show this QR pass at the pickup counter
        </p>

        {/* Prep Countdown & Progress Bar */}
        <div className="w-full bg-surface-container-low rounded-xl p-4 mt-4 flex flex-col gap-2 border border-border-subtle">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-text-primary">
              Est. Ready Target: {activeOrder.estimatedReadyTime}
            </span>
            <span className={`${activeOrder.isDelayed ? "text-red-600" : "text-emerald-600"} font-extrabold flex items-center gap-0.5`}>
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              {activeOrder.isDelayed ? "Delayed" : "On Time"}
            </span>
          </div>

          <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-[#F5A3B3] h-full rounded-full transition-all duration-700"
              style={{ width: `${activeOrder.prepProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Order Item Details */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-border-subtle flex flex-col gap-3">
        <h3 className="font-bold text-text-primary text-sm">
          Ordered Food Items ({activeOrder.items.length})
        </h3>
        <div className="divide-y divide-border-subtle">
          {activeOrder.items.map((item) => (
            <div
              key={item.id}
              className="py-2.5 flex items-center justify-between text-xs"
            >
              <div className="flex flex-col">
                <span className="font-bold text-text-primary">
                  {item.quantity}x {item.name}
                </span>
                {item.specialInstruction && (
                  <span className="text-text-muted/70 text-[11px] italic">
                    Note: &quot;{item.specialInstruction}&quot;
                  </span>
                )}
              </div>
              <span className="font-bold text-text-primary">
                Rs. {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border-subtle flex justify-between text-sm font-extrabold text-text-primary">
          <span>Total Paid:</span>
          <span className="text-primary">
            Rs. {activeOrder.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Cancel Order Action */}
      {canCancel && (
        <div className="bg-white rounded-2xl p-4 border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text-primary">
              Need to cancel order?
            </span>
            <span className="text-[11px] text-text-muted/70">
              Cancellation is permitted before kitchen begins cooking.
            </span>
          </div>
          <button
            onClick={() => updateOrderStatus(activeOrder.id, "Cancelled")}
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors shrink-0"
          >
            Cancel Order
          </button>
        </div>
      )}
    </div>
  );
};
