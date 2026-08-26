"use client";

import { useState } from "react";
import KassaSidebar from "@/components/KassaSidebar";

export default function AddCustomerPage() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    customerType: "Regular customer",
    address: "",
    notes: "",
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-emerald-800 mb-1">Add Customer</h1>
        <p className="text-gray-500 mb-6">
          Create a customer record to keep their information and purchase history organised.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Customer information</h2>
          <p className="text-sm text-gray-500 mb-5">Fields marked with * are required.</p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                placeholder="Enter customer's full name"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Enter phone number"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Customer type
              </label>
              <select
                value={form.customerType}
                onChange={(e) => handleChange("customerType", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option>Regular customer</option>
                <option>Wholesale customer</option>
                <option>Corporate account</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Enter customer's address"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-base font-semibold text-emerald-800 mb-1">Optional details</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add more information if it will help you serve this customer better.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add a note about this customer"
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors">
              Save Customer
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}