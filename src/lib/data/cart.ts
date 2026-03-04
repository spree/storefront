"use server";

import {
  clearCart as _clearCart,
  getCart as _getCart,
  getOrCreateCart as _getOrCreateCart,
  addItem,
  associateCart,
  removeItem,
  updateItem,
} from "@spree/next";
import { actionResult } from "./utils";

export async function getCart() {
  return _getCart();
}

export async function getOrCreateCart() {
  return _getOrCreateCart();
}

export async function clearCart() {
  return actionResult(async () => {
    await _clearCart();
    return {};
  }, "Failed to clear cart");
}

export async function addToCart(variantId: string, quantity: number) {
  return actionResult(async () => {
    const cart = await addItem(variantId, quantity);
    return { cart };
  }, "Failed to add item to cart");
}

export async function updateCartItem(lineItemId: string, quantity: number) {
  return actionResult(async () => {
    const cart = await updateItem(lineItemId, { quantity });
    return { cart };
  }, "Failed to update cart item");
}

export async function removeCartItem(lineItemId: string) {
  return actionResult(async () => {
    const cart = await removeItem(lineItemId);
    return { cart };
  }, "Failed to remove cart item");
}

export async function associateCartWithUser() {
  return actionResult(async () => {
    await associateCart();
    return {};
  }, "Failed to associate cart");
}
