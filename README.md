# marisa-trie-wasm

[![NPM Version](https://img.shields.io/npm/v/marisa-trie-wasm)](https://www.npmjs.com/package/marisa-trie-wasm)
[![Test](https://github.com/pgaskin/marisa.js/actions/workflows/test.yml/badge.svg)](https://github.com/pgaskin/marisa.js/actions/workflows/test.yml)
[![Attest marisa build](https://github.com/pgaskin/go-marisa/actions/workflows/attest.yml/badge.svg)](https://github.com/pgaskin/go-marisa/actions/workflows/attest.yml)

Modern JavaScript browser/node bindings for [marisa-trie](https://github.com/s-yata/marisa-trie).

MARISA is a read-only space-efficient trie data structure optimized for lookup, reverse lookup, commmon prefix search (keys which are prefixes of the query), and predictive search (keys starting with the query).

This library wraps the WebAssembly build of marisa-trie from [go-marisa](https://github.com/pgaskin/go-marisa).

### Getting started

```bash
npm install --save marisa-trie-wasm
```

```html
<script type="module">
    import { Trie } from 'https://cdn.jsdelivr.net/npm/marisa-trie-wasm@0.0.5/dist/index.min.js'
</script>
```

```js
import { Trie } from 'marisa-trie-wasm'

function *letters() {
    for (let a = 0; a < 26; a++) {
        for (let b = 0; b < 26; b++) {
            for (let c = 0; c < 26; c++) {
                yield String.fromCharCode(...[a, b, c].map(x => x + 97))
            }
        }
    }
}

const trie = await Trie.build(letters())

let id = trie.lookup('aaa')
if (id == null) {
    console.log('not found')
}

let key = trie.reverseLookup(id)
if (key == null) {
    console.log('not found')
}

console.log('lookup', id, key)

for (const [id, key] of trie.predictiveSearch('cb')) {
    console.log('predictiveSearch', id, key)
}

for (const [id, key] of trie.commonPrefixSearch('abcdefg')) {
    console.log('commonPrefixSearch', id, key)
}

console.log(trie.save())
console.log((await Trie.load(trie.save())).save())
```

### Limitations

This library supports little-endian MARISA dictionaries up to 4 GiB. On 32-bit systems, the size is limited to around 2 GiB. These are limitations of MARISA itself.

Big-endian dictionaries (i.e., ones generated with the native tools on big-endian hosts) are not supported.

Memory-mapped dictionaries are not supported.

Asynchronous streaming I/O isn't supported yet.

### Performance

This depends on the runtime, but with JIT, it should be 1.5-3x slower than the native library. With an interpreter, it should be 50-150x slower.

The memory usage should be around the same other than a ~115K overhead per trie. Keys are copied to/from JavaScript strings when used.

### Design

The API is stable, typed, and does not leak implementation details of the marisa-trie library. All C++ exceptions are converted to JS exceptions.

The query interface uses generators for ergonomics and efficiency. It is okay to nest them. If you're calling them manually (rather than in a for loop or another API), remember to call [`return()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator/return) so it can free or reuse the associated memory.

Tries are garbage-collected along with the associated JS object.

### Testing

The wasm blob built and verified as part of [go-marisa](https://github.com/pgaskin/go-marisa), and the Go module hash used to fetch it is pinned.

There are comprehensive tests of the wasm blob in go-marisa, and some minimal API tests here.
