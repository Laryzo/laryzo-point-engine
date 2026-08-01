import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LandingPageRow, Section, Theme } from "@/lib/landing/types";
import { defaultMultibeautySections, defaultTheme, defaultQAItems } from "@/lib/landing/defaults";

import type { LandingSettings } from "@/lib/landing/types";

export type LandingData = {
  sections: Section[];
  theme: Theme;
  title: string;
  settings: LandingSettings;
};

export function useLandingPage(slug: string, mode: "published" | "draft" = "published") {
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Published mode is used by public visitors: read only published fields via
    // the dedicated accessor. Draft mode (builder) reads the table directly and
    // is restricted to admins by row-level security.
    let row: any = null;
    let error: any = null;
    if (mode === "draft") {
      const res = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      row = res.data;
      error = res.error;
    } else {
      const res = await (supabase as any).rpc("get_landing_page_published", { page_slug: slug });
      error = res.error;
      row = Array.isArray(res.data) ? res.data[0] : res.data;
    }

    if (error || !row) {
      setData({
        sections: defaultMultibeautySections,
        theme: defaultTheme,
        title: "Multibeauty Soap",
        settings: {
          chatbot: { enabled: true, welcomeMessage: "", waNumber: "", aiPrompt: "", qaItems: defaultQAItems },
          checkout: { productId: "", price: 0, successMessage: "" }
        },
      });
      setLoading(false);
      return;
    }

    const r = row as any as LandingPageRow;

    const sections =
      mode === "draft"
        ? (r.sections_draft?.length ? r.sections_draft : r.sections_published)
        : (r.sections_published?.length ? r.sections_published : r.sections_draft);
    const theme =
      mode === "draft"
        ? { ...defaultTheme, ...(r.theme_draft || {}) }
        : { ...defaultTheme, ...(r.theme_published || {}) };

    let settings: LandingSettings =
      mode === "draft"
        ? (r.settings_draft || {})
        : (r.settings_published || {});

    // Ensure qaItems is populated with defaults if not already present
    if (!settings.chatbot?.qaItems?.length) {
      settings = {
        ...settings,
        chatbot: {
          ...settings.chatbot,
          enabled: settings.chatbot?.enabled !== false,
          welcomeMessage: settings.chatbot?.welcomeMessage || "",
          waNumber: settings.chatbot?.waNumber || "",
          aiPrompt: settings.chatbot?.aiPrompt || "",
          qaItems: defaultQAItems,
        },
      };
    }

    setData({
      sections: sections?.length ? sections : defaultMultibeautySections,
      theme,
      title: r.title || "Multibeauty Soap",
      settings,
    });
    setLoading(false);
  }, [slug, mode]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, reload: load, setData };
}

export async function saveLandingPage(
  slug: string,
  payload: any,
): Promise<void> {
  const { error } = await supabase
    .from("landing_pages")
    .upsert({ slug, ...payload }, { onConflict: "slug" });

  if (!error) return;

  // Extract the missing column name from PostgREST / Postgres error messages.
  const missingCol =
    error.message.match(/find the '([^']+)' column/)?.[1] ||
    error.message.match(/column "([^"]+)"/)?.[1];

  // If the missing column is one of the settings/draft columns, the migration
  // hasn't been applied yet. Throw a clear error so the caller can inform the user.
  if (missingCol) {
    throw new Error(
      `Kolom '${missingCol}' belum ada di database. Jalankan migrasi terbaru di Supabase Dashboard lalu coba lagi.`
    );
  }

  throw error;
}

export async function publishLandingPage(slug: string): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!row) throw new Error("Draft tidak ditemukan");

  const r = row as any;
  const updatePayload: any = {
    title: r.title,
    theme_published: r.theme_draft,
    sections_published: r.sections_draft,
    settings_published: r.settings_draft,
  };

  const { error } = await supabase
    .from("landing_pages")
    .update(updatePayload)
    .eq("slug", slug);

  if (!error) return;

  const missingCol =
    error.message.match(/find the '([^']+)' column/)?.[1] ||
    error.message.match(/column "([^"]+)"/)?.[1];

  if (missingCol) {
    throw new Error(
      `Kolom '${missingCol}' belum ada di database. Jalankan migrasi terbaru di Supabase Dashboard lalu coba lagi.`
    );
  }

  throw error;
}
