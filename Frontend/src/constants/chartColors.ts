// Fixed categorical order, validated with the data-viz palette checker
// (lightness band, CVD separation, normal-vision floor, contrast) — never
// reassign a slot to a different category, and never cycle past slot 6
// without folding extra categories into "Others".
export const CATEGORY_CHART_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
] as const;

// Diverging pair for the income (in) vs expenses (out) trend line.
export const INCOME_LINE_COLOR = '#2a78d6';
export const EXPENSE_LINE_COLOR = '#e34948';
