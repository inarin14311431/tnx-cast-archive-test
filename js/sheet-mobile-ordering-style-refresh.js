const versions = [
  ["link[data-mobile-skills-style]", "./css-next/pages/sheet-mobile-skills.css?v=6"],
  ["link[data-mobile-outfit-style]", "./css-next/pages/sheet-mobile-outfit.css?v=9"]
];

for (const [selector, href] of versions) {
  const link = document.querySelector(selector);
  if (link) link.href = href;
}
