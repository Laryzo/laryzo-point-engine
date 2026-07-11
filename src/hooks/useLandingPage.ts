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

/**
 * Safely filters a payload to only include columns that actually exist in the database table.
 * This prevents "column not found" errors when the frontend is ahead of the database schema.
 */
async function getSafePayload(table: string, payload: any) {
  const { data: columns, error } = await supabase.rpc('get_table_columns', { table_name: table });
  
  // If the RPC fails, we fall back to a set of "guaranteed" columns
  if (error || !columns) {
    console.warn("Could not fetch table columns, using fallback filtering", error);
    const fallbackColumns = ['id', 'slug', 'title', 'created_at', 'updated_at'];
    const safe: any = {};
    Object.keys(payload).forEach(key => {
      if (fallbackColumns.includes(key)) safe[key] = payload[key];
    });
    return safe;
  }

  const safe: any = {};
  const columnNames = (columns as any[]).map(c => c.column_name);
  Object.keys(payload).forEach(key => {
    if (columnNames.includes(key)) {
      safe[key] = payload[key];
    }
  });
  return safe;
}

export async function saveLandingPage(
  slug: string,
  payload: { title?: string; theme_draft?: Theme; sections_draft?: Section[]; settings_draft?: LandingSettings }
) {
  // First, try a direct update. If it fails due to missing columns, we'll handle it.
  const { error: updateError } = await supabase
    .from("landing_pages")
    .update(payload as any)
    .eq("slug", slug);

  if (!updateError) return;

  // If the error is about a missing column, try to filter the payload
  if (updateError.message.includes("column") || updateError.code === "42703") {
    console.log("Save failed due to schema mismatch, attempting filtered save...");
    
    // Fallback: manually remove settings_draft if it's the culprit
    const filteredPayload = { ...payload } as any;
    delete filteredPayload.settings_draft;
    
    const { error: retryError } = await supabase
      .from("landing_pages")
      .update(filteredPayload)
      .eq("slug", slug);
      
    if (retryError) throw retryError;
    return;
  }

  // If it's not a column error, check if the row exists
  const { data: existing } = await supabase
    .from("landing_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase
      .from("landing_pages")
      .insert({ slug, ...payload } as any);
    
    if (insertError) {
      if (insertError.message.includes("column") || insertError.code === "42703") {
        const filteredPayload = { slug, ...payload } as any;
        delete filteredPayload.settings_draft;
        const { error: retryInsertError } = await supabase
          .from("landing_pages")
          .insert(filteredPayload);
        if (retryInsertError) throw retryInsertError;
      } else {
        throw insertError;
      }
    }
  } else {
    throw updateError;
  }
}

export async function publishLandingPage(slug: string) {
  const { data: row, error: fetchErr } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
    
  if (fetchErr) throw fetchErr;
  if (!row) throw new Error("Draft not found");

  const r = row as any;
  const updatePayload: any = {
    title: r.title,
    theme_published: r.theme_draft,
    sections_published: r.sections_draft,
  };

  // Only include settings_published if settings_draft exists
  if ('settings_draft' in r) {
    updatePayload.settings_published = r.settings_draft;
  }

  const { error } = await supabase
    .from("landing_pages")
    .update(updatePayload)
    .eq("slug", slug);
    
  if (error) throw error;
}
