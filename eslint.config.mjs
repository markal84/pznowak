import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: ["backend/**", "cms/**", "out/**"],
  },
  ...nextVitals,
  ...nextTypeScript,
  {
    files: [
      "src/components/AboutValuesCards.tsx",
      "src/components/ContactForm.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
