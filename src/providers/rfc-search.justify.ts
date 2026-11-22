export default [
  {
    id: 'tell|src/providers/rfc-search.ts|rfcSearch|0|String(Math.min(limit, 100))',
    basis: '65b6af1c37c4982f32f4a737ce72f379c0a0a29d5f63dec9479051efeab68880',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
