import { useCountUp } from "~/lib/use-count-up";

/** Angka yang menghitung naik saat tampil. */
export function AnimatedNumber({
  value,
  duration,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const shown = useCountUp(value, duration);
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {shown}
    </span>
  );
}
