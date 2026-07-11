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

/**
 * Aggressively saves a landing page by recursively removing columns that cause schema errors.
 * This is a failsafe for Lovable Cloud / Supabase schema sync delays.
 */
export async function saveLandingPage(
  slug: string,
  payload: any,
  attempt: number = 0
): Promise<void> {
  // Limit recursion to avoid infinite loops
  if (attempt > 5) throw new Error("Too many schema mismatch attempts");

  const { error } = await supabase
    .from("landing_pages")
    .upsert({ slug, ...payload }, { onConflict: 'slug' });

  if (!error) return;

  console.error(`Save attempt ${attempt} failed:`, error);

  // Check if error is related to a missing column
  // PostgREST error format: "Could not find the 'column_name' column of 'table_name' in the schema cache"
  // Postgres error format: "column \"column_name\" of relation \"table_name\" does not exist"
  const missingColumnMatch = error.message.match(/find the '([^']+)' column/) || 
                               error.message.match(/column "([^"]+)"/);

  if (missingColumnMatch && missingColumnMatch[1]) {
    const columnName = missingColumnMatch[1];
    console.warn(`Detected missing column '${columnName}', filtering and retrying...`);
    
    const newPayload = { ...payload };
    delete newPayload[columnName];
    
    // Recursive call with filtered payload
    return saveLandingPage(slug, newPayload, attempt + 1);
  }

  // If it's not a column error or we couldn't parse it, try the old fallback
  if (error.message.includes("settings_draft") || error.code === "42703") {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.settings_draft;
    delete fallbackPayload.settings_published;
    delete fallbackPayload.sections_draft;
    delete fallbackPayload.sections_published;
    delete fallbackPayload.theme_draft;
    delete fallbackPayload.theme_published;
    
    const { error: finalError } = await supabase
      .from("landing_pages")
      .upsert({ slug, ...fallbackPayload }, { onConflict: 'slug' });
      
    if (finalError) throw finalError;
    return;
  }

  throw error;
}

export async function publishLandingPage(slug: string, attempt: number = 0): Promise<void> {
  if (attempt > 5) throw new Error("Too many schema mismatch attempts during publish");

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
    settings_published: r.settings_draft,
  };

  // Filter out columns that don't exist in the fetched row (to avoid sending null to non-existent columns)
  Object.keys(updatePayload).forEach(key => {
    if (!(key.replace('_published', '_draft') in r) && key !== 'title' && !(key in r)) {
      delete updatePayload[key];
    }
  });

  const { error } = await supabase
    .from("landing_pages")
    .update(updatePayload)
    .eq("slug", slug);
    
  if (!error) return;

  const missingColumnMatch = error.message.match(/find the '([^']+)' column/) || 
                               error.message.match(/column "([^"]+)"/);

  if (missingColumnMatch && missingColumnMatch[1]) {
    const columnName = missingColumnMatch[1];
    console.warn(`Detected missing column '${columnName}' during publish, filtering...`);
    
    // We can't easily filter the payload here without knowing which draft column it maps to,
    // but we can try a generic approach.
    const newPayload = { ...updatePayload };
    delete newPayload[columnName];
    
    const { error: retryError } = await supabase
      .from("landing_pages")
      .update(newPayload)
      .eq("slug", slug);
      
    if (retryError) throw retryError;
    return;
  }

  throw error;
}
