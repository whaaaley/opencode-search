export default [
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(PAGE_SIZE)',
    basis: '380603d269c6fd4e31e183961195d07df042de575f78950a4f3be3ca4266bb20',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(page)',
    basis: '380603d269c6fd4e31e183961195d07df042de575f78950a4f3be3ca4266bb20',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
