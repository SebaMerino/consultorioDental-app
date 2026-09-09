// ==========================================
// CONEXIÓN A SUPABASE
// ==========================================
// Esta clave "publishable" es segura para usar en el frontend:
// no da acceso a nada por sí sola, todo el acceso real lo controlan
// las políticas de seguridad (RLS) que ya configuramos en la base.

const SUPABASE_URL = 'https://liswambeeczjikguafoe.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_puRkH3u-vWifQnIiUTMsGQ_qmfBdU9L';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
