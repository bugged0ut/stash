import React, { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const SWIPE_DISTANCE = 50;

interface IProps {
  src: string;
  alt: string;
  video: boolean;
  onNext: () => void;
  onPrev: () => void;
}

// Pinch (and trackpad pinch) zooms the details-page picture. One finger pans
// while zoomed. A horizontal swipe changes image only at the default size.
export const ZoomableVisual: React.FC<IProps> = ({
  src,
  alt,
  video,
  onNext,
  onPrev,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;

  const setMedia = useCallback(
    (node: HTMLImageElement | HTMLVideoElement | null) => {
      mediaRef.current = node;
    },
    []
  );

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let start: {
      x: number;
      y: number;
      panX: number;
      panY: number;
    } | null = null;
    let pinchDist = 0;
    let pinchZoom = 1;
    let pinching = false;
    let mouse: {
      x: number;
      y: number;
      panX: number;
      panY: number;
    } | null = null;

    function clamp(x: number, y: number, z: number) {
      const media = mediaRef.current;
      if (!frame || !media || z <= 1) return { x: 0, y: 0 };
      const maxX = Math.max(0, (media.offsetWidth * z - frame.clientWidth) / 2);
      const maxY = Math.max(
        0,
        (media.offsetHeight * z - frame.clientHeight) / 2
      );
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    }

    function applyZoom(next: number, x: number, y: number) {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      setZoom(z);
      setPan(clamp(x, y, z));
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length >= 2) {
        event.preventDefault();
        pinching = true;
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        pinchDist = Math.hypot(dx, dy);
        pinchZoom = zoomRef.current;
        start = null;
        return;
      }
      const touch = event.touches[0];
      const { target } = event;
      if (target instanceof HTMLVideoElement) {
        const rect = target.getBoundingClientRect();
        if (touch.clientY > rect.bottom - 48) {
          start = null;
          return;
        }
      }
      start = {
        x: touch.clientX,
        y: touch.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length >= 2 && pinchDist > 0) {
        event.preventDefault();
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const scale = Math.hypot(dx, dy) / pinchDist;
        applyZoom(pinchZoom * scale, panRef.current.x, panRef.current.y);
        return;
      }
      if (!start || event.touches.length !== 1 || pinching) return;
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (zoomRef.current > 1) {
        event.preventDefault();
        setPan(clamp(start.panX + dx, start.panY + dy, zoomRef.current));
      } else if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault();
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (event.touches.length > 0) return;
      if (pinching) {
        pinching = false;
        pinchDist = 0;
        start = null;
        return;
      }
      if (start && zoomRef.current <= 1) {
        const touch = event.changedTouches[0];
        const dx = (touch?.clientX ?? start.x) - start.x;
        const dy = (touch?.clientY ?? start.y) - start.y;
        if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) onNextRef.current();
          else onPrevRef.current();
        }
      }
      start = null;
    }

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && zoomRef.current <= 1) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.002);
      applyZoom(zoomRef.current * factor, panRef.current.x, panRef.current.y);
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (zoomRef.current <= 1) return;
      mouse = {
        x: event.clientX,
        y: event.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    }

    function onPointerMove(event: PointerEvent) {
      if (!mouse) return;
      const dx = event.clientX - mouse.x;
      const dy = event.clientY - mouse.y;
      setPan(clamp(mouse.panX + dx, mouse.panY + dy, zoomRef.current));
    }

    function onPointerUp() {
      mouse = null;
    }

    frame.addEventListener("touchstart", onTouchStart, { passive: false });
    frame.addEventListener("touchmove", onTouchMove, { passive: false });
    frame.addEventListener("touchend", onTouchEnd);
    frame.addEventListener("touchcancel", onTouchEnd);
    frame.addEventListener("wheel", onWheel, { passive: false });
    frame.addEventListener("pointerdown", onPointerDown);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerup", onPointerUp);
    frame.addEventListener("pointercancel", onPointerUp);

    return () => {
      frame.removeEventListener("touchstart", onTouchStart);
      frame.removeEventListener("touchmove", onTouchMove);
      frame.removeEventListener("touchend", onTouchEnd);
      frame.removeEventListener("touchcancel", onTouchEnd);
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("pointerdown", onPointerDown);
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerup", onPointerUp);
      frame.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  const touchAction = zoom > 1 ? "none" : "pan-y";

  const mediaStyle: React.CSSProperties = {
    touchAction,
    transform,
    transformOrigin: "center center",
  };

  return (
    <div
      className="image-zoom-frame"
      ref={frameRef}
      style={{ cursor: zoom > 1 ? "grab" : undefined, touchAction }}
    >
      {video ? (
        <video
          ref={setMedia}
          className="m-sm-auto no-gutter image-image"
          src={src}
          loop
          autoPlay
          playsInline
          controls
          draggable={false}
          style={mediaStyle}
        />
      ) : (
        <img
          ref={setMedia}
          className="m-sm-auto no-gutter image-image"
          alt={alt}
          src={src}
          draggable={false}
          style={mediaStyle}
        />
      )}
    </div>
  );
};
