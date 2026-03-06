import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  // if user is already logged in, take them to the app
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/rooms')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
            Smart Shared Living
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Find rooms, connect with compatible roommates, and manage your shared house.
          </p>
        </div>
        <div className="flex flex-col gap-4 mt-8">
          <Link
            href="/auth/signup"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create an Account
          </Link>
          <Link
            href="/auth/login"
            className="w-full flex justify-center py-3 px-4 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
