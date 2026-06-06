import * as React from "react";

interface PageWrapperProps {
  className?: string;
  children: React.ReactNode;
}

export function PageWrapper({ className = "", children }: PageWrapperProps) {
  return (
    <div className={`pt-16 ${className}`}>
      {children}
    </div>
  );
}
