"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LogOut, User, BookOpen, BarChart3 } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";

export default function DashboardPage() {
  const { user, logout, isAdmin, isTeacher, loading } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  // Redirect teacher users directly to Academic Years
  useEffect(() => {
    if (!loading && isTeacher) {
      router.push('/academic-years');
    }
  }, [isTeacher, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const navigationItems = [
    {
      label: "Academic Years",
      href: "/academic-years",
      icon: BookOpen,
      visible: true,
    },
    {
      label: "User Management",
      href: "/users",
      icon: User,
      visible: isAdmin,
    },
    {
      label: "Reports",
      href: "/reports",
      icon: BarChart3,
      visible: true,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Compact header (clean, minimal) */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo className="h-12 w-12" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Evaluation System</h1>
                  <p className="text-xs text-gray-500">Wadia College of Engineering, Pune · Affiliated to SPPU · AICTE</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-4 text-sm text-gray-700">
                  {navigationItems.filter((item) => item.visible).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.href} onClick={() => router.push(item.href)} className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <UserProfile />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-start">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role Card */}
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Role</h3>
                <p className="text-xl font-bold text-gray-900 capitalize">{user?.role}</p>
                <p className="text-sm text-gray-500 mt-2">{user?.role === "admin" ? "Full system access" : "Limited access"}</p>
              </div>

              {/* Quick Actions (prominent) */}
              <div className="bg-white rounded-lg shadow-sm p-5 flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Actions</h3>
                  <p className="text-xs text-gray-400 mb-3">Primary actions for common tasks</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => router.push('/academic-years')} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">Academic Years</button>
                  {isAdmin && <button onClick={() => router.push('/users')} className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-md text-sm font-medium">Manage Users</button>}
                  <button onClick={() => router.push('/reports')} className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-md text-sm font-medium">Reports</button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Primary action is highlighted for quick access.</p>
              </div>
            </div>

            {/* Overview / Shortcuts */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Overview</h3>
              <p className="text-sm text-gray-600 mb-3">Access academic years, user management, and reports from the quick actions.</p>
              <div className="flex gap-2">
                <button onClick={() => router.push('/academic-years')} className="px-3 py-1 text-sm text-indigo-600 border border-indigo-100 rounded">Open</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
