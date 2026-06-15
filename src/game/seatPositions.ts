export function getSeatPositions(count: number): { top: string; left: string }[] {
  const cx = 50;
  const cy = 47;
  const rx = 38;
  const ry = 35;

  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / count;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return { top: `${y}%`, left: `${x}%` };
  });
}
