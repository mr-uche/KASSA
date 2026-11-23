// React Native's TypeScript compiler also scans web-only source files.
// These declarations allow the existing CSS imports to typecheck without
// changing the Metro bundler configuration or the app's styling.
declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.css';
