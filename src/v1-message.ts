// Shown when OpenCode 1 loads this build, where the alternative is a module resolution error.
export const V1_MESSAGE = [
  'opencode-search 1.x requires OpenCode 2 and cannot load under OpenCode 1.',
  '',
  'Either pin the last OpenCode 1 release, which will not be updated:',
  '',
  '  { "plugin": ["opencode-search@0.0.9"] }',
  '',
  'or upgrade to OpenCode 2 (https://opencode.ai/v2/docs) and use the "plugins" key.',
].join('\n')
