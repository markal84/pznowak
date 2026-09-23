/** Vector paths avoid iOS substituting colored emoji for Unicode arrows. */
export default function ArrowIcon({direction = 'up-right'}: {direction?: 'up-right' | 'down' | 'down-left'}) {
  const rotation = direction === 'down' ? 135 : direction === 'down-left' ? 180 : 0;
  return (
    <svg className="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <g transform={`rotate(${rotation} 12 12)`}><path d="M5 19 19 5M5 5h14v14" /></g>
    </svg>
  );
}
