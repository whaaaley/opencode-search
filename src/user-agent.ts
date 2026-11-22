import pkg from '../package.json' with { type: 'json' }

export const USER_AGENT = pkg.name + '/' + pkg.version
