import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../app/context/AppContext";
import { SmartCardTopUpModal } from "./SmartCardTopUpModal";

const FALLBACK_MENU_IMAGE = "/menu-fallback.svg";

export const CartCheckout: React.FC = () => {
  const router = useRouter();
  const {
    cart,
    updateCartQty,
    updateCartInstruction,
    cartTotal,
    cartCount,
    slots,
    selectedSlotId,
    setSelectedSlotId,
    placeOrder,
    currentUser,
    isAuthenticated,
    showToast,
  } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<"smart_card" | "card" | "cash_on_counter">("smart_card");

  // Demo in-app card checkout (no external gateway)
  const [showCardModal, setShowCardModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardError, setCardError] = useState("");

  // Smart-card "Add Money" demo recharge
  const [showTopUp, setShowTopUp] = useState(false);

  const smartCardBalance = currentUser.smartCardBalance ?? 0;
  const insufficientBalance = paymentMethod === "smart_card" && smartCardBalance < cartTotal;

  const peakQuotaMax = 5;
  const currentSlot = slots.find((s) => s.id === selectedSlotId) || slots[1];

  const handleConfirmOrder = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (cart.length === 0) return;

    if (paymentMethod === "card") {
      setCardError("");
      setShowCardModal(true);
      return;
    }

    if (paymentMethod === "smart_card" && insufficientBalance) {
      setShowTopUp(true);
      return;
    }

    const res = placeOrder(selectedSlotId, paymentMethod);
    if (res) {
      router.push("/live-order");
    }
  };

  const handleCardPay = () => {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length !== 16) {
      setCardError("Enter a valid 16-digit card number.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setCardError("Expiry must be in MM/YY format.");
      return;
    }
    if (cardCvv.replace(/\D/g, "").length < 3) {
      setCardError("CVV must be at least 3 digits.");
      return;
    }

    setCardError("");
    setIsProcessing(true);
    // Simulated authorization delay, then place the order (backend marks it Paid)
    window.setTimeout(() => {
      const res = placeOrder(selectedSlotId, "card");
      setIsProcessing(false);
      if (res) {
        setShowCardModal(false);
        router.push("/live-order");
      }
      // On failure placeOrder already toasted the reason; modal stays open
    }, 700);
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4 pb-32">
      {/* Back to menu Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          <span>Back to Canteen Menu</span>
        </button>
        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
          Pre-Order Checkout
        </span>
      </div>

      {/* Peak Hour Quota Warning Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-wide">
            <span className="material-symbols-outlined text-[18px]">
              timer
            </span>
            <span>Lunch Rush Window Quota</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            1:00 PM – 2:00 PM
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 font-bold">
            <span className="material-symbols-outlined text-[18px]">
              info
            </span>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">
                Peak Hour Basket Limits
              </span>
              <span className="text-xs font-bold text-orange-600">
                {cartCount} of {peakQuotaMax} Items
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              To keep kitchen queue fast, student pre-orders are limited to 5
              items per lunch rush slot.
            </p>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-orange-600 h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (cartCount / peakQuotaMax) * 100)}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-900">
          Your Meal Items ({cartCount})
        </h2>
        <span className="font-extrabold text-base text-slate-900">
          Rs. {cartTotal.toFixed(2)}
        </span>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center flex flex-col items-center justify-center border border-slate-100 mb-6">
          <span className="material-symbols-outlined text-[54px] text-slate-300 mb-3">
            shopping_basket
          </span>
          <h3 className="font-bold text-slate-800 text-base">
            Your Pre-Order Basket is empty
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Browse our fresh canteen menu and select your favorite meals before
            reaching the counter.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md hover:bg-orange-700 transition-all"
          >
            Explore Menu Items
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-6">
          {cart.map(({ menuItem, quantity, specialInstruction }) => (
            <div
              key={menuItem.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3"
            >
              <div className="flex items-center gap-4">
                <img
                  src={menuItem.image || FALLBACK_MENU_IMAGE}
                  alt={menuItem.name}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_MENU_IMAGE) {
                      target.src = FALLBACK_MENU_IMAGE;
                    }
                  }}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0"
                />

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {menuItem.name}
                    </h3>
                    <span className="font-extrabold text-slate-900 text-base">
                      Rs. {(menuItem.price * quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-[11px] font-semibold text-orange-600">
                      <span className="material-symbols-outlined text-[13px]">
                        bolt
                      </span>
                      {menuItem.preparationTime}m prep
                    </span>
                    <span className="text-xs text-slate-400">
                      Rs. {menuItem.price.toFixed(2)} ea
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500 font-medium">
                      Quantity:
                    </span>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
                      <button
                        onClick={() => updateCartQty(menuItem.id, -1)}
                        className="w-7 h-7 rounded-lg bg-white text-slate-800 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-all font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold px-2 min-w-[20px] text-center text-slate-900">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(menuItem.id, 1)}
                        className="w-7 h-7 rounded-lg bg-white text-slate-800 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-all font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kitchen Special Note Input */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Kitchen Preparation Instructions
                </label>
                <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-orange-500/30">
                  <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">
                    edit_note
                  </span>
                  <input
                    type="text"
                    value={specialInstruction}
                    onChange={(e) =>
                      updateCartInstruction(menuItem.id, e.target.value)
                    }
                    placeholder="Add special instructions (e.g. extra mayo, no raw onions, less ice)"
                    className="bg-transparent text-slate-900 placeholder:text-slate-400 text-xs w-full outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
          >
            <span className="material-symbols-outlined text-[18px] text-orange-600">
              add_circle
            </span>
            <span>Add More Food Items From Menu</span>
          </button>
        </div>
      )}

      {/* Pickup Slot Selection */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Select 15-Minute Pickup Slot
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kitchen starts hot preparation right before your arrival time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {slots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <div
                key={slot.id}
                onClick={() => slot.isAvailable && setSelectedSlotId(slot.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  !slot.isAvailable
                    ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? "bg-gradient-to-r from-orange-50 to-amber-50/30 border-orange-500 ring-2 ring-orange-500/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    {isSelected && slot.isAvailable && (
                      <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px]">
                          check
                        </span>
                      </span>
                    )}
                    <span
                      className={`text-sm font-extrabold ${
                        !slot.isAvailable ? "line-through text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {slot.timeSlot}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 truncate">
                    {slot.stationName}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    !slot.isAvailable
                      ? "bg-slate-200 text-slate-600"
                      : isSelected
                      ? "bg-orange-600 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {!slot.isAvailable
                    ? slot.status === "Past"
                      ? "Past"
                      : "Slot Full"
                    : `${slot.currentOrders}/${slot.maxCapacity} Booked`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method Selector (Phase 2: Payment Status Tracking) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-orange-600">
              payments
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              Select Payment Method
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Reconciles payment_status
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: "smart_card",
              title: "Campus Smart Card",
              desc: `Balance Rs. ${smartCardBalance.toFixed(2)}`,
              status: "Paid",
              icon: "contactless",
              badge: insufficientBalance ? "Low Balance" : "Instant Paid",
              badgeColor: insufficientBalance
                ? "bg-rose-100 text-rose-700"
                : "bg-emerald-100 text-emerald-800",
              disabled: insufficientBalance,
            },
            {
              id: "card",
              title: "Debit / Credit Card",
              desc: "Instant online payment",
              status: "Paid",
              icon: "credit_card",
              badge: "Instant Paid",
              badgeColor: "bg-emerald-100 text-emerald-800",
              disabled: false,
            },
            {
              id: "cash_on_counter",
              title: "Cash at Pickup",
              desc: "Pay at counter window",
              status: "Pending",
              icon: "point_of_sale",
              badge: "Pending",
              badgeColor: "bg-amber-100 text-amber-800",
              disabled: false,
            },
          ].map((pm) => {
            const isSelected = paymentMethod === pm.id;
            return (
              <div
                key={pm.id}
                onClick={() => {
                  if (!pm.disabled) setPaymentMethod(pm.id as any);
                }}
                className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                  pm.disabled
                    ? "bg-slate-50 border-slate-200 opacity-70 cursor-not-allowed"
                    : isSelected
                    ? "bg-gradient-to-r from-orange-50 to-amber-50/40 border-orange-500 ring-2 ring-orange-500/20 shadow-sm cursor-pointer"
                    : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[20px] ${isSelected ? "text-orange-600" : "text-slate-500"}`}>
                      {pm.icon}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {pm.title}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{pm.desc}</span>
                  {isSelected && pm.id === "smart_card" ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTopUp(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setShowTopUp(true);
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">add</span>
                      Add Money
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pm.badgeColor}`}>
                      {pm.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total & Order Submission */}
      {cart.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-800 flex flex-col gap-3 sm:gap-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Payment & Pre-Order Summary
          </h3>

          <div className="flex flex-col gap-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Subtotal Meal Items:</span>
              <span className="font-bold">Rs. {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Campus Digital Queue Service Fee:</span>
              <span className="text-emerald-400 font-bold">FREE (Rs. 0.00)</span>
            </div>
            <div className="flex justify-between">
              <span>Selected Pickup Slot:</span>
              <span className="font-bold text-orange-400">
                {currentSlot?.timeSlot || "Select a pickup slot"}
              </span>
            </div>
            {paymentMethod === "smart_card" && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span>Smart Card Balance:</span>
                  <span
                    className={`font-bold ${
                      insufficientBalance ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    Rs. {smartCardBalance.toFixed(2)}
                    {!insufficientBalance &&
                      ` → Rs. ${(smartCardBalance - cartTotal).toFixed(2)}`}
                  </span>
                </div>
                <button
                  onClick={() => setShowTopUp(true)}
                  className="self-start inline-flex items-center gap-1 text-[11px] font-bold text-orange-300 hover:text-orange-200"
                >
                  <span className="material-symbols-outlined text-[14px]">add_card</span>
                  Add money to smart card
                </button>
              </div>
            )}
            {paymentMethod === "card" && (
              <div className="flex justify-between">
                <span>Payment Confirmation:</span>
                <span className="font-bold text-emerald-400">
                  In-app card confirmation
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-800 text-base font-extrabold text-white">
              <span>Total Amount:</span>
              <span className="text-orange-400">Rs. {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleConfirmOrder}
            className="w-full py-3 sm:py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">
              confirmation_number
            </span>
            <span>
              {insufficientBalance
                ? "Insufficient Balance — Add Money"
                : paymentMethod === "card"
                ? `Review & Pay Rs. ${cartTotal.toFixed(2)}`
                : "Confirm Pre-Order & Issue Digital Token"}
            </span>
          </button>
        </div>
      )}

      {/* Demo in-app card payment confirmation */}
      {showCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => {
            if (!isProcessing) setShowCardModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-orange-600">
                  credit_card
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Debit / Credit Card
                </h3>
              </div>
              <button
                onClick={() => setShowCardModal(false)}
                disabled={isProcessing}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-500 flex items-center justify-center"
                aria-label="Close payment"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Amount to pay
              </span>
              <span className="font-extrabold text-slate-900 text-base">
                Rs. {cartTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Card Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                    setCardNumber(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
                    setCardError("");
                  }}
                  placeholder="0000 0000 0000 0000"
                  disabled={isProcessing}
                  className="bg-slate-50 text-slate-900 text-sm font-semibold tracking-wider rounded-xl px-3 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Expiry
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                      setCardExpiry(v);
                      setCardError("");
                    }}
                    placeholder="MM/YY"
                    disabled={isProcessing}
                    className="bg-slate-50 text-slate-900 text-sm font-semibold rounded-xl px-3 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    CVV
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={cardCvv}
                    onChange={(e) => {
                      setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setCardError("");
                    }}
                    placeholder="•••"
                    disabled={isProcessing}
                    className="bg-slate-50 text-slate-900 text-sm font-semibold rounded-xl px-3 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {cardError && (
              <p className="text-[11px] font-bold text-rose-500">{cardError}</p>
            )}

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Demo checkout for the campus canteen — card details stay in this
              browser and no real money is charged.
            </p>

            <button
              onClick={handleCardPay}
              disabled={isProcessing}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-70 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isProcessing ? "progress_activity" : "lock"}
              </span>
              <span>
                {isProcessing
                  ? "Authorizing Payment…"
                  : `Pay Rs. ${cartTotal.toFixed(2)}`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Smart-card Add Money recharge */}
      <SmartCardTopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} />
    </div>
  );
};
