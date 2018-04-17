const test = require('ava')
const fs = require('fs')
const tempy = require('tempy')
const Homebase = require('@beaker/homebase')
const {createClient} = require('./')

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

test.cb('login fails on wrong username or password', t => {
  var server = createServer(`
webapi:
  username: bob
  password: hunter2
`)
  createClient(server.hostUrl, (err, client) => {
    if (err) throw err

    // wrong password fails
    client.login('bob', 'hunter3', err => {
      t.truthy(err)
      t.deepEqual(err.statusCode, 403)

      server.close()
      t.end()
    })
  })
})

test.cb('can get account info', t => {
  var server = createServer(`
domain: test.com
webapi:
  username: bob
  password: hunter2
dats:
  - url: dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/
    name: mysite
`)
  createClient(server.hostUrl, {username: 'bob', password: 'hunter2'}, (err, client) => {
    if (err) throw err
    t.truthy(client.hasSession)

    // can get account info
    client.getAccount((err, res) => {
      if (err) throw err
      t.deepEqual(res.username, 'bob')

      // can list dats
      client.listDats((err, res) => {
        if (err) throw err
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
        client.logout(err => {
          if (err) throw err
          t.falsy(client.hasSession)

          server.close()
          t.end()
        })
      })
    })
  })
})

test.cb('add & remove dats', t => {
  var server = createServer(`
domain: test.com
webapi:
  username: bob
  password: hunter2
dats:
  - url: dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/
    name: mysite
`)
  createClient(server.hostUrl, {username: 'bob', password: 'hunter2'}, (err, client) => {
    if (err) throw err
    t.truthy(client.hasSession)

    // add dat
    client.addDat({
      url: 'dat://868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f/',
      name: 'othersite',
      domains: ['othersite.com']
    }, (err) => {
      if (err) throw err

      // get dat (verify)
      client.getDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f', (err, res) => {
        if (err) throw err
        t.deepEqual(res, {
          url: 'dat://868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f/',
          name: 'othersite',
          additionalUrls: [
            'dat://othersite.test.com',
            'dat://othersite.com'
          ]
        })

        // update dat
        client.updateDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f', {
          domains: ['othersite.com', 'other-site.com']
        }, (err) => {
          if (err) throw err

          // get dat (verify)
          client.getDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f', (err, res) => {
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
            client.listDats((err, res) => {
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
              client.removeDat('868d6000f330f6967f06b3ee2a03811efc23591afe0d344cc7f8c5fb3b4ac91f', err => {
                if (err) throw err

                // list dats
                client.listDats((err, res) => {
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
                  t.end()
                })
              })
            })
          })
        })
      })
    })
  })
})
