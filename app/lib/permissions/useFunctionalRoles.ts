"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

export interface FunctionalRole {
  id: string;
  user_id: string;
  role: string;
  context_id: string;
  active: boolean;
}

export function useFunctionalRoles(activeContextId?: string) {
  const [roles, setRoles] = useState<FunctionalRole[]>([]);

  useEffect(() => {
    if (!activeContextId) {
      setRoles([]);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("user_functional_roles")
        .select("*")
        .eq("context_id", activeContextId)
        .eq("active", true);

      setRoles(data ?? []);
    };

    load();

    const channel = supabase
      .channel("functional-roles-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_functional_roles",
          filter: `context_id=eq.${activeContextId}`,
        },
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeContextId]);

  return roles;
}
