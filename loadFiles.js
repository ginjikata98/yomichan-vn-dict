const {walk} = require('node-os-walk')
const fs = require('fs')

const pathCache = new Map()
const fileCache = new Set()
let fileCount = 0

async function start() {
  const s = Date.now()
  const rootPath = '/'
  for await (const [root, dirs, files] of walk(rootPath, {ignoreErrors: true})) {
    if (root.startsWith('/System/Volumes/Data')) continue
    for (const file of files) {
      try {
        const link = `${root}/${file.name}`
        if (fileCache.has(link)) continue
        fileCache.add(link)
        let {size} = fs.statSync(link)
        size = size / 1024 / 1024
        let p = link.slice(1).split('/')
        let key = ''
        for (let part of p) {
          key += '/' + part
          let totalSize = pathCache.get(key) || 0
          pathCache.set(key, totalSize + size)
        }
        fileCount++
      } catch (e) {

      }
    }
  }

  console.log('sorting', (Date.now() - s) / 1000)
  let results = [...pathCache.entries()]
    .filter(i => i[1] > 100)
    .sort((a, b) => b[1] - a[1])

  let text = ''
  const cache = {}
  for (let [k, v] of results) {
    let cursor = cache
    const _ = k.slice(1).split('/')
    for (let p of _) {
      if (!cursor[p]) {
        cursor[p] = {k, v, children: {}}
        break
      }
      cursor = cursor[p].children
    }
  }

  function loadItem(item) {
    let {k, v, children} = item[1]
    if (k && v) {
      let padding = k.slice(1).split('/').length
      padding = padding > 1 ? padding + '||'.repeat(padding) : ''
      text += `${padding}${(v / 1024).toFixed(2)}GB - rm -rf ${k}\n`
    }

    for (let [_, object] of Object.entries(children)) {
      loadItem([_, object])
    }
  }

  [...Object.entries(cache)]
    .sort((a, b) => b[1].v - a[1].v)
    .forEach(loadItem)

  console.log('done', (Date.now() - s) / 1000, fileCount)
  fs.writeFileSync('output/results.txt', text)
}


start()



