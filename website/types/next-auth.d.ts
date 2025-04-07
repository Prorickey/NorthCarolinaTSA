import NextAuth from 'next-auth'
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            apiKey: string
        }
    }

    interface User {
        apiKey: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        apiKey: string
    }
}