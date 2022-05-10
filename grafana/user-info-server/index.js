const express = require('express')
const fetch = require('node-fetch');

const app = express()
const port = 3005


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/userinfo', (req, res) => {
    console.log(req.headers)
    console.log(req.body)
    res.send({
        "sub": "00uid4BxXw6I6TV4m0g3",
        "name" :"John Doe",
        "nickname":"Jimmy",
        "given_name":"John",
        "middle_name":"James",
        "family_name":"Doe",
        "profile":"https://example.com/john.doe",
        "zoneinfo":"America/Los_Angeles",
        "locale":"en-US",
        "updated_at":1311280970,
        "email":"john.doe@example.com",
        "email_verified":true,
        "address" : { "street_address":"123 Hollywood Blvd.", "locality":"Los Angeles", "region":"CA", "postal_code":"90210", "country":"US" },
        "phone_number":"+1 (425) 555-1212"
      })
  })

app.get('/userinfo/emails', (req, res) => {
    console.log(req.headers)
    console.log(req.body)
    res.send({
        "sub": "00uid4BxXw6I6TV4m0g3",
        "name" :"John Doe",
        "nickname":"Jimmy",
        "given_name":"John",
        "middle_name":"James",
        "family_name":"Doe",
        "profile":"https://example.com/john.doe",
        "zoneinfo":"America/Los_Angeles",
        "locale":"en-US",
        "updated_at":1311280970,
        "email":"john.doe@example.com",
        "email_verified":true,
        "address" : { "street_address":"123 Hollywood Blvd.", "locality":"Los Angeles", "region":"CA", "postal_code":"90210", "country":"US" },
        "phone_number":"+1 (425) 555-1212"
      })
  })

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})