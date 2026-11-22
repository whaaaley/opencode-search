export default [
  {
    id: 'tell|src/providers/rfc-search.ts|rfcSearch|0|String(Math.min(limit, 100))',
    basis: '8ad2e13408c20153d536fd235e58ef6353ced208ed656ff9e2ab4db03bd6196b',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
