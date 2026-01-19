"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";
import { User } from "@/lib/types";
import { getAllUsers, registerUser, updateUser, deleteUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, ArrowLeft, Shield } from "lucide-react";

export default function UsersPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    full_name: "",
    password: "",
    role: "teacher" as "admin" | "teacher",
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    loadUsers();
  }, [isAdmin, router]);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();

    // Basic validation
    if (!formData.email || !formData.username) {
      toast.error("Please fill all required fields (email & username)");
      return;
    }

    try {
      if (editingUserId) {
        // Update existing user (password optional)
        await updateUser(editingUserId, {
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role,
          password: formData.password || undefined,
        }, user?.id);

        toast.success("User updated successfully");
      } else {
        // Creating new user requires password
        if (!formData.password) {
          toast.error("Password is required for new users");
          return;
        }

        await registerUser(
          formData.email,
          formData.username,
          formData.password,
          formData.role,
          formData.full_name,
          user?.id!,
        );

        toast.success("User created successfully");
      }

      // Reset form and state
      setFormData({
        email: "",
        username: "",
        full_name: "",
        password: "",
        role: "teacher",
      });
      setShowCreateForm(false);
      setEditingUserId(null);
      loadUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create/update user";
      toast.error(errorMessage);
    }
  }

  function generatePassword() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  }

  function handleEditUser(u: User) {
    setEditingUserId(u.id);
    setFormData({
      email: u.email || "",
      username: u.username || "",
      full_name: u.full_name || "",
      password: "",
      role: u.role as "admin" | "teacher",
    });
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDeleteUser(u: User) {
    if (!confirm(`Delete user ${u.username}? This will deactivate the account.`)) return;
    try {
      await deleteUser(u.id, user?.id);
      toast.success('User deleted');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error((error as any)?.message || 'Failed to delete user');
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Logo and College Info */}
            <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <Logo className="h-16 w-16" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Modern Education Society's
                  </h2>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Wadia College of Engineering, Pune.
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Affiliated to SPPU, Approved by AICTE,
                  </p>
                  <p className="text-xs text-gray-600">
                    Accredited by NAAC with 'A++' Grade, Accredited by NBA
                  </p>
                </div>
              </div>
              <UserProfile />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                  <p className="text-sm text-gray-600">Admin only: Manage system users</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add User
                </button>
              </div>
            </div> 
          </div>
        </header>

        {/* Summary */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-600">
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
              <p className="text-gray-600 text-sm">Teachers</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter((u) => u.role === "teacher").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-600">
              <p className="text-gray-600 text-sm">Admins</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-600">
              <p className="text-gray-600 text-sm">Active Users</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter((u) => u.is_active).length}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-gray-900">
                {editingUserId ? 'Edit User' : 'Create New User'}
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="john_doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      placeholder="Dr. John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as "admin" | "teacher",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Enter or generate password"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Min 8 characters recommended
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    {editingUserId ? 'Update User' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingUserId(null);
                      setFormData({
                        email: "",
                        username: "",
                        full_name: "",
                        password: "",
                        role: "teacher",
                      });
                    }}
                    className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">
                              {u.full_name || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {u.username}
                        </td>
                        <td className="px-6 py-4 text-gray-700">{u.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${u.role === "admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
                          >
                            {u.role === "admin" && (
                              <Shield className="w-3 h-3" />
                            )}
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${u.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                          >
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleEditUser(u)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Edit user">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {u.username !== "admin" && (
                              <button onClick={() => handleDeleteUser(u)} className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors" title="Delete user">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      </div>
    </ProtectedRoute>
  );
}
