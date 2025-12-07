import test from 'node:test'
import { Trie } from '../dist/index.js'
import { createHash } from 'node:crypto'
import assert from 'node:assert'

function *letters() {
    for (let a = 0; a < 26; a++) {
        for (let b = 0; b < 26; b++) {
            for (let c = 0; c < 26; c++) {
                yield String.fromCharCode(...[a, b, c].map(x => x + 97))
            }
        }
    }
}

test('letters', async t => {
    const trie = await Trie.build(letters(), {
        numTries: 3,
        cacheLevel: 'normal',
        nodeOrder: 'weight',
        tailMode: 'text',
    })

    const buf = trie.save()
    assert.strictEqual(createHash('sha1').update(new Uint8Array(buf)).digest('hex'), 'bd9586bf7f6984ea693980058de34331f4e47eae', 'hash of serialized trie should be reproducible and match known data')

    const trie2 = await Trie.load(buf)
    assert.strictEqual(createHash('sha1').update(new Uint8Array(trie2.save())).digest('hex'), 'bd9586bf7f6984ea693980058de34331f4e47eae', 'round-trip of trie should match')

    assert.strictEqual(trie.size, 17576)
    assert.strictEqual(trie.diskSize, buf.byteLength)
    assert.strictEqual(trie.totalSize, 32707)
    assert.strictEqual(trie.numTries, 1) // it's a small trie, so this gets reduced
    assert.strictEqual(trie.nodeOrder, 'weight')
    assert.strictEqual(trie.tailMode, 'text')

    let n = 0
    for (const [id, key] of trie.dump()) {
        assert.strictEqual(trie.reverseLookup(id), key)
        assert.strictEqual(trie.lookup(key), id)
        n++
    }
    assert.strictEqual(n, trie.size)

    n = 0
    for (const _ of trie.dump()) {
        n++
    }
    assert.strictEqual(n, trie.size)

    assert.strictEqual(trie.reverseLookup(-1), null)
    assert.strictEqual(trie.reverseLookup(0), 'aaa')
    assert.strictEqual(trie.reverseLookup(500), 'atg')
    assert.strictEqual(trie.reverseLookup(17575), 'zzz')
    assert.strictEqual(trie.reverseLookup(17576), null)
    assert.strictEqual(trie.reverseLookup(17577), null)

    assert.strictEqual(trie.lookup(''), null)
    assert.strictEqual(trie.lookup('sdfsdfsdf'), null)

    assert.throws(() => {
        trie.writeToSync(data => {
            throw new Error('test')
        })
    }, new Error('test'))

    assert.deepStrictEqual(Array.from(trie).map(([, key]) => key).sort(), Array.from(letters()).sort())
    assert.deepStrictEqual(Array.from(trie.dump()).map(([, key]) => key).sort(), Array.from(letters()).sort())
    assert.deepStrictEqual(Array.from(trie.predictiveSearch('ab')).map(([, key]) => key).sort(), Array.from(letters()).filter(x => x.startsWith('ab')).sort())
    assert.deepStrictEqual(Array.from(trie.commonPrefixSearch('abcde')).map(([, key]) => key).sort(), Array.from(letters()).filter(x => 'abcde'.startsWith(x)).sort())
})
