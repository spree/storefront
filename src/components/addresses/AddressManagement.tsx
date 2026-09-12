"use client";

import type { Address, AddressParams, Country } from "@spree/sdk";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { AddressEditModal } from "@/components/checkout/AddressEditModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { User } from "@/contexts/AuthContext";
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from "@/lib/data/addresses";
import { getCountry } from "@/lib/data/countries";

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
}

function AddressCard({ address, onEdit, onDelete }: AddressCardProps) {
  const t = useTranslations("address");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-start">
        <div className="text-sm text-gray-600 space-y-0.5">
          <p className="font-medium text-gray-800">{address.full_name}</p>
          {address.company && <p>{address.company}</p>}
          <p>{address.address1}</p>
          {address.address2 && <p>{address.address2}</p>}
          <p>
            {address.city}, {address.state_text} {address.postal_code}
          </p>
          <p>{address.country_name}</p>
          {address.phone && <p className="mt-1">{address.phone}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="link" size="sm" onClick={onEdit}>
            {t("edit")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                {deleting ? t("deleting") : t("delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteAddressTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteAddressConfirmation")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

/**
 * The mutations a book needs. Injected because the same book is kept by two
 * owners — a shopper keeps their own, a company keeps its sites — and only
 * where the rows live differs.
 */
export interface AddressBookActions {
  create: (data: AddressParams) => Promise<{
    success: boolean;
    error?: string;
    address?: Address;
  }>;
  update: (
    id: string,
    data: AddressParams,
  ) => Promise<{ success: boolean; error?: string; address?: Address }>;
  remove: (id: string) => Promise<{ success: boolean; error?: string }>;
}

interface AddressManagementProps {
  initialAddresses: Address[];
  countries: Country[];
  showAddButton: boolean;
  emptyState: boolean;
  user?: User | null;
  /** Defaults to the signed-in shopper's own book. */
  actions?: AddressBookActions;
}

export function AddressManagement({
  initialAddresses,
  countries,
  showAddButton,
  emptyState,
  user,
  actions,
}: AddressManagementProps) {
  const book: AddressBookActions = actions ?? {
    create: createAddress,
    update: updateAddress,
    remove: deleteAddress,
  };
  const t = useTranslations("address");
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const fetchStates = useCallback(async (countryIso: string) => {
    try {
      const country = await getCountry(countryIso);
      return country?.states ?? [];
    } catch {
      return [];
    }
  }, []);

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingAddress(null);
    setModalOpen(true);
  };

  const handleSave = async (data: AddressParams, id?: string) => {
    if (id) {
      const result = await book.update(id, data);
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
      const result = await book.create(data);
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
    const result = await book.remove(id);
    if (result.success) {
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
    } else {
      alert(t("failedToDeleteAddress"));
    }
  };

  if (emptyState && addresses.length === 0) {
    return (
      <>
        <Button onClick={handleAdd}>{t("addFirstAddress")}</Button>
        {modalOpen && (
          <AddressEditModal
            address={editingAddress}
            countries={countries}
            fetchStates={fetchStates}
            onSave={handleSave}
            onClose={() => setModalOpen(false)}
            user={!editingAddress ? user : undefined}
          />
        )}
      </>
    );
  }

  return (
    <>
      {showAddButton && (
        <div className="mb-6">
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addAddress")}
          </Button>
        </div>
      )}

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

      {modalOpen && (
        <AddressEditModal
          address={editingAddress}
          countries={countries}
          fetchStates={fetchStates}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          user={!editingAddress ? user : undefined}
        />
      )}
    </>
  );
}
