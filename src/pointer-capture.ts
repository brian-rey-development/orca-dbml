/** Routes a pointer's later events to `element`, as long as the pointer still exists. */
export function capturePointer(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId)
  } catch {
    // The browser refuses when the pointer is already gone, as after a release outside the
    // frame. Callers end such a press on the next move with no buttons held, so it can go on
    // uncaptured.
  }
}
