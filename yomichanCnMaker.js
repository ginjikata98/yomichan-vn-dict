const cheerio = require('cheerio')
const axios = require('axios')
const fs = require('fs')

async function test() {
  const $ = cheerio.load(fs.readFileSync('./yomichanJsonInput/hanzi.html'))
  const data = []
  $('.p1').each((_, el) => {
    const row = $(el).text().split('\t')
    data.push([row[1], row[4], row[5]])
  })
  let text = ''
  for (let d of data) {
    const spell = await loadSpell(d[0])
    const r = d.join(';') + ';' +  spell.join(',')
    console.log(r)
    text += r + '\n'
  }
  fs.writeFileSync('./output/hanzi.txt', text)
}

async function loadSpell(character) {
  try {
    const {data} = await axios.get(encodeURI('https://hvdic.thivien.net/whv/' + character), {timeout: 2000})
    const $ = cheerio.load(data)

    const spell = []
    $('.hvres-spell a').each((_, e) => {
      const el = $(e)
      spell.push(el.text())
    })

    return [...new Set(spell)]
  } catch (e) {
    console.log(e)
  }
}


test()
