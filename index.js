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

module.exports = async function (hostUrl) {
  var psaDoc = await request(hostUrl, 'GET', '/.well-known/psa')
  return new DatPinningServiceClient(hostUrl, psaDoc)
}

class DatPinningServiceClient {
  constructor (hostUrl, psaDoc) {
    this.hostUrl = hostUrl.replace(/\/$/, '') // strip ending slash
    this.psaDoc = psaDoc
    this.accountsApiBaseUrl = getBaseUrl(hostUrl, psaDoc, ACCOUNT_API_RELTYPE, 'accounts')
    this.datsApiBaseUrl = getBaseUrl(hostUrl, psaDoc, DATS_API_RELTYPE, 'dats')
    this.sessionToken = null
  }

  get hasSession () {
    return !!this.sessionToken
  }

  async login (username, password) {
    var res = await request(this.accountsApiBaseUrl, 'POST', '/login', null, {username, password})
    if (res.sessionToken) {
      this.sessionToken = res.sessionToken
    }
    return res
  }

  async logout () {
    var res = request(this.accountsApiBaseUrl, 'POST', '/logout', this.sessionToken)
    this.sessionToken = null
    return res
  }

  async getAccount () {
    return request(this.accountsApiBaseUrl, 'GET', '/account', this.sessionToken)
  }

  async listDats () {
    return request(this.datsApiBaseUrl, 'GET', '/', this.sessionToken)
  }

  async addDat ({url, name, domains}) {
    return request(this.datsApiBaseUrl, 'POST', '/add', this.sessionToken, {url, name, domains})
  }

  async removeDat (url) {
    return request(this.datsApiBaseUrl, 'POST', '/remove', this.sessionToken, {url})
  }

  async getDat (key) {
    key = urlToKey(key)
    return request(this.datsApiBaseUrl, 'GET', joinPaths('/item', key), this.sessionToken)
  }

  async updateDat (key, {name, domains}) {
    key = urlToKey(key)
    return request(this.datsApiBaseUrl, 'POST', joinPaths('/item', key), this.sessionToken, {name, domains})
  }
}

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
  throw new Error(`Invalid dat key: ${url}`)
}

function request (baseUrl, method, resourcePath, session, body) {
  return new Promise((resolve, reject) => {
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
          reject(err)
        } else {
          resolve(resBody)
        }
      })
    })
    req.on('error', reject)
    if (body) {
      req.write(body)
    }
    req.end()
  })
}
