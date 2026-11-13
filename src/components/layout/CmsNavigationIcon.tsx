import {
  Baby,
  BookOpen,
  Camera,
  Flower2,
  Gem,
  Gift,
  Heart,
  Home,
  Leaf,
  type LucideIcon,
  Music,
  Package,
  Palette,
  PawPrint,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Truck,
  Utensils,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  home: Home,
  gift: Gift,
  tag: Tag,
  heart: Heart,
  star: Star,
  sparkles: Sparkles,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  gem: Gem,
  "paw-print": PawPrint,
  "flower-2": Flower2,
  "book-open": BookOpen,
  camera: Camera,
  palette: Palette,
  leaf: Leaf,
  truck: Truck,
  package: Package,
  music: Music,
  baby: Baby,
  utensils: Utensils,
};

export function CmsNavigationIcon({
  name,
  className = "size-4",
}: {
  name?: string;
  className?: string;
}) {
  const Icon = name ? icons[name] : undefined;
  return Icon ? (
    <Icon
      className={className}
      aria-hidden="true"
      data-cms-navigation-icon={name}
    />
  ) : null;
}
