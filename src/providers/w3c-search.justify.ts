export default [
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(PAGE_SIZE)',
    basis: '665a9a25bd43440616349014eb43c0a499b899e861e7077bc04771a375c1eb6f',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(page)',
    basis: '665a9a25bd43440616349014eb43c0a499b899e861e7077bc04771a375c1eb6f',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
