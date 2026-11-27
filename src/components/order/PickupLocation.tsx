import type { StockLocation } from "@spree/sdk";
import { useTranslations } from "next-intl";

interface PickupLocationProps {
  location: StockLocation;
}

export function PickupLocation({ location }: PickupLocationProps) {
  const t = useTranslations("orderPlaced");
  const cityLine = [
    location.city,
    [location.state_code, location.zipcode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mt-2 text-sm text-gray-600 space-y-0.5">
      <p className="text-xs font-semibold text-gray-900">
        {t("pickupLocation")}
      </p>
      <p className="font-medium text-gray-800">{location.name}</p>
      {location.address1 && <p>{location.address1}</p>}
      {cityLine && <p>{cityLine}</p>}
      {location.country_name && <p>{location.country_name}</p>}
      {location.pickup_instructions && (
        <p className="mt-1 text-xs text-gray-500">
          {location.pickup_instructions}
        </p>
      )}
    </div>
  );
}
