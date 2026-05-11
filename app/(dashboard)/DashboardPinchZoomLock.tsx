"use client";

import { useEffect } from "react";

const ROOT_CLASS = "dashboard-pinch-lock";

/** 대시보드에서 핀치·Ctrl+휠 뷰포트 줌으로 레이아웃이 깨지는 것을 완화합니다. */
export default function DashboardPinchZoomLock() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(ROOT_CLASS);

    const blockGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("gesturestart", blockGesture);
    document.addEventListener("gesturechange", blockGesture);
    document.addEventListener("gestureend", blockGesture);

    const blockCtrlWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", blockCtrlWheel, { passive: false });

    return () => {
      root.classList.remove(ROOT_CLASS);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
      window.removeEventListener("wheel", blockCtrlWheel);
    };
  }, []);

  return null;
}
