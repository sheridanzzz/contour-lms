"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full page load, not router.push: Next keeps recently visited pages alive
    // in memory, so a client-side navigation would leave the previous user's
    // data (and toasts) in the page for whoever signs in next.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload is the point
    window.location.assign("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
