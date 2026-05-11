import { useCallback } from "react";
import { NotificationType } from "../types";

export const useNotification = () => {
  const showNotification = useCallback(
    (message: string, type: NotificationType = "info") => {
      const existing = document.querySelectorAll(".apex-toast");
      existing.forEach((el) => el.remove());

      const toast = document.createElement("div");
      toast.className = `apex-toast toast toast-${type}`;

      const icon =
        type === "success"
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
          : type === "error"
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

      toast.innerHTML = `${icon}<span>${message}</span>`;
      document.body.appendChild(toast);

      const live = document.getElementById("apex-live");
      if (live) { live.textContent = ""; requestAnimationFrame(() => { live.textContent = message; }); }

      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-8px)";
        toast.style.transition = "opacity 0.2s ease, transform 0.2s ease";
        setTimeout(() => toast.remove(), 250);
      }, 3000);
    },
    []
  );

  return { showNotification };
};
