export default [
  {
    id: 'tell|src/providers/rfc-search.ts|rfcSearch|0|String(Math.min(limit, 100))',
    basis: '66c569e080ec1a967e8a698de0d258ef2e7cc7c20b4a603c46ab9504fd9fe5e6',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
