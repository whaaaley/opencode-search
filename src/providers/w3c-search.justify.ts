export default [
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(PAGE_SIZE)',
    basis: '6e26f7dbe2c6e37ec1dde39d902afef44b8b158fc93e0c31962d20c1bf75ef41',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(page)',
    basis: '6e26f7dbe2c6e37ec1dde39d902afef44b8b158fc93e0c31962d20c1bf75ef41',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
