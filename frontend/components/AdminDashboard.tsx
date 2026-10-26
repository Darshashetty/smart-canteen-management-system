"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../app/context/AppContext";
import { adminAPI } from "../app/lib/api";

export const AdminDashboard: React.FC = () => {
  const { showToast } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<
    "users" | "canteens" | "permissions" | "logs" | "categories"
  >("users");

  const [usersList, setUsersList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);

  // Categories State (Phase 5)
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "restaurant",
    image: "",
    is_active: true,
  });

  // Canteens State (Phase 5)
  const [canteensList, setCanteensList] = useState<any[]>([]);
  const [isLoadingCanteens, setIsLoadingCanteens] = useState(false);
  const [isCanteenModalOpen, setIsCanteenModalOpen] = useState(false);
  const [editingCanteenId, setEditingCanteenId] = useState<string | null>(null);
  const [canteenForm, setCanteenForm] = useState({
    name: "",
    location: "",
    opening_time: "12:00",
    closing_time: "21:00",
    is_active: true,
    contact_number: "",
  });

  const fetchUsersAndLogs = () => {
    adminAPI
      .getUsers()
      .then((res) => {
        if (res && res.data) setUsersList(res.data);
      })
      .catch((err) => console.warn("[API] Admin getUsers failed:", err));

    adminAPI
      .getLogs()
      .then((res) => {
        if (res && res.data) setLogsList(res.data);
      })
      .catch((err) => console.warn("[API] Admin getLogs failed:", err));
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await adminAPI.getCategories();
      if (res && res.data) {
        setCategoriesList(res.data);
      }
    } catch (err) {
      console.warn("[Admin] Failed to load categories:", err);
      setCategoriesList([
        { _id: "cat_001", name: "Burgers", description: "Freshly grilled gourmet burgers", icon: "lunch_dining", is_active: true },
        { _id: "cat_002", name: "Meals", description: "Wholesome meal platters", icon: "dinner_dining", is_active: true },
        { _id: "cat_003", name: "Beverages", description: "Cold drinks & juices", icon: "local_cafe", is_active: true },
        { _id: "cat_004", name: "Snacks", description: "Crispy fries & sides", icon: "fastfood", is_active: true },
        { _id: "cat_005", name: "Desserts", description: "Sweet pastries & treats", icon: "icecream", is_active: true },
      ]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchCanteens = async () => {
    setIsLoadingCanteens(true);
    try {
      const res = await adminAPI.getCanteens();
      if (res && res.data) {
        setCanteensList(res.data);
      }
    } catch (err) {
      console.warn("[Admin] Failed to load canteens:", err);
      setCanteensList([
        { _id: "cant_001", name: "Central Campus Hub", location: "Main Academic Building Ground Floor", opening_time: "12:00", closing_time: "21:00", is_active: true, contact_number: "+92 300 1112233" },
        { _id: "cant_002", name: "Engineering Block Express", location: "Block B, 1st Floor Cafeteria", opening_time: "08:30", closing_time: "18:30", is_active: true, contact_number: "+92 300 4445566" },
        { _id: "cant_003", name: "Hostel Night Canteen", location: "Residential Quad Building C", opening_time: "18:00", closing_time: "02:00", is_active: true, contact_number: "+92 300 7778899" },
      ]);
    } finally {
      setIsLoadingCanteens(false);
    }
  };

  useEffect(() => {
    fetchUsersAndLogs();
    fetchCategories();
    fetchCanteens();
  }, []);

  // Category Actions
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: "",
      description: "",
      icon: "restaurant",
      image: "",
      is_active: true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setEditingCategoryId(cat._id || cat.id);
    setCategoryForm({
      name: cat.name,
      description: cat.description || "",
      icon: cat.icon || "restaurant",
      image: cat.image || "",
      is_active: cat.is_active !== undefined ? cat.is_active : true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategoryId) {
        await adminAPI.updateCategory(editingCategoryId, categoryForm);
        showToast(`Category "${categoryForm.name}" updated successfully.`);
      } else {
        await adminAPI.createCategory(categoryForm);
        showToast(`Category "${categoryForm.name}" created successfully.`);
      }
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to save category"}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await adminAPI.deleteCategory(id);
      showToast(`Category "${name}" deleted.`);
      fetchCategories();
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to delete category"}`);
    }
  };

  // Canteen Actions
  const handleOpenAddCanteen = () => {
    setEditingCanteenId(null);
    setCanteenForm({
      name: "",
      location: "",
      opening_time: "12:00",
      closing_time: "21:00",
      is_active: true,
      contact_number: "",
    });
    setIsCanteenModalOpen(true);
  };

  const handleOpenEditCanteen = (canteen: any) => {
    setEditingCanteenId(canteen._id || canteen.id);
    setCanteenForm({
      name: canteen.name,
      location: canteen.location,
      opening_time: canteen.opening_time || "08:00",
      closing_time: canteen.closing_time || "20:00",
      is_active: canteen.is_active !== undefined ? canteen.is_active : true,
      contact_number: canteen.contact_number || "",
    });
    setIsCanteenModalOpen(true);
  };

  const handleSaveCanteen = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCanteenId) {
        await adminAPI.updateCanteen(editingCanteenId, canteenForm);
        showToast(`Canteen "${canteenForm.name}" updated successfully.`);
      } else {
        await adminAPI.createCanteen(canteenForm);
        showToast(`Canteen "${canteenForm.name}" created successfully.`);
      }
      setIsCanteenModalOpen(false);
      fetchCanteens();
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to save canteen hub"}`);
    }
  };

  const handleDeleteCanteen = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove canteen "${name}"?`)) return;
    try {
      await adminAPI.deleteCanteen(id);
      showToast(`Canteen "${name}" removed.`);
      fetchCanteens();
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to delete canteen"}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4 pb-32 flex flex-col gap-4 sm:gap-6">
      {/* Admin Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 flex flex-col gap-3 md:flex-row md:items-center justify-between md:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[28px]">
              admin_panel_settings
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold text-white font-headline">
                System Administrator Console
              </h1>
              <span className="bg-purple-500/20 text-purple-300 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border border-purple-500/30">
                Superuser Access
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Manage Users, Roles, Canteen Hubs, Taxonomy Categories & System Logs
            </span>
          </div>
        </div>

        {/* Admin Section Tabs */}
        <div className="flex items-center gap-1 bg-slate-800 p-1.5 rounded-xl border border-slate-700 overflow-x-auto no-scrollbar">
          {[
            { key: "users", label: "Users & Accounts" },
            { key: "canteens", label: "Canteen Hubs" },
            { key: "categories", label: "Food Categories" },
            { key: "permissions", label: "Permissions Matrix" },
            { key: "logs", label: "System Logs" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveAdminTab(t.key as any)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                activeAdminTab === t.key
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: User Management */}
      {activeAdminTab === "users" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              System Accounts & Role Assignments
            </h2>
            <button
              onClick={() => showToast("Role editing is active directly in the table.")}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                manage_accounts
              </span>
              <span>All Registered Accounts</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(usersList.length > 0
                  ? usersList
                  : [
                      {
                        _id: "u-1",
                        name: "Student Customer",
                        email: "customer@canteen.com",
                        role: "customer",
                        account_status: "active",
                        phone: "+923001234567",
                      },
                      {
                        _id: "u-2",
                        name: "Kitchen Chef / Staff",
                        email: "staff@canteen.com",
                        role: "staff",
                        account_status: "active",
                        phone: "+923001234568",
                      },
                      {
                        _id: "u-3",
                        name: "Canteen Manager",
                        email: "manager@canteen.com",
                        role: "manager",
                        account_status: "active",
                        phone: "+923001234569",
                      },
                      {
                        _id: "u-4",
                        name: "System Administrator",
                        email: "admin@canteen.com",
                        role: "admin",
                        account_status: "active",
                        phone: "+923001234570",
                      },
                    ]
                ).map((u) => (
                  <tr key={u._id || u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{u.name}</td>
                    <td className="p-3 text-slate-600 font-medium">{u.email}</td>
                    <td className="p-3">
                      <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 uppercase text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] uppercase">
                        {u.account_status || u.status || "active"}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{u.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: System Logs */}
      {activeAdminTab === "logs" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              System Audit & Activity Logs
            </h2>
            <span className="text-xs text-slate-500">Live Audit Stream</span>
          </div>

          <div className="divide-y divide-slate-100 font-mono text-xs">
            {(logsList.length > 0
              ? logsList
              : [
                  {
                    _id: "log-1",
                    created_at: new Date().toISOString(),
                    user_name: "Student Customer",
                    action: "ORDER_PLACED",
                    details: { order_id: "ORD-20261001-1023", token: "C-023" },
                  },
                  {
                    _id: "log-2",
                    created_at: new Date().toISOString(),
                    user_name: "Kitchen Chef / Staff",
                    action: "ORDER_STATUS_TRANSITION",
                    details: { from: "Accepted", to: "Preparing" },
                  },
                ]
            ).map((log) => (
              <div
                key={log._id || log.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-400 font-semibold shrink-0">
                    [{new Date(log.created_at || 0).toLocaleTimeString()}]
                  </span>
                  <span className="font-bold text-slate-900 shrink-0">
                    {log.user_name || log.user || "System"}:
                  </span>
                  <span className="text-slate-700 truncate">
                    {log.action} {log.details ? JSON.stringify(log.details) : ""}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 uppercase">
                  {log.role || "AUDIT"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Canteen Accounts / Hubs (Phase 5) */}
      {activeAdminTab === "canteens" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Canteen Hubs & Operations Management
              </h2>
              <p className="text-xs text-slate-500">
                Configure multiple canteen accounts, operating hours, and location assignments.
              </p>
            </div>
            <button
              onClick={handleOpenAddCanteen}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm self-start md:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">add_business</span>
              <span>Register New Canteen</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {canteensList.map((canteen) => (
              <div
                key={canteen._id || canteen.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-purple-600 text-[26px]">
                      storefront
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        canteen.is_active !== false
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {canteen.is_active !== false ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {canteen.name}
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                      <span>{canteen.location}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/80">
                    <div>
                      <span className="text-slate-400">Hours:</span>
                      <p className="font-semibold text-slate-700">{canteen.opening_time || "08:00"} - {canteen.closing_time || "20:00"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Contact:</span>
                      <p className="font-semibold text-slate-700">{canteen.contact_number || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => handleOpenEditCanteen(canteen)}
                    className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit Canteen"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCanteen(canteen._id || canteen.id, canteen.name)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Canteen"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Food Categories Manager (Phase 5) */}
      {activeAdminTab === "categories" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Food Taxonomy & Category Management
              </h2>
              <p className="text-xs text-slate-500">
                Manage system-wide menu categories, icons, descriptions, and visibility.
              </p>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm self-start md:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">category</span>
              <span>Create New Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {categoriesList.map((cat) => (
              <div
                key={cat._id || cat.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">
                      {cat.icon || "restaurant"}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      cat.is_active !== false
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {cat.is_active !== false ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{cat.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                    {cat.description || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => handleOpenEditCategory(cat)}
                    className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit Category"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id || cat.id, cat.name)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Role Permissions Matrix */}
      {activeAdminTab === "permissions" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-900">
            Role Access Permissions Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Permission Feature</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Kitchen Staff</th>
                  <th className="p-3">Manager</th>
                  <th className="p-3">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="p-3 font-bold">Customer Reordering & Past Orders</td>
                  <td className="p-3 text-emerald-600 font-bold">YES</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-slate-400">NO</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Pre-Order & Select Slot</td>
                  <td className="p-3 text-emerald-600 font-bold">YES</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-slate-400">NO</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Advance Order Prep Status</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-emerald-600 font-bold">YES</td>
                  <td className="p-3 text-emerald-600 font-bold">YES</td>
                  <td className="p-3 text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Kitchen Staff Roster Management</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-emerald-600 font-bold">YES</td>
                  <td className="p-3 text-purple-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Food Categories & Canteen Accounts</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-slate-400">NO</td>
                  <td className="p-3 text-purple-600 font-bold">YES</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 anim-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[22px]">category</span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingCategoryId ? "Edit Food Category" : "Create Food Category"}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Wraps & Rolls"
                  required
                  className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description of items under this category"
                  rows={2}
                  className="p-3 border border-slate-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Icon (Material Icon Name)</label>
                  <select
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium bg-white"
                  >
                    <option value="lunch_dining">lunch_dining 🍔</option>
                    <option value="dinner_dining">dinner_dining 🍱</option>
                    <option value="local_cafe">local_cafe 🥤</option>
                    <option value="fastfood">fastfood 🍟</option>
                    <option value="icecream">icecream 🍨</option>
                    <option value="ramen_dining">ramen_dining 🍜</option>
                    <option value="bakery_dining">bakery_dining 🥐</option>
                    <option value="restaurant">restaurant 🍽️</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={categoryForm.is_active ? "true" : "false"}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.value === "true" })}
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium bg-white"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-500"
                >
                  {editingCategoryId ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Canteen Modal */}
      {isCanteenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 anim-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[22px]">storefront</span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingCanteenId ? "Edit Canteen Hub" : "Register Canteen Hub"}
                </h3>
              </div>
              <button
                onClick={() => setIsCanteenModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCanteen} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Canteen Hub Name</label>
                <input
                  type="text"
                  value={canteenForm.name}
                  onChange={(e) => setCanteenForm({ ...canteenForm, name: e.target.value })}
                  placeholder="e.g., Executive Business Lounge Cafeteria"
                  required
                  className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Physical Location</label>
                <input
                  type="text"
                  value={canteenForm.location}
                  onChange={(e) => setCanteenForm({ ...canteenForm, location: e.target.value })}
                  placeholder="e.g., Management Sciences Building, 2nd Floor"
                  required
                  className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Opening Time</label>
                  <input
                    type="time"
                    value={canteenForm.opening_time}
                    onChange={(e) => setCanteenForm({ ...canteenForm, opening_time: e.target.value })}
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Closing Time</label>
                  <input
                    type="time"
                    value={canteenForm.closing_time}
                    onChange={(e) => setCanteenForm({ ...canteenForm, closing_time: e.target.value })}
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    value={canteenForm.contact_number}
                    onChange={(e) => setCanteenForm({ ...canteenForm, contact_number: e.target.value })}
                    placeholder="+92 300 0000000"
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Operational Status</label>
                  <select
                    value={canteenForm.is_active ? "true" : "false"}
                    onChange={(e) => setCanteenForm({ ...canteenForm, is_active: e.target.value === "true" })}
                    className="h-10 px-3 border border-slate-200 rounded-xl font-medium bg-white"
                  >
                    <option value="true">Active Hub</option>
                    <option value="false">Inactive / Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCanteenModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-500"
                >
                  {editingCanteenId ? "Update Canteen" : "Register Canteen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
