"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

export default function UserProfile() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (!user) return null;

  const userInitial = user.username.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* User Info */}
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">
          {user.full_name || user.username}
        </p>
        <p className="text-xs text-gray-500 capitalize">
          {isAdmin ? "Admin" : "Teacher"}
        </p>
      </div>

      {/* User Avatar with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold hover:bg-indigo-200 transition-colors"
        >
          {userInitial}
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <div className="p-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-gray-500 mt-1">{user.email}</p>
            </div>
            <button
              onClick={() => {
                handleLogout();
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
