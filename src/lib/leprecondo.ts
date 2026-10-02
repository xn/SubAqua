/**
 * The four Leprecondo pieces to furnish: the tier layout's discovered pieces in layout order, then
 * any other discovered piece as filler. "empty" and unparsed ids (undefined) are never furniture.
 * Fewer than four discovered pieces is no plan; the init task then skips the Leprecondo instead of
 * throwing its try limit. Names, not ids, so the planner stays libram-free for the tests.
 */
export function furnishPlan<Piece extends string>(
  layout: readonly (Piece | undefined)[],
  discovered: readonly (Piece | undefined)[],
): [Piece, Piece, Piece, Piece] | undefined {
  const known = new Set<Piece>();
  for (const piece of discovered) if (piece !== undefined && piece !== "empty") known.add(piece);
  const wanted = layout.filter((piece): piece is Piece => piece !== undefined && known.has(piece));
  const filler = [...known].filter((piece) => !wanted.includes(piece));
  const picks = [...wanted, ...filler].slice(0, 4);
  return picks.length === 4 ? (picks as [Piece, Piece, Piece, Piece]) : undefined;
}
