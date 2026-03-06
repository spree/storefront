import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";
import { DrawerShell } from "@/components/ui/DrawerShell";
import { getNavItemChildren, taxonHref } from "./helpers";
import type { NavItem } from "./types";

interface MobileNavItemProps {
  navItem: NavItem;
  isExpanded: boolean;
  onToggle: () => void;
  basePath: string;
  onClose: () => void;
}

function MobileNavItem({
  navItem,
  isExpanded,
  onToggle,
  basePath,
  onClose,
}: MobileNavItemProps) {
  if (navItem.kind === "link") {
    return (
      <li>
        <Link
          href={navItem.href}
          className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          {navItem.label}
        </Link>
      </li>
    );
  }

  const { topLevel: children, viewAllHref } = getNavItemChildren(
    navItem,
    basePath,
  );

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        {navItem.label}
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="bg-gray-50 pb-2">
          {children.length > 0 && (
            <ul className="space-y-1 px-4">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={taxonHref(basePath, child)}
                    className="block py-2 pl-4 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={onClose}
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={viewAllHref}
            className="block px-4 pl-8 py-2 text-xs font-bold text-primary-500 uppercase tracking-wide hover:text-primary-700 transition-colors"
            onClick={onClose}
          >
            View all {navItem.label.toLowerCase()}
          </Link>
        </div>
      )}
    </li>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  navItems: NavItem[];
  expandedSections: Set<string>;
  toggleSection: (key: string) => void;
  basePath: string;
  onClose: () => void;
}

export function MobileDrawer({
  isOpen,
  navItems,
  expandedSections,
  toggleSection,
  basePath,
  onClose,
}: MobileDrawerProps) {
  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Menu"
      side="left"
      maxWidth="max-w-sm"
    >
      <ul className="divide-y divide-gray-100">
        {navItems.map((navItem) => (
          <MobileNavItem
            key={navItem.key}
            navItem={navItem}
            isExpanded={expandedSections.has(navItem.key)}
            onToggle={() => toggleSection(navItem.key)}
            basePath={basePath}
            onClose={onClose}
          />
        ))}
      </ul>
    </DrawerShell>
  );
}
