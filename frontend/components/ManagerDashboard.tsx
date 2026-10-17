"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "../app/context/AppContext";
import { MenuItem } from "../app/types";
import { adminAPI, aiAPI, analyticsAPI, queueAPI, managerAPI } from "../app/lib/api";

interface AIOperationsData {
  demand: { itemName: string; projectedPortions: number; demandLevel: string; peakTime: string }[];
  peak: { estimatedPeakWindow: string; orderPressure: string; recommendation: string };
  prep: { itemName: string; currentStock: number; suggestedPrepBeforePeak: number; urgency: string }[];
  waste: { itemName: string; availableStock: number; turnoverRate: string; wasteRisk: string; actionableAdvice: string }[];
  delays: { activeOrdersCount: number; systemQueueStatus: string; predictions: { orderId: string; delayProbability: number; riskLevel: string }[] };
  sales: { averageOrderValueRs: string; insights: string[] };
  recommendations: { item_name: string; category: string; available_quantity: number }[];
}

export const ManagerDashboard: React.FC = () => {
  const {
    menu,
    stats,
    aiInsights,
    slots,
    refreshSlots,
    saveMenuItem,
    deleteMenuItem,
    updateItemStock,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"operations" | "staff">("operations");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [aiOperations, setAiOperations] = useState<AIOperationsData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [slotCapacity, setSlotCapacity] = useState(20);
  const [isSavingSlotCapacity, setIsSavingSlotCapacity] = useState(false);

  useEffect(() => {
    adminAPI.getSettings()
      .then((response) => {
        const value = Number(response.data?.max_orders_per_slot);
        if (Number.isFinite(value) && value > 0) setSlotCapacity(value);
      })
      .catch(() => showToast("Slot settings are temporarily unavailable."));
  }, [showToast]);

  const saveSlotCapacity = async () => {
    if (!Number.isInteger(slotCapacity) || slotCapacity < 1) {
      showToast("Enter a whole number greater than zero.");
      return;
    }

    setIsSavingSlotCapacity(true);
    try {
      await adminAPI.updateSettings({ max_orders_per_slot: slotCapacity });
      await refreshSlots();
      showToast("Pickup slot capacity updated.");
    } catch {
      showToast("Could not update pickup slot capacity.");
    } finally {
      setIsSavingSlotCapacity(false);
    }
  };

  // Staff Management State (Phase 4: Manager Permissions)
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    account_status: "active",
  });

  const fetchStaff = async () => {
    setIsLoadingStaff(true);
    try {
      const res = await managerAPI.getStaff();
      if (res && res.data) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.warn("[Manager] Failed to fetch staff:", err);
      // Fallback seed staff list
      setStaffList([
        {
          _id: "64f1a2b3c4d5e6f7a8b9c102",
          name: "Kitchen Chef / Staff",
          email: "staff@canteen.com",
          role: "staff",
          account_status: "active",
          phone: "+923001234568",
        },
        {
          _id: "64f1a2b3c4d5e6f7a8b9c105",
          name: "Marcus Vance (Head Cook)",
          email: "marcus.cook@canteen.edu.pk",
          role: "staff",
          account_status: "active",
          phone: "+923001234569",
        },
      ]);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    setStaffForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      account_status: "active",
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: any) => {
    setEditingStaffId(staff._id || staff.id);
    setStaffForm({
      name: staff.name,
      email: staff.email,
      password: "",
      phone: staff.phone || "",
      account_status: staff.account_status || "active",
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaffId) {
        // Edit staff
        const updatePayload: any = {
          name: staffForm.name,
          phone: staffForm.phone,
          account_status: staffForm.account_status,
        };
        if (staffForm.password.trim()) {
          updatePayload.password = staffForm.password;
        }
        await managerAPI.updateStaff(editingStaffId, updatePayload);
        showToast(`Kitchen staff "${staffForm.name}" updated successfully!`);
      } else {
        // Create new staff
        if (!staffForm.password || staffForm.password.length < 6) {
          showToast("Password must be at least 6 characters");
          return;
        }
        await managerAPI.createStaff(staffForm);
        showToast(`New kitchen staff member "${staffForm.name}" added successfully!`);
      }
      setIsStaffModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to save kitchen staff"}`);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove kitchen staff member "${name}"?`)) return;
    try {
      await managerAPI.deleteStaff(id);
      showToast(`Kitchen staff member "${name}" removed.`);
      fetchStaff();
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to remove kitchen staff"}`);
    }
  };

  const loadAIOperations = async () => {
    setIsLoadingAI(true);
    const [demand, peak, prep, waste, delays, sales, recommendations] = await Promise.all([
      aiAPI.getDemandPrediction().catch(() => ({ data: { projectedDemand: [] } })),
      aiAPI.getPeakTimePrediction().catch(() => ({ data: { estimatedPeakWindow: "Unavailable", orderPressure: "Unknown", recommendation: "No peak-time recommendation available." } })),
      aiAPI.getPrepForecast().catch(() => ({ data: [] })),
      aiAPI.getWastePrediction().catch(() => ({ data: [] })),
      aiAPI.getDelayPrediction().catch(() => ({ data: { activeOrdersCount: 0, systemQueueStatus: "Unavailable", predictions: [] } })),
      aiAPI.getSalesInsights().catch(() => ({ data: { averageOrderValueRs: "0.00", insights: [] } })),
      aiAPI.getRecommendations().catch(() => ({ data: { items: [] } })),
    ]);

    setAiOperations({
      demand: demand.data.projectedDemand || [],
      peak: peak.data,
      prep: prep.data || [],
      waste: waste.data || [],
      delays: delays.data,
      sales: sales.data,
      recommendations: recommendations.data.items || [],
    });
    setIsLoadingAI(false);
  };

  useEffect(() => {
    loadAIOperations();
  }, []);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [managementReports, setManagementReports] = useState<any>(null);
  const [liveQueue, setLiveQueue] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getDashboard(),
      analyticsAPI.getReports(),
      queueAPI.getLive(),
    ])
      .then(([dashboardResponse, reportsResponse, queueResponse]) => {
        setDashboardMetrics(dashboardResponse.data);
        setManagementReports(reportsResponse.data);
        const queueData = queueResponse.data as any;
        setLiveQueue(Array.isArray(queueData) ? queueData : queueData.orders || []);
      })
      .catch((error) => {
        console.warn("[Manager] Failed to load live analytics:", error);
        showToast("Live analytics are temporarily unavailable.");
      });
  }, [showToast]);

  const liveTotalSales = dashboardMetrics?.totalSales ?? stats.totalSalesToday;
  const liveCompleted = dashboardMetrics?.completedOrders ?? stats.completedOrders;
  const liveTotalOrders = dashboardMetrics?.totalOrdersToday ?? stats.totalOrdersToday;
  const liveAvgPrep = dashboardMetrics?.averagePreparationTimeMinutes ?? stats.avgPrepTimeMinutes;
  const liveCancelled = dashboardMetrics?.cancelledOrders ?? stats.cancelledOrders;
  const queuePriority = (order: any) => {
    const pickupUrgency = order.is_approaching_pickup ? 100 : 0;
    const delayRisk = order.is_delayed_risk || order.is_delayed ? 80 : 0;
    const itemCount = (order.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
    return pickupUrgency + delayRisk + itemCount * 3 + (order.priority_score || 0);
  };
  const prioritizedQueue = [...liveQueue].sort((a, b) => queuePriority(b) - queuePriority(a));

  const handleOpenAddModal = () => {
    setEditingItem({
      name: "",
      category: "Burgers",
      price: 4.5,
      availableQuantity: 15,
      preparationTime: 8,
      status: "Available",
      description: "",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
      isVegetarian: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      saveMenuItem(editingItem);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4 pb-32 flex flex-col gap-4 sm:gap-6">
      {/* Manager Header & KPI Summary */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[28px]">
                query_stats
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-xl font-extrabold text-white font-headline">
                Canteen Manager Ops & Analytics
              </h1>
              <span className="text-xs text-slate-400">
                Live Sales, Menu Item Editors, Inventory Controls & AI Demand Predictions
              </span>
            </div>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">
              add_circle
            </span>
            <span>Add New Menu Item</span>
          </button>
        </div>

        {/* KPI Micro Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">
              Total Revenue Today
            </span>
            <span className="text-xl font-extrabold text-emerald-400">
              Rs. {Number(liveTotalSales).toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">
              Orders Completed / Total
            </span>
            <span className="text-xl font-extrabold text-white">
              {liveCompleted} / {liveTotalOrders}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">
              Avg Preparation Time
            </span>
            <span className="text-xl font-extrabold text-orange-400">
              {liveAvgPrep} mins
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">
              Cancelled Orders
            </span>
            <span className="text-xl font-extrabold text-red-400">
              {liveCancelled}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("operations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "operations"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          <span>Operations & Analytics</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("staff");
            fetchStaff();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "staff"
              ? "bg-orange-600 text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Staff Management (Kitchen Staff)</span>
        </button>
      </div>

      {activeTab === "operations" ? (
        <>
      {/* AI Insights & Demand Predictions */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-600 text-[24px]">
              auto_awesome
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Intelligent AI Demand & Delay Predictions
            </h2>
          </div>
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
            AI Engine Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiInsights.map((insight) => (
            <div
              key={insight.id}
              className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between gap-2"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                    {insight.type}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {insight.confidence}% confidence
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-xs mt-1">
                  {insight.title}
                </h3>
                <p className="text-[11px] text-slate-600">
                  {insight.description}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-800 font-semibold flex items-center gap-1.5 mt-2">
                <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0">
                  lightbulb
                </span>
                <span>{insight.actionableTip}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live AI Operations Cockpit */}
      <section className="bg-slate-950 text-white rounded-2xl p-3 sm:p-5 shadow-xl border border-slate-800 flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400 font-bold">Live decision support</p>
            <h2 className="text-lg font-extrabold">AI Operations Cockpit</h2>
            <p className="text-xs text-slate-400 mt-1">Demand, staffing, preparation, waste, and sales signals from the prediction engine.</p>
          </div>
          <button
            onClick={loadAIOperations}
            disabled={isLoadingAI}
            title="Refresh AI predictions"
            className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg text-xs font-bold flex items-center gap-1.5 self-start"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            {isLoadingAI ? "Refreshing..." : "Refresh predictions"}
          </button>
        </div>

        {aiOperations ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold">Next peak window</p>
                <p className="text-xl font-extrabold mt-1">{aiOperations.peak.estimatedPeakWindow}</p>
                <p className="text-xs text-slate-300 mt-1">{aiOperations.peak.orderPressure}</p>
              </div>
              <div className="bg-orange-400/10 border border-orange-400/20 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-orange-300 font-bold">Kitchen queue</p>
                <p className="text-xl font-extrabold mt-1">{aiOperations.delays.activeOrdersCount} active</p>
                <p className="text-xs text-slate-300 mt-1">{aiOperations.delays.systemQueueStatus}</p>
              </div>
              <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Average order value</p>
                <p className="text-xl font-extrabold mt-1">Rs. {aiOperations.sales.averageOrderValueRs}</p>
                <p className="text-xs text-slate-300 mt-1">Based on completed orders</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white text-slate-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Demand & preparation plan</h3>
                  <span className="text-[10px] text-slate-400">Before {aiOperations.peak.estimatedPeakWindow}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {aiOperations.demand.slice(0, 5).map((item) => {
                    const prep = aiOperations.prep.find((forecast) => forecast.itemName === item.itemName);
                    return (
                      <div key={item.itemName} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold truncate">{item.itemName}</p>
                          <p className="text-slate-500">{item.demandLevel} demand · peak {item.peakTime}</p>
                        </div>
                        <span className="shrink-0 text-orange-600 font-extrabold">{prep?.suggestedPrepBeforePeak ?? item.projectedPortions} portions</span>
                      </div>
                    );
                  })}
                  {aiOperations.demand.length === 0 && <p className="text-xs text-slate-500">No demand signal available yet.</p>}
                </div>
                <p className="text-[11px] text-slate-500 mt-3">{aiOperations.peak.recommendation}</p>
              </div>

              <div className="bg-white text-slate-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Waste risk watchlist</h3>
                  <span className="text-[10px] text-slate-400">Turnover based</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {aiOperations.waste.slice(0, 4).map((item) => (
                    <div key={item.itemName} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{item.itemName}</p>
                        <p className="text-slate-500">{item.availableStock} in stock · {item.turnoverRate} turnover</p>
                      </div>
                      <span className={`shrink-0 font-extrabold ${item.wasteRisk === "High" ? "text-red-600" : item.wasteRisk === "Medium" ? "text-orange-600" : "text-emerald-600"}`}>{item.wasteRisk}</span>
                    </div>
                  ))}
                  {aiOperations.waste.length === 0 && <p className="text-xs text-slate-500">No waste risk signal available yet.</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="font-bold text-sm mb-2">Sales insights</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {aiOperations.sales.insights.slice(0, 3).map((insight) => <li key={insight} className="flex gap-2"><span className="text-emerald-400">•</span>{insight}</li>)}
                </ul>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="font-bold text-sm mb-2">Smart recommendations</h3>
                <div className="flex flex-wrap gap-2">
                  {aiOperations.recommendations.slice(0, 4).map((item) => <span key={item.item_name} className="px-2.5 py-1.5 bg-white/10 rounded-lg text-xs font-semibold">{item.item_name}</span>)}
                  {aiOperations.recommendations.length === 0 && <p className="text-xs text-slate-400">No recommendations available yet.</p>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Loading AI operations data...</p>
        )}
      </section>
      {/* Live Dashboard Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        <AnalyticsValue label="Orders preparing" value={dashboardMetrics?.ordersPreparing ?? stats.preparingOrders} />
        <AnalyticsValue label="Orders ready" value={dashboardMetrics?.ordersReady ?? stats.readyOrders} />
        <AnalyticsValue label="Peak ordering time" value={dashboardMetrics?.peakOrderingTime ?? stats.peakOrderingTime} />
        <AnalyticsValue label="Average queue size" value={dashboardMetrics?.averageQueueSize ?? liveQueue.length} />
        <AnalyticsValue label="Most ordered" value={dashboardMetrics?.mostOrderedFood ?? stats.popularItems[0]?.name ?? "-"} />
        <AnalyticsValue label="Least ordered" value={dashboardMetrics?.leastOrderedFood ?? "-"} />
      </div>

      {managementReports && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportList
            title="Sales by day"
            rows={(managementReports.salesByDay || []).slice(-7).map((row: any) => ({
              label: row.date,
              value: `Rs. ${Number(row.revenue || 0).toFixed(2)} (${row.orderCount || 0} orders)`,
            }))}
          />
          <ReportList
            title="Sales by food item"
            rows={(managementReports.salesByFoodItem || []).slice(0, 6).map((row: any) => ({
              label: row.itemName,
              value: `Rs. ${Number(row.revenue || 0).toFixed(2)} (${row.quantitySold || 0} sold)`,
            }))}
          />
          <ReportList
            title="Pickup-slot usage"
            rows={Object.entries(managementReports.pickupSlotUsage || {}).map(([label, value]) => ({
              label,
              value: `${value} orders`,
            }))}
          />
          <ReportList
            title="Cancellation reasons"
            rows={Object.entries(managementReports.cancellationReasons || {}).map(([label, value]) => ({
              label,
              value: `${value} orders`,
            }))}
            footer={`Delayed orders: ${managementReports.delayedOrderPercentage || "0%"}`}
          />
          <ReportList
            title="Orders by time"
            rows={Object.entries(managementReports.ordersByTime || {}).map(([label, value]) => ({
              label,
              value: `${value} orders`,
            }))}
          />
          <ReportList
            title="Item availability history"
            rows={(managementReports.availabilityHistory || []).slice(0, 6).map((row: any) => ({
              label: row.itemId || "Menu item",
              value: `${row.status} (${row.quantity} units)`,
            }))}
          />
        </div>
      )}

      {/* Smart Queue Priority */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Smart Queue Priority</h2>
            <p className="text-xs text-slate-500">Orders are ranked by delay risk, pickup urgency, size, and kitchen workload.</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">{prioritizedQueue.length} active</span>
        </div>
        {prioritizedQueue.length === 0 ? (
          <p className="text-sm text-slate-500">No active orders in the kitchen queue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr><th className="p-3">Priority</th><th className="p-3">Token</th><th className="p-3">Status</th><th className="p-3">Signals</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prioritizedQueue.slice(0, 10).map((order: any, index) => (
                  <tr key={order._id || order.order_id || order.token_number}>
                    <td className="p-3 font-extrabold text-orange-600">#{index + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{order.token_number}</td>
                    <td className="p-3 text-slate-600">{order.order_status}</td>
                    <td className="p-3 flex flex-wrap gap-1">
                      {order.is_delayed_risk && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 font-bold">Delay risk</span>}
                      {order.is_approaching_pickup && <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">Pickup soon</span>}
                      {!order.is_delayed_risk && !order.is_approaching_pickup && <span className="text-slate-400">Normal flow</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Grid: Inventory Manager & Slot Capacities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory & Price Control Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Menu Items, Prices & Stock Inventory
            </h2>
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                add
              </span>
              <span>Create Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price (Rs.)</th>
                  <th className="p-3">Stock Qty</th>
                  <th className="p-3">Prep Time</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {menu.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-8 h-8 rounded-lg object-cover bg-slate-100"
                      />
                      <span>{item.name}</span>
                    </td>
                    <td className="p-3 text-slate-600">{item.category}</td>
                    <td className="p-3 font-extrabold text-slate-900">
                      Rs. {item.price.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={item.availableQuantity}
                          onChange={(e) =>
                            updateItemStock(item.id, parseInt(e.target.value) || 0)
                          }
                          className="w-14 h-7 px-1.5 border border-slate-200 rounded text-xs font-bold text-center"
                        />
                        <span className="text-[10px] text-slate-400">units</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">
                      {item.preparationTime} mins
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            edit
                          </span>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 15-Min Pickup Slots Limits & Popular Items Ranking */}
        <div className="flex flex-col gap-6">
          {/* Pickup Slot Limits */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-900">
              15-Minute Slot Pickup Limits
            </h2>
            <p className="text-xs text-slate-500">
              Set maximum order capacity per slot to prevent kitchen overload.
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="slot-capacity" className="text-xs font-semibold text-slate-700">
                Maximum orders per slot
              </label>
              <input
                id="slot-capacity"
                type="number"
                min="1"
                step="1"
                value={slotCapacity}
                onChange={(event) => setSlotCapacity(Number(event.target.value))}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-900"
              />
              <button
                type="button"
                onClick={saveSlotCapacity}
                disabled={isSavingSlotCapacity}
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSavingSlotCapacity ? "Saving..." : "Save"}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">
                      {slot.timeSlot}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {slot.stationName}
                    </span>
                  </div>
                  <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                    {slot.currentOrders} / {slot.maxCapacity} Max
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Ranking */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-900">
              Top Selling Food Ranking
            </h2>
            <div className="divide-y divide-slate-100">
              {stats.popularItems.map((pop, idx) => (
                <div
                  key={pop.name}
                  className="py-2 flex items-center justify-between text-xs font-bold"
                >
                  <span className="text-slate-800">
                    #{idx + 1} {pop.name}
                  </span>
                  <span className="text-slate-500">{pop.count} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      ) : (
      /* Staff Management Tab View */
      <div className="flex flex-col gap-6 anim-fade-in">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600 text-[24px]">group</span>
              <h2 className="text-lg font-bold text-slate-900">Kitchen Staff Roster</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Managers have role-based authorization strictly to register and oversee Kitchen Staff members.
            </p>
          </div>
          <button
            onClick={handleOpenAddStaff}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md active:scale-95 self-start md:self-auto transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Kitchen Staff Member</span>
          </button>
        </div>

        {/* Staff Table / Cards */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Active Kitchen Crew ({staffList.length})</span>
            <button
              onClick={fetchStaff}
              disabled={isLoadingStaff}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span className={`material-symbols-outlined text-[16px] ${isLoadingStaff ? "animate-spin" : ""}`}>
                sync
              </span>
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingStaff ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[32px] animate-spin text-orange-600">progress_activity</span>
              <span>Loading kitchen staff directory...</span>
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[36px] text-slate-300">person_off</span>
              <span className="font-semibold text-slate-600">No kitchen staff registered yet.</span>
              <button
                onClick={handleOpenAddStaff}
                className="mt-2 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl"
              >
                Add First Staff Member
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff: any) => (
                    <tr key={staff._id || staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs">
                            {(staff.name || "K").charAt(0).toUpperCase()}
                          </div>
                          <span>{staff.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{staff.email}</td>
                      <td className="py-3.5 px-4 text-slate-600">{staff.phone || "—"}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-max">
                          <span className="material-symbols-outlined text-[12px]">restaurant</span>
                          Kitchen Staff
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-max ${
                            staff.account_status === "active" || staff.account_status === undefined
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {(staff.account_status || "active").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditStaff(staff)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Staff Member"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff._id || staff.id, staff.name)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Staff Member"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Add / Edit Kitchen Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 anim-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 text-[22px]">badge</span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingStaffId ? "Edit Kitchen Staff" : "Add Kitchen Staff Member"}
                </h3>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Staff Full Name</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g., Marcus Vance"
                  required
                  className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={staffForm.email}
                  disabled={!!editingStaffId}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="e.g., marcus.staff@canteen.edu.pk"
                  required
                  className={`h-10 px-3 border border-slate-200 rounded-xl font-medium ${
                    editingStaffId ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">
                  {editingStaffId ? "New Password (leave blank to keep current)" : "Password"}
                </label>
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder={editingStaffId ? "••••••••" : "Min 6 characters"}
                  required={!editingStaffId}
                  className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+923001234567"
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Account Status</label>
                  <select
                    value={staffForm.account_status}
                    onChange={(e) => setStaffForm({ ...staffForm, account_status: e.target.value })}
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 flex items-center gap-2 mt-1">
                <span className="material-symbols-outlined text-[16px] shrink-0">info</span>
                <span>Role is automatically locked to <strong>Kitchen Staff</strong> for canteen security.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-md hover:bg-orange-500"
                >
                  {editingStaffId ? "Update Staff" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Add Menu Item Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 anim-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingItem.id ? "Edit Menu Item Details" : "Create New Menu Item"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Food Item Name</label>
                <input
                  type="text"
                  value={editingItem.name || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  required
                  className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={editingItem.category || "Burgers"}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, category: e.target.value })
                    }
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium bg-white"
                  >
                    <option value="Burgers">Burgers</option>
                    <option value="Meals">Meals</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingItem.price ?? 4.5}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        price: parseFloat(e.target.value),
                      })
                    }
                    required
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Available Stock</label>
                  <input
                    type="number"
                    value={editingItem.availableQuantity ?? 15}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        availableQuantity: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">
                    Prep Time (Mins)
                  </label>
                  <input
                    type="number"
                    value={editingItem.preparationTime ?? 8}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        preparationTime: parseInt(e.target.value) || 1,
                      })
                    }
                    required
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Image URL</label>
                <input
                  type="text"
                  value={editingItem.image || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, image: e.target.value })
                  }
                  required
                  className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  value={editingItem.description || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="p-3 border border-slate-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="veg-check"
                  checked={editingItem.isVegetarian || false}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      isVegetarian: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-orange-600 rounded"
                />
                <label htmlFor="veg-check" className="font-bold text-slate-700">
                  Vegetarian Friendly
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-md hover:bg-orange-500"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalyticsValue: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
    <span className="text-[11px] text-slate-500 font-medium">{label}</span>
    <span className="mt-1 block text-sm font-extrabold text-slate-900 truncate">{value}</span>
  </div>
);

const ReportList: React.FC<{
  title: string;
  rows: { label: string; value: string }[];
  footer?: string;
}> = ({ title, rows, footer }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <div className="mt-3 divide-y divide-slate-100">
      {rows.length === 0 ? (
        <p className="py-3 text-xs text-slate-500">No data available.</p>
      ) : (
        rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="py-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700 truncate">{row.label}</span>
            <span className="font-bold text-slate-900 text-right">{row.value}</span>
          </div>
        ))
      )}
    </div>
    {footer && <p className="mt-3 pt-3 border-t border-slate-100 text-xs font-bold text-orange-600">{footer}</p>}
  </div>
);
