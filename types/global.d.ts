// Global type declarations for project dependencies and environment flags

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

export {};
