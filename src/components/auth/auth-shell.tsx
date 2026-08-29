"use client";

import { useEffect, useState } from "react";
import { useBranding } from "@/components/branding-provider";
import type { AuthShellProps } from "./types";

import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  icon: Icon,
  title,
  description,
  children,
  footer,
  steps,
}: AuthShellProps) {
  const branding = useBranding();
  const [iconUrl, setIconUrl] = useState(branding.iconUrl);
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    setIconUrl(branding.iconUrl);
    setIconFailed(false);
  }, [branding.iconUrl]);

  return (
    <div className="min-h-dvh bg-[#f1f4fa] px-4 py-6 text-neutral-900 dark:bg-[#0f1013] dark:text-neutral-100 sm:px-6 lg:flex lg:items-center lg:px-10 lg:py-10">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <main className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-4xl bg-white shadow-xl dark:border dark:border-neutral-800 dark:bg-[#1a1b20] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="flex flex-col p-7 sm:p-10 lg:p-14">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center overflow-hidden">
              {iconFailed ? (
                <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              ) : (
                <img
                  src={iconUrl}
                  onError={() => {
                    if (iconUrl !== "/icon-96.png") setIconUrl("/icon-96.png");
                    else setIconFailed(true);
                  }}
                  alt=""
                  className="h-8 w-8 object-contain"
                />
              )}
            </span>
            <span className="truncate text-md font-semibold text-neutral-800 dark:text-neutral-200">
              {branding.appName}
            </span>
          </div>

          <div className="mt-2 lg:mt-8">
            <h1 className="max-w-md text-xl font-medium leading-tight tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-5 max-w-md text-base leading-7 text-neutral-600 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col justify-center p-7 sm:p-10 lg:p-14">
          {steps && (
            <div className="mb-7 flex flex-wrap gap-2 text-xs font-semibold">
              {steps.map((step, index) => (
                <span key={step.label} className="flex items-center gap-2">
                  <span
                    className={
                      step.active ? "text-blue-700" : "text-neutral-400"
                    }
                  >
                    {index + 1} {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="text-neutral-300">/</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="w-full">{children}</div>
          {footer && (
            <div className="mt-8 text-sm font-medium text-blue-700">
              {footer}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
