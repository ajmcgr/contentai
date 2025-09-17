'use client';
import React from 'react';

/** Minimal stand-ins that render children without behavior */
export function TooltipProvider({ children, delayDuration, ...props }: { children: React.ReactNode; delayDuration?: number; [key: string]: any }) {
  return <>{children}</>;
}
export function Tooltip({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <>{children}</>;
}
export function TooltipTrigger({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: any }) {
  return <>{children}</>;
}

// Create a proper component with forwardRef for TooltipContent
export const TooltipContent = React.forwardRef<HTMLDivElement, { children?: React.ReactNode; [key: string]: any }>(
  ({ children, ...props }, ref) => {
    return <div ref={ref}>{children}</div>;
  }
);
TooltipContent.displayName = "TooltipContent";

/** Radix-style exports that shadcn expects */
export const Provider = TooltipProvider;
export const Root = Tooltip;
export const Trigger = TooltipTrigger;
export const Content = TooltipContent;

/** If your code imports other exports, stub them here as passthroughs */
export const TooltipArrow = ({ children }: any) => <>{children}</>;
export const TooltipPortal = ({ children }: any) => <>{children}</>;
export default Tooltip;