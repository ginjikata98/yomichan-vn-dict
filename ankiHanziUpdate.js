const axios = require('axios')


async function invokeAnki(action, params) {
  const options = {action, params, version: 6}
  let response
  try {
    const res = await axios.post('http://localhost:8765', options, {timeout: 30000})
    response = res.data
    if (Object.getOwnPropertyNames(response).length !== 2) {
      throw 'response has an unexpected number of fields'
    }
    if (!response.hasOwnProperty('error')) {
      throw 'response is missing required error field'
    }
    if (!response.hasOwnProperty('result')) {
      throw 'response is missing required result field'
    }
    if (response.error) {
      throw response.error
    }
  } catch (e) {
    console.log(e)
  }
  return response
}

async function getSpell(query) {
  let hanviet = ''
  try {
    let url = `http://www.vanlangsj.org/hanviet/ajax.php?query=${query}&methode=exact`
    const {data} = await axios.get(encodeURI(url), {timeout: 10000})
    hanviet = data?.split('=')[1]?.replace('|', '') || ''
  } catch (e) {
    console.log(e)
  }

  return hanviet
}

async function run() {
  let res = await invokeAnki('findNotes', {query: 'hanviet:'})
  const notes = res.result
  for (let noteId of notes) {
    res = await invokeAnki('notesInfo', {'notes': [noteId]})
    const hanzi = res?.result[0]?.fields?.hanzi?.value || ''
    if (!hanzi) continue
    const hanviet = await getSpell(hanzi)
    if (!hanviet) continue
    invokeAnki('updateNoteFields', {
      note: {
        id: noteId,
        fields: {hanviet},
      },
    })
    console.log(hanzi, hanviet)
  }
}


run()
