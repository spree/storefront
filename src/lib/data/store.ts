"use server";

import { getStore as _getStore } from "@spree/next";

export async function getStore() {
  return _getStore();
}
