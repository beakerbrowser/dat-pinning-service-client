# dat-pinning-service-client

Client API for Dat pinning services. Conforms to the [Dat Pinning Service API](#TODO).

## API

To create a client:

```js
const createClient = require('dat-pinning-service-client')
var client = await createClient('https://my-pinning-service.com')
```

All of the methods return the response body and throw if a non-2xx response is received.
The errors will have the `.statusCode` and `.responseBody` set.

### client.login(username, password)

Start a session.
You can check `client.hasSession` to see if a session token has been stored.

### client.logout()

End the session.

### client.getAccount()

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

### client.listDats()

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

### await client.addDat({url, name, domains})

Pin a dat.
Params:

 - `url` String, required url/key of the dat
 - `name` String, optional shortname for the archive
 - `domains` Array of Strings, optional list of domain-names the dat should be made available at

### await client.removeDat(url)

Unpin a dat.
Params:

 - `url` String, required url/key of the dat

### await client.getDat(url)

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

### await client.updateDat(url, {name, domains})

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
