"use client";

import type { AddressParams, StoreAddress, StoreCountry } from "@spree/sdk";
import { useCallback, useEffect, useState } from "react";
import { AddressEditModal } from "@/components/checkout/AddressEditModal";
import { MapPinIcon, PlusIcon } from "@/components/icons";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
} from "@/lib/data/addresses";
import { getCountries, getCountry } from "@/lib/data/countries";

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: StoreAddress;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-gray-900">{address.full_name}</p>
          {address.company && (
            <p className="text-sm text-gray-500">{address.company}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">{address.address1}</p>
          {address.address2 && (
            <p className="text-sm text-gray-500">{address.address2}</p>
          )}
          <p className="text-sm text-gray-500">
            {address.city}, {address.state_text} {address.zipcode}
          </p>
          <p className="text-sm text-gray-500">{address.country_name}</p>
          {address.phone && (
            <p className="text-sm text-gray-500 mt-2">{address.phone}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-sm text-primary-500 hover:text-primary-700 font-medium"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<StoreAddress[]>([]);
  const [countries, setCountries] = useState<StoreCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<StoreAddress | null>(
    null,
  );

  const fetchStates = useCallback(async (countryIso: string) => {
    try {
      const country = await getCountry(countryIso);
      return country?.states ?? [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      const [addressResponse, countriesResponse] = await Promise.all([
        getAddresses(),
        getCountries(),
      ]);
      setAddresses(addressResponse.data);
      setCountries(countriesResponse.data);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleEdit = (address: StoreAddress) => {
    setEditingAddress(address);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingAddress(null);
    setModalOpen(true);
  };

  const handleSave = async (data: AddressParams, id?: string) => {
    if (id) {
      const result = await updateAddress(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      // Update just the one address in state
      if (result.address) {
        setAddresses((prev) =>
          prev.map((addr) => (addr.id === id ? result.address! : addr)),
        );
      }
    } else {
      const result = await createAddress(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      // Append the new address
      if (result.address) {
        setAddresses((prev) => [...prev, result.address!]);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAddress(id);
    if (result.success) {
      // Remove the address from state
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Addresses</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Addresses</h1>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No addresses saved
          </h3>
          <p className="text-gray-500 mb-6">
            Add an address for faster checkout.
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => handleEdit(address)}
              onDelete={() => handleDelete(address.id)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddressEditModal
          address={editingAddress}
          countries={countries}
          fetchStates={fetchStates}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
