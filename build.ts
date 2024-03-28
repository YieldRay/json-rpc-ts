import * as esbuild from 'npm:esbuild'

console.log(
    await esbuild.build({
        entryPoints: ['src/index.ts'],
        bundle: true,
        outdir: 'dist',
        format: 'esm',
    }),
)

const pkg = JSON.parse(Deno.readTextFileSync('./deno.json'))

if (Deno.statSync('./package.json').isFile) {
    Deno.removeSync('./package.json')
}

const packageJson = {
    name: pkg.name,
    version: pkg.version,
    main: 'dist/index.js',
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

console.log(packageJson)

Deno.writeTextFileSync('./package.json', JSON.stringify(packageJson, null, 4))
