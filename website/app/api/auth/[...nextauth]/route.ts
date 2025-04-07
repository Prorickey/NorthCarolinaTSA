import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import * as argon2 from "argon2"
import { Client } from 'pg'

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "trevobedson@gmail.com"
        },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) return null

        let user
        try {
          const client = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT || "5432")
          })
          await client.connect()
          user = await client.query('SELECT password, admins.id AS admin_id, api_keys.id AS apikey_id, key FROM admins INNER JOIN api_keys ON apiKeyId = api_keys.id WHERE email = $1', [credentials.email])
          user = user.rows[0]
          client.end()
        } catch (error) {
          console.error(error)
          return null
        }

        if (!user) return null

        const password = user.password
        const correctPassword = await argon2.verify(password,credentials.password)

        if (correctPassword)
          return {
            id: user.id,
            apiKey: user.key
          }

        return null
      }
    })
  ],
  pages: {
    signIn: '/signin',  
  },
  session: {
    strategy: "jwt", 
    maxAge: 60 * 60 * 24 * 30
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.apiKey = user.apiKey
      return token
    },
    async session({ session, token }) {
      if(session) session.user.apiKey = token.apiKey
      return session
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }