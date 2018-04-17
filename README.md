# dat-pinning-service-client

Client API for Dat pinning services. Conforms to the [Dat Pinning Service API](#TODO).

## API

To create a client:

```js
const {createClient} = require('dat-pinning-service-client')
createClient('https://my-pinning-service.com', {username: 'bob', password: 'hunter2'}, (err, client) => {
  if (err) throw err
  // ...
})
```

Alternatively:

```js
const {DatPinningServiceClient} = require('dat-pinning-service-client')
var client = new DatPinningServiceClient('https://my-pinning-service.com')
client.fetchPSADoc(err => {
  if (err) throw err
  client.login('bob', 'hunter2', err => {
    if (err) throw err
    // ...
  })
})
```

All of the methods provide the response body and give an error if a non-2xx response is received.
The errors will have the `.statusCode` and `.responseBody` set.

### createClient(hostUrl[, login], cb)

Create a new client object.
Will fetch the PSA document and run login if the creds are specified.

### new DatPinningServiceClient(hostUrl[, psaDoc])

Create a new client object.
You can optionally provide the PSA document, which is useful if you've cached it from a previous session.

### client.setPSADoc(psaDoc)

Manually set the PSA document (useful if you've cached it from a previous session).
You can find the PSA doc on `client.psaDoc`.

### client.setSession(token)

Manually set the session token (useful if you've cached it from a previous session).
You can find the token on `client.sessionToken`.

### client.login(username, password, cb)

Start a session.
You can check `client.hasSession` to see if a session token has been stored.

### client.logout(cb)

End the session.

### client.getAccount(cb)

Get the account info for the current session.
Returns

```
{
  email: String, the accounts email (required)
  username: String, the accounts username (required)
  diskUsage: Number, how much disk space has the user's data taken? (optional)
  diskQuota: Number, how much disk space can the user's data take? (optional)
  updatedAt: Number, the Unix timestamp of the last time the user account was updated (optional)
  createdAt: Number, the Unix timestamp of the last time the user account was updated (optional)
}
```

### client.listDats(cb)

Get the dats pinned by the user.
Returns

```
{
  items: [{
    url: String, dat url
    name: String, optional shortname assigned by the user
    title: String, optional title extracted from the dat's manifest file
    description: String, optional description extracted from the dat's manifest file
    additionalUrls: Array of Strings, optional list of URLs the dat can be accessed at
  }]
}
```

### client.addDat({url, name, domains}, cb)

Pin a dat.
Params:

 - `url` String, required url/key of the dat
 - `name` String, optional shortname for the archive
 - `domains` Array of Strings, optional list of domain-names the dat should be made available at

### client.removeDat(url, cb)

Unpin a dat.
Params:

 - `url` String, required url/key of the dat

### client.getDat(url, cb)

Get a pinned dat.
Returns:

```
{
  url: String, dat url
  name: String, optional shortname assigned by the user
  title: String, optional title extracted from the dat's manifest file
  description: String, optional description extracted from the dat's manifest file
  additionalUrls: Array of Strings, optional list of URLs the dat can be accessed at
}
```

### client.updateDat(url, {name, domains}, cb)

Update a pinned dat.
Params:

 - `url` String, required url/key of the dat
 - `name` String, optional shortname for the archive
 - `domains` Array of Strings, optional list of domain-names the dat should be made available at

## CLI tool

Small utility for testing endpoints:

```
npm i -g dat-pinning-service-client
dat-pinning-service-client https://my-pinning-service.com bob hunter2 getDat 9900f9aad4d6e79e0beb1c46333852b99829e4dfcdfa9b690eeeab3c367c1b9a
```

The usage is:

```
dat-pinning-service-client [service] [username] [password] [action] [args...]
```
