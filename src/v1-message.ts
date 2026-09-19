// Shown when this build is loaded by OpenCode 1, whose plugin package has no '@opencode-ai/plugin/v2'
// subpath. Without it the user sees ERR_PACKAGE_PATH_NOT_EXPORTED naming an internal path, which says
// nothing about versions and nothing about what to do next.
export const V1_MESSAGE = [
  'opencode-search 1.x requires OpenCode 2 and cannot load under OpenCode 1.',
  '',
  'Either pin the last OpenCode 1 release, which will not be updated:',
  '',
  '  { "plugin": ["opencode-search@0.0.9"] }',
  '',
  'or upgrade to OpenCode 2 (https://opencode.ai/v2/docs) and use the "plugins" key.',
].join('\n')
