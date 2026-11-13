import { CartFooter } from "@/components/cart/CartFooter";

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1">{children}</div>
      <CartFooter />
    </div>
  );
}
