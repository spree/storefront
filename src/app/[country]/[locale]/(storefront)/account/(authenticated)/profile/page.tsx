"use client";

import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { updateCustomer } from "@/lib/data/customer";

// Inner form component that resets when user changes (via key prop)
function ProfileForm({
  user,
  refreshUser,
}: {
  user: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  };
  refreshUser: () => Promise<void>;
}) {
  const t = useTranslations("profile");
  const ta = useTranslations("account");
  // Initialize form data from user props - no useEffect needed
  const [formData, setFormData] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const emailChanged = formData.email.trim() !== user.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setSaving(true);

    const result = await updateCustomer({
      ...formData,
      ...(emailChanged && { current_password: currentPassword }),
    });

    if (result.success) {
      toast.success(t("profileUpdated"));
      setCurrentPassword("");
      setShowCurrentPassword(false);
      await refreshUser();
    } else {
      const message = result.error || t("failedToUpdate");
      if (emailChanged && /current password/i.test(message)) {
        setPasswordError(message);
      } else {
        setError(message);
      }
    }

    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("profile")}</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field>
                <FieldLabel htmlFor="first_name">{t("firstName")}</FieldLabel>
                <Input
                  type="text"
                  id="first_name"
                  autoComplete="given-name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="last_name">{t("lastName")}</FieldLabel>
                <Input
                  type="text"
                  id="last_name"
                  autoComplete="family-name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="email">{t("emailAddress")}</FieldLabel>
              <Input
                type="email"
                autoComplete="email"
                spellCheck={false}
                id="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </Field>

            {emailChanged && (
              <Field>
                <FieldLabel htmlFor="current_password">
                  {t("currentPassword")}
                </FieldLabel>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    id="current_password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="••••••••"
                    className="pr-10"
                    aria-invalid={passwordError ? true : undefined}
                    aria-describedby="current_password_help"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      aria-label={
                        showCurrentPassword
                          ? ta("hidePassword")
                          : ta("showPassword")
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
                <p
                  id="current_password_help"
                  className={`text-sm ${
                    passwordError ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {passwordError || t("currentPasswordHelp")}
                </p>
              </Field>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {t("accountInformation")}
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {t("accountId")}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{user.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {t("email")}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

// Main page component - uses key prop to reset form when user changes
export default function ProfilePage() {
  const t = useTranslations("profile");
  const { user, refreshUser } = useAuth();

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("loadingProfile")}</p>
      </div>
    );
  }

  // Use key={user.id} to reset the form component when user changes
  return <ProfileForm key={user.id} user={user} refreshUser={refreshUser} />;
}
