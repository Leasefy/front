'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, ChevronLeft, ChevronRight, ChevronDown, LogOut, Menu, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/lib/context/SidebarContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
  badge?: number;
  children?: NavItem[];
}

export interface PlanSidebarProps {
  navItems: NavItem[];
  logo?: {
    title: string;
    href: string;
  };
  className?: string;
  defaultCollapsed?: boolean;
  showUpgrade?: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  depth?: number;
}

function NavItemComponent({ item, isActive, isCollapsed, onClick, depth = 0 }: NavItemComponentProps) {
  const Icon = item.icon;
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const pathname = usePathname();

  const checkChildActive = (children: NavItem[]) => {
    return children.some(child => {
      if (child.exact) return pathname === child.href;
      return pathname.startsWith(child.href);
    });
  };

  const isChildActive = hasChildren && checkChildActive(item.children!);

  if (item.disabled) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2 text-[13px]',
          'text-[#D1D5DB] cursor-not-allowed',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="w-[18px] h-[18px] stroke-[1.5px]" />
        {!isCollapsed && <span>{item.label}</span>}
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 text-[13px]',
            'transition-colors duration-100',
            (isActive || isChildActive)
              ? 'text-[#111827] font-medium'
              : 'text-[#6B7280] hover:text-[#111827]',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Icon className={cn(
            'w-[18px] h-[18px] stroke-[1.5px]',
            (isActive || isChildActive) ? 'text-[#111827]' : 'text-[#9CA3AF]'
          )} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-[#9CA3AF] transition-transform duration-150',
                  isExpanded && 'rotate-180'
                )}
              />
            </>
          )}
        </button>
        {!isCollapsed && isExpanded && (
          <div className="ml-6 border-l border-[#E5E7EB]">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                isActive={child.exact ? pathname === child.href : pathname.startsWith(child.href)}
                isCollapsed={false}
                onClick={onClick}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2 text-[13px] relative',
        'transition-colors duration-100',
        isActive
          ? 'text-[#111827] font-medium bg-[#F9FAFB]'
          : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFA]',
        isCollapsed && 'justify-center px-2',
        depth > 0 && 'pl-4'
      )}
      title={isCollapsed ? item.label : undefined}
    >
      {/* Active indicator - vertical line on left */}
      {isActive && depth === 0 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#111827]" />
      )}
      <Icon className={cn(
        'w-[18px] h-[18px] stroke-[1.5px]',
        isActive ? 'text-[#111827]' : 'text-[#9CA3AF]'
      )} />
      {!isCollapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 bg-[#111827] text-white text-[10px] font-medium flex items-center justify-center rounded-sm">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

interface SidebarContentProps {
  navItems: NavItem[];
  logo?: PlanSidebarProps['logo'];
  isCollapsed: boolean;
  onCollapse: () => void;
  onItemClick?: () => void;
  showUpgrade?: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
  showCollapseButton?: boolean;
}

function SidebarContent({
  navItems,
  logo,
  isCollapsed,
  onCollapse,
  onItemClick,
  showCollapseButton = true,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Collapse Button - Circle at edge */}
      {showCollapseButton && (
        <button
          onClick={onCollapse}
          className={cn(
            'absolute top-5 -right-3 z-50',
            'w-6 h-6 rounded-full bg-white border border-[#E5E7EB]',
            'flex items-center justify-center',
            'text-[#9CA3AF] hover:text-[#6B7280]',
            'shadow-sm transition-colors'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      )}

      {/* Logo - PLan style with star */}
      <div className={cn(
        'h-14 flex items-center border-b border-[#F3F4F6]',
        isCollapsed ? 'justify-center px-2' : 'px-5'
      )}>
        <Link href={logo?.href || '/'} className="flex items-center gap-2" onClick={onItemClick}>
          <span className="text-xl">✦</span>
          {!isCollapsed && (
            <span className="text-[15px] font-semibold text-[#111827] tracking-tight">
              {logo?.title || 'PLan'}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto py-4',
        isCollapsed ? 'px-1' : 'px-1'
      )}>
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              isActive={isActive(item)}
              isCollapsed={isCollapsed}
              onClick={onItemClick}
            />
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-[#F3F4F6] py-2">
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-2 text-[13px] text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFA] cursor-pointer',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <HelpCircle className="w-[18px] h-[18px] stroke-[1.5px] text-[#9CA3AF]" />
          {!isCollapsed && <span>Ayuda</span>}
        </div>
      </div>
    </div>
  );
}

export function PlanSidebar({
  navItems,
  logo,
  className,
  defaultCollapsed = false,
  showUpgrade = false,
  upgradeHref,
  upgradeLabel,
}: PlanSidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0',
          'bg-white border-r border-[#F3F4F6]',
          'transition-all duration-200',
          isCollapsed ? 'lg:w-16' : 'lg:w-[240px]',
          className
        )}
      >
        <SidebarContent
          navItems={navItems}
          logo={logo}
          isCollapsed={isCollapsed}
          onCollapse={toggle}
          showUpgrade={showUpgrade}
          upgradeHref={upgradeHref}
          upgradeLabel={upgradeLabel}
        />
      </aside>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-3 left-3 z-40 bg-white shadow-sm border border-[#E5E7EB] rounded-sm"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[240px] p-0 bg-white">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de navegacion</SheetTitle>
          </SheetHeader>
          <SidebarContent
            navItems={navItems}
            logo={logo}
            isCollapsed={false}
            onCollapse={() => {}}
            onItemClick={() => setMobileOpen(false)}
            showUpgrade={showUpgrade}
            upgradeHref={upgradeHref}
            upgradeLabel={upgradeLabel}
            showCollapseButton={false}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

