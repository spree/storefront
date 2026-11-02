"use client";

import type { OptionType, Variant } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

interface VariantPickerProps {
  variants: Variant[];
  optionTypes: OptionType[];
  selectedVariant: Variant | null;
  onVariantChange: (variant: Variant | null) => void;
}

export function VariantPicker({
  variants,
  optionTypes,
  selectedVariant,
  onVariantChange,
}: VariantPickerProps) {
  const t = useTranslations("products");
  const optionValuesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    optionTypes.forEach((optionType) => {
      map[optionType.id] = new Set();
    });

    variants.forEach((variant) => {
      variant.option_values.forEach((optionValue) => {
        if (map[optionValue.option_type_id]) {
          map[optionValue.option_type_id].add(optionValue.name);
        }
      });
    });

    return map;
  }, [variants, optionTypes]);

  const selectedOptions = useMemo(() => {
    const options: Record<string, string> = {};
    if (selectedVariant) {
      selectedVariant.option_values.forEach((ov) => {
        options[ov.option_type_id] = ov.name;
      });
    }
    return options;
  }, [selectedVariant]);

  const { variantOptionMaps, optionValueDetailsMap } = useMemo(() => {
    const maps = variants.map((variant) => {
      const optionsMap: Record<string, string> = {};
      variant.option_values.forEach((ov) => {
        optionsMap[ov.option_type_id] = ov.name;
      });
      return { variant, optionsMap };
    });

    const detailsMap: Record<string, (typeof variants)[0]["option_values"][0]> =
      {};
    for (const variant of variants) {
      for (const ov of variant.option_values) {
        const key = `${ov.option_type_id}:${ov.name}`;
        if (!detailsMap[key]) {
          detailsMap[key] = ov;
        }
      }
    }

    return { variantOptionMaps: maps, optionValueDetailsMap: detailsMap };
  }, [variants]);

  const findVariant = (newOptions: Record<string, string>): Variant | null => {
    const optionCount = Object.keys(newOptions).length;
    return (
      variantOptionMaps.find(
        ({ variant, optionsMap }) =>
          variant.option_values.length === optionCount &&
          Object.entries(newOptions).every(
            ([typeId, value]) => optionsMap[typeId] === value,
          ),
      )?.variant || null
    );
  };

  const isOptionAvailable = (
    optionTypeId: string,
    optionValue: string,
  ): boolean => {
    const testOptions = { ...selectedOptions, [optionTypeId]: optionValue };
    return variantOptionMaps.some(({ optionsMap }) =>
      Object.entries(testOptions).every(
        ([typeId, value]) => optionsMap[typeId] === value,
      ),
    );
  };

  const isOptionPurchasable = (
    optionTypeId: string,
    optionValue: string,
  ): boolean => {
    const testOptions = { ...selectedOptions, [optionTypeId]: optionValue };
    return variantOptionMaps.some(
      ({ variant, optionsMap }) =>
        variant.purchasable &&
        Object.entries(testOptions).every(
          ([typeId, value]) => optionsMap[typeId] === value,
        ),
    );
  };

  const handleOptionSelect = (optionTypeId: string, optionValue: string) => {
    const newOptions = { ...selectedOptions, [optionTypeId]: optionValue };
    const newVariant = findVariant(newOptions);
    onVariantChange(newVariant);
  };

  const getOptionValueDetails = (
    optionTypeId: string,
    optionValueName: string,
  ): Variant["option_values"][0] | null => {
    return optionValueDetailsMap[`${optionTypeId}:${optionValueName}`] || null;
  };

  if (optionTypes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {optionTypes.map((optionType) => {
        const values = Array.from(optionValuesMap[optionType.id] || []);
        const selectedValue = selectedOptions[optionType.id];
        const isColor = optionType.kind === "color_swatch";

        return (
          <div key={optionType.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-900">
                {optionType.label}
              </span>
              {selectedValue && (
                <span className="text-sm text-gray-500">
                  {getOptionValueDetails(optionType.id, selectedValue)?.label ||
                    selectedValue}
                </span>
              )}
            </div>

            {isColor ? (
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const optionValue = getOptionValueDetails(
                    optionType.id,
                    value,
                  );
                  const isSelected = selectedValue === value;
                  const isAvailable = isOptionAvailable(optionType.id, value);
                  const isPurchasable = isOptionPurchasable(
                    optionType.id,
                    value,
                  );

                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => handleOptionSelect(optionType.id, value)}
                      disabled={!isAvailable}
                      title={optionValue?.label || value}
                      className={`
                        w-10 h-10 rounded-lg border transition-[border-color,box-shadow,opacity] relative overflow-hidden
                        ${isSelected ? "border-gray-900 ring-2 ring-primary ring-offset-2" : "border-gray-200"}
                        ${!isAvailable ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                        ${!isPurchasable && isAvailable ? "opacity-50" : ""}
                      `}
                      style={
                        optionValue?.image_url
                          ? {
                              backgroundImage: `url(${optionValue.image_url})`,
                              backgroundSize: "cover",
                            }
                          : optionValue?.color_code
                            ? { backgroundColor: optionValue.color_code }
                            : { backgroundColor: "#e5e7eb" }
                      }
                    >
                      {!isPurchasable && isAvailable && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-full h-0.5 bg-gray-400 rotate-45 absolute" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const optionValue = getOptionValueDetails(
                    optionType.id,
                    value,
                  );
                  const isSelected = selectedValue === value;
                  const isAvailable = isOptionAvailable(optionType.id, value);
                  const isPurchasable = isOptionPurchasable(
                    optionType.id,
                    value,
                  );

                  return (
                    <Button
                      type="button"
                      key={value}
                      variant="outline"
                      onClick={() => handleOptionSelect(optionType.id, value)}
                      disabled={!isAvailable}
                      className={
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 border-primary"
                          : ""
                      }
                    >
                      {optionValue?.label || value}
                      {!isPurchasable && isAvailable && (
                        <span className="ml-1 text-xs text-gray-400">
                          {t("outOfStockVariant")}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
