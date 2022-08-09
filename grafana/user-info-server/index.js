const express = require('express')
const fetch = require('node-fetch');

const app = express()
const port = 3005


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/userinfo', async (req, res) => {

    const response = await fetch('https://api.staging.koverse.com/me', {
        headers: {'Authorization': req.headers.authorization},
    });
    
    const user = JSON.parse(response.headers.get('koverse-user'));
    const body = await response.text();

    res.send({
        "sub": user.id,
        "name" :`${user.firstName} ${user.lastName}`,
        "nickname":"",
        "given_name":user.firstName,
        "middle_name":"",
        "family_name":user.lastName,
        "profile":"",
        "zoneinfo":"America/Los_Angeles",
        "locale":"en-US",
        "updated_at":user.updatedAt,
        "email":user.email,
        "email_verified":true,
        "address" : { "street_address":"123 Hollywood Blvd.", "locality":"Los Angeles", "region":"CA", "postal_code":"90210", "country":"US" },
        "phone_number":"+1 (425) 555-1212"
    })
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})