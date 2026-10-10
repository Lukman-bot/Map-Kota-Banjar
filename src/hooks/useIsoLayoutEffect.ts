import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect di browser, useEffect di server (menghindari peringatan saat SSR). */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
