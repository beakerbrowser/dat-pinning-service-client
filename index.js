const assert = require('assert')
const joinPaths = require('path').join
const http = require('http')
const https = require('https')
const parseURL = require('url').parse

const DAT_KEY_REGEX = /([0-9a-f]{64})/i
const ACCOUNT_API_RELTYPE = 'https://archive.org/services/purl/purl/datprotocol/spec/pinning-service-account-api'
const DATS_API_RELTYPE = 'https://archive.org/services/purl/purl/datprotocol/spec/pinning-service-dats-api'

// exported api
// =

exports.createClient = function (hostUrl, login, cb) {
  if (typeof login === 'function') {
    // login is optional
    cb = login
    login = null
  }

  var client = new DatPinningServiceClient(hostUrl)
  client.fetchPSADoc(function (err) {
    if (err) return cb(err)
    if (!login) return cb(null, client)
    client.login(login.username, login.password, function (err) {
      if (err) return cb(err)
      cb(null, client)
    })
  })
}

class DatPinningServiceClient {
  constructor (hostUrl, psaDoc) {
    this.hostUrl = hostUrl.replace(/\/$/, '') // strip ending slash
    this.psaDoc = null
    this.accountsApiBaseUrl = null
    this.datsApiBaseUrl = null
    this.sessionToken = null
    if (psaDoc) this.setPSADoc(psaDoc)
  }

  get hasSession () {
    return !!this.sessionToken
  }

  setSession (token) {
    this.sessionToken = token
  }

  fetchPSADoc (cb) {
    var self = this
    request(this.hostUrl, 'GET', '/.well-known/psa')(function (err, doc) {
      if (err) return cb(err)
      try { self.setPSADoc(doc) } catch (e) { return cb(e) }
      cb()
    })
  }

  setPSADoc (psaDoc) {
    this.psaDoc = psaDoc
    this.accountsApiBaseUrl = getBaseUrl(this.hostUrl, psaDoc, ACCOUNT_API_RELTYPE, 'accounts')
    this.datsApiBaseUrl = getBaseUrl(this.hostUrl, psaDoc, DATS_API_RELTYPE, 'dats')
  }

  login (username, password, cb) {
    var self = this
    request(this.accountsApiBaseUrl, 'POST', '/login', null, {username, password})(function (err, res) {
      if (err) return cb(err)
      if (res.sessionToken) {
        self.setSession(res.sessionToken)
      }
      cb(null, res)
    })
  }

  logout (cb) {
    request(this.accountsApiBaseUrl, 'POST', '/logout', this.sessionToken)(cb)
    this.sessionToken = null
  }

  getAccount (cb) {
    request(this.accountsApiBaseUrl, 'GET', '/account', this.sessionToken)(cb)
  }

  listDats (cb) {
    request(this.datsApiBaseUrl, 'GET', '/', this.sessionToken)(cb)
  }

  addDat ({url, name, domains}, cb) {
    request(this.datsApiBaseUrl, 'POST', '/add', this.sessionToken, {url, name, domains})(cb)
  }

  removeDat (url, cb) {
    request(this.datsApiBaseUrl, 'POST', '/remove', this.sessionToken, {url})(cb)
  }

  getDat (key, cb) {
    key = urlToKey(key)
    request(this.datsApiBaseUrl, 'GET', joinPaths('/item', key), this.sessionToken)(cb)
  }

  updateDat (key, {name, domains}, cb) {
    key = urlToKey(key)
    request(this.datsApiBaseUrl, 'POST', joinPaths('/item', key), this.sessionToken, {name, domains})(cb)
  }
}
exports.DatPinningServiceClient = DatPinningServiceClient

// internal methods
// =

function getBaseUrl (hostUrl, psaDoc, relType, desc) {
  assert(psaDoc && typeof psaDoc === 'object', 'Invalid PSA service description document')
  assert(psaDoc.links && Array.isArray(psaDoc.links), 'Invalid PSA service description document (no links array)')
  var link = psaDoc.links.find(link => {
    var rel = link.rel
    return rel && typeof rel === 'string' && rel.indexOf(relType) !== -1
  })
  if (!link) {
    throw new Error(`Service does not provide the pinning-service ${desc} API (rel ${relType})`)
  }
  var href = link.href
  assert(href && typeof href === 'string', 'Invalid PSA service description document (no href on API link)')
  if (href.startsWith('/')) {
    href = hostUrl + link.href
  }
  return href
}

function urlToKey (url) {
  var match = (url || '').match(DAT_KEY_REGEX)
  if (match) {
    return match[0].toLowerCase()
  }
  return url
}

function request (baseUrl, method, resourcePath, session, body) {
  return function (cb) {
    var opts = {method, headers: {}}

    // parse URL
    var urlp = parseURL(baseUrl)
    var proto = (urlp.protocol === 'http:') ? http : https
    opts.hostname = urlp.hostname
    opts.path = joinPaths(urlp.pathname, resourcePath)
    if (urlp.port) {
      opts.port = urlp.port
    }

    // prepare body
    if (body) {
      body = JSON.stringify(body)
      opts.headers['Content-Type'] = 'application/json'
      opts.headers['Content-Length'] = Buffer.byteLength(body)
    }

    // prepare session
    if (session) {
      opts.headers['Authorization'] = 'Bearer ' + session
    }

    // send request
    var req = proto.request(opts, res => {
      var resBody = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { resBody += chunk })
      res.on('end', () => {
        if (resBody) {
          try {
            resBody = JSON.parse(resBody)
          } catch (e) {}
        }

        // reject / resolve
        if (res.statusCode >= 300) {
          var err = new Error(resBody && resBody.message ? resBody.message : 'Request failed')
          err.statusCode = res.statusCode
          err.responseBody = resBody
          cb(err)
        } else {
          cb(null, resBody)
        }
      })
    })
    req.on('error', cb)
    if (body) {
      req.write(body)
    }
    req.end()
  }
}
