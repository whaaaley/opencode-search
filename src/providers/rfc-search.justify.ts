export default [
  {
    id: 'tell|src/providers/rfc-search.ts|rfcSearch|0|String(Math.min(limit, 100))',
    basis: '600e50ba1d45ea4a4665ba9ffb150539736e3c03b40385197b04e890d291d157',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
