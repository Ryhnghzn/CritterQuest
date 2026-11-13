// A canvas that is thrown away keeps its pixels until the garbage collector gets to it; on iPhone
// Safari all canvases share one memory budget (a few hundred MB) and going over it kills the page
// (spec §50). Shrinking it to nothing frees the pixels at once.
export function freeCanvas(c) {
  if (c && c.width) { c.width = 0; c.height = 0; }
}
