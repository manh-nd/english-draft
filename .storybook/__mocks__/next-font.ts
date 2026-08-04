// Mock for next/font/google — not natively supported by @storybook/react-vite.
// Returns the same shape that next/font produces (variable, className, style)
// so components consuming these values don't crash in Storybook.
const createFont = () => ({
  style: { fontFamily: "sans-serif" },
  variable: "",
  className: "",
});

export const Inter = createFont;
export const Geist = createFont;
export const Geist_Mono = createFont;
