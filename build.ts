import { execSync } from 'node:child_process'

const pkg = JSON.parse(Deno.readTextFileSync('./deno.json'))

try {
    Deno.removeSync('./package.json')
    console.log('Previous package.json removed.')
} catch { // NOOP
}

const packageJson = {
    name: pkg.name,
    version: pkg.version,
    type: 'module',
    exports: {
        '.': {
            import: './dist/index.mjs',
            require: './dist/index.cjs',
        },
    },
    main: './dist/index.cjs',
    types: './dist/index.d.ts',
    files: ['dist'],
    author: 'YieldRay',
    license: 'MIT',
    repository: {
        type: 'git',
        url: 'git+https://github.com/YieldRay/json-rpc-ts.git',
    },
    bugs: {
        url: 'https://github.com/YieldRay/json-rpc-ts/issues',
    },
    homepage: 'https://github.com/YieldRay/json-rpc-ts#readme',
}

Deno.writeTextFileSync('./package.json', JSON.stringify(packageJson, null, 4))
console.log('New package.json created.')
console.log(packageJson)

console.log('Building package using unbuild...')
execSync('npx unbuild@2.0.0', { stdio: ['ignore', 'inherit', 'inherit'] })
