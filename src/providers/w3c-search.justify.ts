export default [
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(PAGE_SIZE)',
    basis: '535165daf56b3d7002e3960710219fce49c47892f47f3ad8909e3f1fd0e460f9',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
  {
    id: 'tell|src/providers/w3c-search.ts|fetchPage|0|String(page)',
    basis: '535165daf56b3d7002e3960710219fce49c47892f47f3ad8909e3f1fd0e460f9',
    reason: 'URLSearchParams turns a number into the same text String gives, so no input can tell the two apart; String is there because the parameter is typed as a string',
  },
]
