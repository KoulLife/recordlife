export type BlockInput = { id: string; start: Date; end: Date };
export type BlockLayout = { id: string; top: number; height: number; col: number; cols: number };

const MIN_HEIGHT = 14;

/**
 * Places blocks on a vertical day timeline. Blocks that overlap in time form a
 * cluster; inside a cluster each block takes the first free column, and every
 * block in the cluster is told how many columns the cluster needs.
 */
export function layoutBlocks(items: BlockInput[], dayStart: Date, hourPx = 56): BlockLayout[] {
  const pxPerMs = hourPx / 3_600_000;
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());
  const out = new Map<string, BlockLayout>();

  let cluster: BlockLayout[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const l of cluster) l.cols = colEnds.length;
    cluster = [];
    colEnds = [];
  };

  const minMs = MIN_HEIGHT / pxPerMs;
  for (const it of sorted) {
    const s = it.start.getTime();
    // Cluster on the drawn extent so min-height blocks never paint over each other.
    const e = Math.max(it.end.getTime(), s + minMs);
    if (s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= s);
    if (col === -1) col = colEnds.push(e) - 1;
    else colEnds[col] = e;
    clusterEnd = Math.max(clusterEnd, e);

    const layout: BlockLayout = {
      id: it.id,
      top: (s - dayStart.getTime()) * pxPerMs,
      height: (e - s) * pxPerMs,
      col,
      cols: 1,
    };
    cluster.push(layout);
    out.set(it.id, layout);
  }
  flush();

  return items.map((it) => out.get(it.id)!);
}
