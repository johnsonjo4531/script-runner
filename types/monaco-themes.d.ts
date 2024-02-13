declare module "monaco-themes" {
  import type json from "monaco-themes/themes/themelist.json";
  export type ThemeValues = Readonly<typeof json>[keyof Readonly<typeof json>];
  export type ThemeNames = keyof typeof json;
}
