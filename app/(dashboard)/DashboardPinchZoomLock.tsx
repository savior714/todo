"use client";

import { useEffect } from "react";

const ROOT_CLASS = "dashboard-pinch-lock";
const VIEWPORT_LOCK_CONTENT =
  "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

/** 대시보드에서 핀치·Ctrl+휠 뷰포트 줌으로 레이아웃이 깨지는 것을 완화합니다. */
export default function DashboardPinchZoomLock() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(ROOT_CLASS);
    const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previousViewportContent = viewportMeta?.getAttribute("content") ?? null;
    viewportMeta?.setAttribute("content", VIEWPORT_LOCK_CONTENT);

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

    const blockMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener("touchstart", blockMultiTouch, { passive: false });
    document.addEventListener("touchmove", blockMultiTouch, { passive: false });

    let lastTouchEndAt = 0;
    const blockDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEndAt < 300) {
        e.preventDefault();
      }
      lastTouchEndAt = now;
    };
    document.addEventListener("touchend", blockDoubleTapZoom, { passive: false });

    return () => {
      root.classList.remove(ROOT_CLASS);
      if (viewportMeta) {
        if (previousViewportContent === null) {
          viewportMeta.removeAttribute("content");
        } else {
          viewportMeta.setAttribute("content", previousViewportContent);
        }
      }
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
      window.removeEventListener("wheel", blockCtrlWheel);
      document.removeEventListener("touchstart", blockMultiTouch);
      document.removeEventListener("touchmove", blockMultiTouch);
      document.removeEventListener("touchend", blockDoubleTapZoom);
    };
  }, []);

  return null;
}
