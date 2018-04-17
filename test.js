const test = require('ava')
const fs = require('fs')
const tempy = require('tempy')
const Homebase = require('@beaker/homebase')
const createClient = require('./')

var portCounter = 10000
function createServer (configData) {
  var configPath = tempy.file({extension: 'yml'})
  fs.writeFileSync(configPath, configData)

  var config = new Homebase.HomebaseConfig(configPath)
  config.canonical.ports = {
    http: ++portCounter,
    https: ++portCounter
  }

  var server = Homebase.start(config)
  server.hostUrl = `http://127.0.0.1:${config.ports.http}`
  return server
}

test('login fails on wrong username or password', async t => {
  var server = createServer(`
webapi:
  username: bob
  password: hunter2
`)
  var client = await createClient(server.hostUrl)

  // wrong password fails
  try {
    await client.login('bob', 'hunter3')
    t.fail('Should have thrown')
  } catch (e) {
    t.deepEqual(e.statusCode, 403)
  }

  server.close()
})

test('can get account info', async t => {
  var res
  var server = createServer(`
domain: test.com
webapi:
  username: bob
  password: hunter2
dats:
  - url: dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/
    name: mysite
`)
  var client = await createClient(server.hostUrl)

  // login
  res = await client.login('bob', 'hunter2')
  t.truthy(res.sessionToken)
  t.truthy(client.hasSession)

  // can get account info
  res = await client.getAccount()
  t.deepEqual(res.username, 'bob')

  // can list dats
  res = await client.listDats()
  t.deepEqual(res.items, [
    {
      url: 'dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/',
      name: 'mysite',
      additionalUrls: [
        'dat://mysite.test.com'
      ]
    }
  ])

  // logout
  await client.logout()
  t.falsy(client.hasSession)

  server.close()
})

test('add & remove dats', async t => {
  var res
  var server = createServer(`
domain: test.com
webapi:
  username: bob
  password: hunter2
dats:
  - url: dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/
    name: mysite
`)
  var client = await createClient(server.hostUrl)

  // login
  res = await client.login('bob', 'hunter2')
  t.truthy(res.sessionToken)
  t.truthy(client.hasSession)

  // add dat
  await client.addDat({
    url: 'dat://868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f/',
    name: 'othersite',
    domains: ['othersite.com']
  })

  // get dat (verify)
  res = await client.getDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f')
  t.deepEqual(res, {
    url: 'dat://868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f/',
    name: 'othersite',
    additionalUrls: [
      'dat://othersite.test.com',
      'dat://othersite.com'
    ]
  })

  // update dat
  await client.updateDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f', {
    domains: ['othersite.com', 'other-site.com']
  })

  // get dat (verify)
  res = await client.getDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f')
  t.deepEqual(res, {
    url: 'dat://868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f/',
    name: 'othersite',
    additionalUrls: [
      'dat://othersite.test.com',
      'dat://othersite.com',
      'dat://other-site.com'
    ]
  })

  // list dats
  res = await client.listDats()
  t.deepEqual(res.items, [
    {
      url: 'dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/',
      name: 'mysite',
      additionalUrls: [
        'dat://mysite.test.com'
      ]
    },
    {
      url: 'dat://868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f/',
      name: 'othersite',
      additionalUrls: [
        'dat://othersite.test.com',
        'dat://othersite.com',
        'dat://other-site.com'
      ]
    }
  ])

  // remove dat
  await client.removeDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f')

  // list dats
  res = await client.listDats()
  t.deepEqual(res.items, [
    {
      url: 'dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/',
      name: 'mysite',
      additionalUrls: [
        'dat://mysite.test.com'
      ]
    }
  ])

  server.close()
})
