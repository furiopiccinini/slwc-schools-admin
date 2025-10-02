import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"


const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const instructor = await prisma.instructor.findUnique({
          where: { email: credentials.email },
          include: { school: true }
        })

        if (!instructor) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          instructor.passwordHash
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: instructor.id.toString(),
          email: instructor.email,
          name: instructor.name,
          role: instructor.role,
          schoolId: instructor.schoolId,
          schoolName: instructor.school.name
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const
  },
  callbacks: {
    async jwt({ token, user }: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (user) {
        token.role = user.role
        token.schoolId = user.schoolId
        token.schoolName = user.schoolName
      }
      return token
    },
    async session({ session, token }: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.schoolId = token.schoolId as number
        session.user.schoolName = token.schoolName as string
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
}

export default NextAuth(authOptions)
export { authOptions }