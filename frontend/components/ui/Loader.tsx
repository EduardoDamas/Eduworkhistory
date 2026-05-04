"use client";

type LoaderSize = "sm" | "md" | "lg";

const sizeClass: Record<LoaderSize, string> = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Loader({ size = "md" }: { size?: LoaderSize }) {
  return <span className={`${sizeClass[size]} inline-block animate-spin rounded-full border-current border-t-transparent`} />;
}
