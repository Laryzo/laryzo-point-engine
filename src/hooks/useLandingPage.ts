import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LandingPageRow, Section, Theme } from "@/lib/landing/types";
import { defaultMultibeautySections, defaultTheme } from "@/lib/landing/defaults";

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
    const { data: row, error } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !row) {
      setData({
        sections: defaultMultibeautySections,
        theme: defaultTheme,
        title: "Multibeauty Soap",
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

    const settings =
      mode === "draft"
        ? (r.settings_draft || {})
        : (r.settings_published || {});

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
  payload: { title?: string; theme_draft?: Theme; sections_draft?: Section[]; settings_draft?: LandingSettings }
) {
  const { data: existing } = await supabase
    .from("landing_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("landing_pages")
      .update(payload as any)
      .eq("slug", slug);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("landing_pages")
      .insert({ slug, ...payload } as any);
    if (error) throw error;
  }
}

export async function publishLandingPage(slug: string) {
  const { data: row, error: fetchErr } = await supabase
    .from("landing_pages")
    .select("theme_draft, sections_draft, settings_draft, title")
    .eq("slug", slug)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row) throw new Error("Draft not found");
  const { error } = await supabase
    .from("landing_pages")
    .update({
      theme_published: (row as any).theme_draft,
      sections_published: (row as any).sections_draft,
      settings_published: (row as any).settings_draft,
      title: (row as any).title,
    } as any)
    .eq("slug", slug);
  if (error) throw error;
}
