"use client";

import type { StoreOptionType, StoreVariant } from "@spree/sdk";
import { useMemo } from "react";

interface VariantPickerProps {
  variants: StoreVariant[];
  optionTypes: StoreOptionType[];
  selectedVariant: StoreVariant | null;
  onVariantChange: (variant: StoreVariant | null) => void;
}

export function VariantPicker({
  variants,
  optionTypes,
  selectedVariant,
  onVariantChange,
}: VariantPickerProps) {
  // Build option values map by option type
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

  // Get selected options from current variant
  const selectedOptions = useMemo(() => {
    const options: Record<string, string> = {};
    if (selectedVariant) {
      selectedVariant.option_values.forEach((ov) => {
        options[ov.option_type_id] = ov.name;
      });
    }
    return options;
  }, [selectedVariant]);

  // Precompute variant lookup structures to avoid O(n) iteration per option value
  const { variantOptionMaps, optionValueDetailsMap } = useMemo(() => {
    const maps = variants.map((variant) => {
      const optionsMap: Record<string, string> = {};
      variant.option_values.forEach((ov) => {
        optionsMap[ov.option_type_id] = ov.name;
      });
      return { variant, optionsMap };
    });

    // Build option value details index: "typeId:name" -> option value object
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

  // Find variant matching selected options
  const findVariant = (
    newOptions: Record<string, string>,
  ): StoreVariant | null => {
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

  // Check if an option value is available given current selections
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

  // Check if a variant with these options is purchasable
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

  // Get option value details from precomputed map (O(1) lookup)
  const getOptionValueDetails = (
    optionTypeId: string,
    optionValueName: string,
  ): StoreVariant["option_values"][0] | null => {
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
        const isColorOption = optionType.name.toLowerCase() === "color";

        return (
          <div key={optionType.id}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-900">
                {optionType.presentation}
              </span>
              {selectedValue && (
                <span className="text-sm text-gray-500">
                  {getOptionValueDetails(optionType.id, selectedValue)
                    ?.presentation || selectedValue}
                </span>
              )}
            </div>

            {isColorOption ? (
              // Color swatches
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
                      key={value}
                      onClick={() => handleOptionSelect(optionType.id, value)}
                      disabled={!isAvailable}
                      title={optionValue?.presentation || value}
                      className={`
                        w-10 h-10 rounded-full border-2 transition-all relative
                        ${isSelected ? "border-primary-600 ring-2 ring-primary-600 ring-offset-2" : "border-gray-200"}
                        ${!isAvailable ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}
                        ${!isPurchasable && isAvailable ? "opacity-50" : ""}
                      `}
                      style={{
                        backgroundColor: value
                          .toLowerCase()
                          .replace(/\s+/g, ""),
                      }}
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
              // Regular option buttons
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
                      key={value}
                      onClick={() => handleOptionSelect(optionType.id, value)}
                      disabled={!isAvailable}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-xl border transition-all relative
                        ${
                          isSelected
                            ? "border-primary-600 bg-primary-50 text-primary-500"
                            : "border-gray-200 text-gray-700 hover:border-gray-400"
                        }
                        ${!isAvailable ? "opacity-30 cursor-not-allowed line-through" : "cursor-pointer"}
                        ${!isPurchasable && isAvailable ? "opacity-50" : ""}
                      `}
                    >
                      {optionValue?.presentation || value}
                      {!isPurchasable && isAvailable && (
                        <span className="ml-1 text-xs text-gray-400">
                          (Out of stock)
                        </span>
                      )}
                    </button>
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
