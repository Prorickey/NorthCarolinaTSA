import * as argon2 from "argon2"
import { randomBytes } from "crypto"

argon2.hash("password", {
    salt: randomBytes(64), 
}).then((hash) => {
    console.log(hash)
})
