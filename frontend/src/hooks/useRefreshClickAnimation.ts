import { useEffect } from "react";

// edited by wali: Give every refresh-button click one complete turn, even when fetching ends quickly.
export function useRefreshClickAnimation() {
  useEffect(() => {
    const animateRefreshIcon = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("button");
      if (!button) return;

      button.querySelectorAll<SVGSVGElement>("svg.lucide-refresh-cw").forEach((icon) => {
        if (typeof icon.animate !== "function") return;

        icon.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
          { duration: 650, easing: "ease-in-out", iterations: 1 }
        );
      });
    };

    document.addEventListener("click", animateRefreshIcon);
    return () => document.removeEventListener("click", animateRefreshIcon);
  }, []);
}
