"use client";

import { SessionProvider, signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function SignInPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, session, router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Invalid email or password");
    }

    if (res?.ok) {
      router.push("/");
    }
  };

  return (
    <div className="flex flex-row justify-center items-center h-full my-auto">
      <div className="bg-stone-800 w-2/3 lg:w-1/4 py-5 rounded-2xl flex flex-col gap-y-2">
        <h1 className="w-full text-center text-4xl">Sign In</h1>
        {error && <h1 className="w-full text-center text-xl text-red-500">{error}</h1>}
        <div className="flex flex-col w-5/6 mx-auto justify-center pt-10">
          <form onSubmit={onSubmit}>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              Email
              <input
                name="email"
                type="text"
                className="block w-full p-2 mt-2 text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              Password
              <input
                name="password"
                type="password"
                className="block w-full p-2 mt-2 text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                required
              />
            </label>
            <div className='flex flex-row justify-center'>
              <button
                type="submit"
                className="w-2/3 h-[3rem] text-xl font-light text-stone-950 rounded bg-gray-100 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:outline-none transition mt-4"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignInWrapper() {
  return (
    <SessionProvider>
      <SignInPage />
    </SessionProvider>
  );
}