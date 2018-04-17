#!/usr/bin/env node
const createClient = require('./index')

go(...(process.argv.slice(2)))

async function go (serviceUrl, username, password, action, ...args) {
  try {
    console.log('Connecting to', serviceUrl)
    var client = await createClient(serviceUrl)
    await client.login(username, password)
    if (action === 'addDat') {
      args = [{url: args[0], name: args[1], domains: args.slice(2)}]
    }
    if (action === 'updateDat') {
      args = [args[0], {name: args[1], domains: args.slice(2)}]
    }
    console.log(action, '(', args.map(JSON.stringify), ')')
    console.log(await client[action](...args))
  } catch (e) {
    console.log('Usage:', process.argv[1], '[service] [username] [password] [action] [args...]')
    console.log('')
    console.log(e)
  }
}
