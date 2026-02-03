'use client';

import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { cn } from '@/lib/utils';

// ============================================================================
// Hover Card Root
// ============================================================================

const HoverCard = HoverCardPrimitive.Root;

// ============================================================================
// Hover Card Trigger
// ============================================================================

const HoverCardTrigger = HoverCardPrimitive.Trigger;

// ============================================================================
// Hover Card Content
// ============================================================================

export interface HoverCardContentProps
  extends React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> {
  arrow?: boolean;
}

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  HoverCardContentProps
>(({ className, align = 'center', sideOffset = 4, arrow = true, children, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      'z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  >
    {children}
    {arrow && (
      <HoverCardPrimitive.Arrow className="fill-popover" />
    )}
  </HoverCardPrimitive.Content>
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

// ============================================================================
// User Hover Card (common pattern)
// ============================================================================

export interface UserHoverCardProps {
  trigger: React.ReactNode;
  name: string;
  username?: string;
  avatar?: string;
  bio?: string;
  stats?: Array<{ label: string; value: string | number }>;
  actions?: React.ReactNode;
  className?: string;
  openDelay?: number;
  closeDelay?: number;
}

function UserHoverCard({
  trigger,
  name,
  username,
  avatar,
  bio,
  stats,
  actions,
  className,
  openDelay = 200,
  closeDelay = 300,
}: UserHoverCardProps) {
  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>
        {trigger}
      </HoverCardTrigger>
      <HoverCardContent className={cn('w-80', className)}>
        <div className="flex gap-4">
          {avatar && (
            <div className="shrink-0">
              <img
                src={avatar}
                alt={name}
                className="h-12 w-12 rounded-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-semibold">{name}</h4>
            {username && (
              <p className="text-sm text-muted-foreground">@{username}</p>
            )}
          </div>
        </div>
        {bio && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{bio}</p>
        )}
        {stats && stats.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-sm">
                <span className="font-semibold text-foreground">{stat.value}</span>{' '}
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
        {actions && (
          <div className="mt-4 flex gap-2">
            {actions}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

// ============================================================================
// Info Hover Card (for help tooltips)
// ============================================================================

export interface InfoHoverCardProps {
  trigger: React.ReactNode;
  title?: string;
  description: React.ReactNode;
  learnMoreHref?: string;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

function InfoHoverCard({
  trigger,
  title,
  description,
  learnMoreHref,
  className,
  side = 'top',
  align = 'center',
}: InfoHoverCardProps) {
  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        {trigger}
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} className={cn('w-72', className)}>
        {title && (
          <h4 className="mb-2 text-sm font-semibold">{title}</h4>
        )}
        <div className="text-sm text-muted-foreground">
          {description}
        </div>
        {learnMoreHref && (
          <a
            href={learnMoreHref}
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more →
          </a>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

// ============================================================================
// Preview Hover Card (for links)
// ============================================================================

export interface PreviewHoverCardProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  image?: string;
  url?: string;
  className?: string;
}

function PreviewHoverCard({
  trigger,
  title,
  description,
  image,
  url,
  className,
}: PreviewHoverCardProps) {
  return (
    <HoverCard openDelay={400} closeDelay={200}>
      <HoverCardTrigger asChild>
        {trigger}
      </HoverCardTrigger>
      <HoverCardContent className={cn('w-80 p-0 overflow-hidden', className)}>
        {image && (
          <div className="aspect-video w-full bg-muted">
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <h4 className="text-sm font-semibold line-clamp-1">{title}</h4>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
          {url && (
            <p className="mt-2 text-xs text-muted-foreground/60 truncate">{url}</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  UserHoverCard,
  InfoHoverCard,
  PreviewHoverCard,
};
