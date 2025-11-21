export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const supabaseConfig: SupabaseConfig;
export const isSupabaseConfigured: boolean;
export const supabase: any;
export function checkSupabaseConnection(): Promise<boolean>;
export default supabaseConfig;