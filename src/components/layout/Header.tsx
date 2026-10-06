"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  displayName: string;
  userType: string;
}

export function Header() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, user_type")
          .eq("id", user.id)
          .single();

        setProfile({
          displayName: profileData?.display_name || user.email?.split("@")[0] || "User",
          userType: profileData?.user_type || "student",
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    loadUser();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-blue-600">
            UniLib
          </Link>
          <nav className="hidden space-x-4 sm:flex">
            <Link
              href="/library"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Library
            </Link>
            <Link
              href="/upload"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Upload
            </Link>
            <Link
              href="/my-documents"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              My Documents
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : profile ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {profile.displayName}{" "}
                <span className="ml-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 capitalize">
                  {profile.userType}
                </span>
              </span>
              <Link
                href="/account"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Account
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
