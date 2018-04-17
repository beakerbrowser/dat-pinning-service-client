#!/usr/bin/env node
const {createClient} = require('./index')

go(...(process.argv.slice(2)))

function go (serviceUrl, username, password, action, ...args) {
  console.log('Connecting to', serviceUrl)
  createClient(serviceUrl, {username, password}, (err, client) => {
    if (err) return onerror(err)

    console.log(action, '(', args.map(JSON.stringify), ')')
    switch (action) {
      case 'addDat': return client.addDat({url: args[0], name: args[1], domains: args.slice(2)}, cb)
      case 'updateDat': return client.updateDat(args[0], {name: args[1], domains: args.slice(2)}, cb)
      case 'removeDat': return client.removeDat(args[0], cb)
      case 'getDat': return client.getDat(args[0], cb)
      default: return client[action](cb)
    }
    function cb (err, res) {
      if (err) return onerror(err)
      console.log(res)
    }
  })
}

function onerror (e) {
  console.log('Usage:', process.argv[1], '[service] [username] [password] [action] [args...]')
  console.log('')
  console.log(e)
}
