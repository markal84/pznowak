'use client';

import {useEffect, useRef, useState} from 'react';

/** A fixed image stage: only the optically magnified overlay moves. */
export default function JewelLoupe({src, alt}: {src: string; alt: string}) {
  const stage = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(false);
  const [size, setSize] = useState({width: 0, height: 0});
  const [point, setPoint] = useState({x: .5, y: .55});

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({width: entry.contentRect.width, height: entry.contentRect.height});
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const radius = Math.min(110, size.width * .26);
  const x = point.x * size.width;
  const y = point.y * size.height;
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPoint({
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    });
  };

  return <div className="loupe-study">
    <div ref={stage} id="loupe-stage" className={`detail-view loupe-stage${active ? ' is-active' : ''}`}
      role="group" aria-label="Zdjęcie pierścionka z lupą" aria-describedby="loupe-help"
      tabIndex={active ? 0 : undefined}
      onPointerDown={event => {
        if (!active) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus({preventScroll: true});
        move(event);
      }}
      onPointerMove={move}
      onKeyDown={event => {
        if (!active) return;
        if (event.key === 'Escape') { setActive(false); toggle.current?.focus({preventScroll: true}); return; }
        const delta: Record<string, [number, number]> = {ArrowLeft: [-.04, 0], ArrowRight: [.04, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04]};
        if (delta[event.key]) {
          event.preventDefault();
          const [dx, dy] = delta[event.key];
          setPoint(p => ({x: Math.max(0, Math.min(1, p.x + dx)), y: Math.max(0, Math.min(1, p.y + dy))}));
        }
      }}>
      <img src={src} alt={alt} width="720" height="720" loading="lazy" draggable={false}/>
      <div className="loupe-glass" aria-hidden="true" style={{
        opacity: active ? 1 : 0, width: radius * 2, height: radius * 2,
        left: x - radius, top: y - radius,
      }}>
        <img src={src} alt="" draggable={false} style={{
          position: 'absolute', width: size.width, height: size.height, maxWidth: 'none',
          left: radius - x, top: radius - y, transform: 'scale(2.4)', transformOrigin: `${x}px ${y}px`,
        }}/>
        <span className="loupe-scale">2,4×</span>
      </div>
      <span className="loupe-stage-label" aria-hidden="true">{active ? 'Detal pod lupą' : 'Rzemiosło z bliska'}</span>
    </div>
    <div className="loupe-toolbar">
      <button ref={toggle} type="button" className="loupe-toggle" aria-pressed={active} aria-controls="loupe-stage"
        onClick={() => {setActive(!active); setPoint({x: .5, y: .55});}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6M10.5 7.5v6"/></svg>
        Lupa złotnika <span className="loupe-switch" aria-hidden="true"><span/></span>
      </button>
      <span className="loupe-status" role="status">{active ? 'Włączona' : 'Wyłączona'}</span>
    </div>
    <p id="loupe-help" className="loupe-help">Włącz lupę i wskaż detal myszą lub palcem. Możesz też przesuwać ją klawiszami strzałek po wybraniu zdjęcia. Esc wyłącza lupę.</p>
  </div>;
}
