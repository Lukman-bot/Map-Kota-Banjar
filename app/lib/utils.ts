import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Jeda animasi bertahap (stagger) untuk elemen ke-`index` dalam sebuah daftar. */
export function stagger(index: number, step = 60, base = 0): CSSProperties {
  return { animationDelay: `${base + index * step}ms` };
}
