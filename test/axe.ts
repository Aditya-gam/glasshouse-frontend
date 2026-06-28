import { axe as runAxe } from "vitest-axe";

/**
 * axe-core configured for jsdom. The `color-contrast` rule needs a real canvas to read
 * rendered colors (jsdom has none), so it's disabled here — contrast is verified in a real
 * browser instead (the M5.7 axe pass). Every other rule (roles, names, structure) runs.
 */
export function axe(element: Element) {
  return runAxe(element, { rules: { "color-contrast": { enabled: false } } });
}
