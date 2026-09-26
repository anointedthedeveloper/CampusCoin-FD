// Normalizes a person's name to Title Case (e.g. "john o'brien-smith" ->
// "John O'Brien-Smith") regardless of how it was typed, so names display
// consistently everywhere (greetings, avatars, admin lists) instead of
// however a user happened to capitalize their signup form.
function capitalizeSegment(segment) {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}

function toTitleCaseName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => part.split("'").map(capitalizeSegment).join("'"))
        .join('-'),
    )
    .join(' ');
}

module.exports = { toTitleCaseName };
