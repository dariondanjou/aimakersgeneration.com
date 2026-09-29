import { requireAdmin, getVerifiedUser, serviceClient } from "./_lib/admin-auth.js";

// Every site account, for admins: /community/admin/users.
//
//   GET                         → { users: [...] } with each account's admin status
//   POST { userId, admin }      → make that account an admin (true) or not (false)
//
// Admins only (signed in with their own account — see _lib/admin-auth.js).
// Admin status mirrors public.is_admin(): the user id is in public.admin_users,
// or their CONFIRMED email is in public.admin_emails. Granting adds the id to
// admin_users; revoking removes the account from both lists. You can't remove
// your own admin access, or the last admin's.

async function allAuthUsers(supabase) {
  const users = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

async function adminLists(supabase) {
  const [ids, emails] = await Promise.all([
    supabase.from("admin_users").select("user_id"),
    supabase.from("admin_emails").select("email"),
  ]);
  if (ids.error) throw new Error(ids.error.message);
  if (emails.error) throw new Error(emails.error.message);
  return {
    ids: new Set((ids.data || []).map((r) => r.user_id)),
    emails: new Set((emails.data || []).map((r) => r.email)),
  };
}

const adminVia = (u, lists) => {
  const email = (u.email || "").toLowerCase();
  const byId = lists.ids.has(u.id);
  const byEmail = !!email && lists.emails.has(email) && !!u.email_confirmed_at;
  return byId || byEmail;
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const denied = await requireAdmin(req);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const supabase = serviceClient();

  try {
    if (req.method === "GET") {
      const [authUsers, lists, profiles] = await Promise.all([
        allAuthUsers(supabase),
        adminLists(supabase),
        supabase.from("profiles").select("id, username, first_name, last_name, avatar_url"),
      ]);
      if (profiles.error) throw new Error(profiles.error.message);
      const profileById = new Map((profiles.data || []).map((p) => [p.id, p]));

      const users = authUsers.map((u) => {
        const p = profileById.get(u.id);
        const meta = u.user_metadata || {};
        const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ")
          || meta.full_name || meta.name || p?.username || "";
        return {
          id: u.id,
          email: u.email || null,
          name,
          username: p?.username || null,
          avatar_url: p?.avatar_url || meta.avatar_url || null,
          provider: u.app_metadata?.provider || null,
          confirmed: !!u.email_confirmed_at,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          is_admin: adminVia(u, lists),
        };
      });
      users.sort((a, b) => (b.is_admin - a.is_admin) || String(b.created_at).localeCompare(String(a.created_at)));
      return res.status(200).json({ users });
    }

    // ── POST: grant / revoke ───────────────────────────────────────────────
    const { userId, admin } = req.body || {};
    if (typeof userId !== "string" || typeof admin !== "boolean") {
      return res.status(400).json({ error: "Missing userId or admin." });
    }
    const me = await getVerifiedUser(req);

    const { data: target, error: targetErr } = await supabase.auth.admin.getUserById(userId);
    if (targetErr || !target?.user) return res.status(404).json({ error: "That account doesn't exist." });
    const t = target.user;
    const email = (t.email || "").toLowerCase();

    if (admin) {
      // An unconfirmed email could be someone squatting on a real person's address.
      if (!t.email_confirmed_at) {
        return res.status(400).json({ error: "That account hasn't confirmed its email yet, so it can't be made an admin." });
      }
      const { error } = await supabase.from("admin_users").upsert({ user_id: t.id }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    } else {
      if (me && me.id === t.id) {
        return res.status(400).json({ error: "You can't remove your own admin access. Ask another admin." });
      }
      const [authUsers, lists] = await Promise.all([allAuthUsers(supabase), adminLists(supabase)]);
      const remaining = authUsers.filter((u) => u.id !== t.id && adminVia(u, lists));
      if (remaining.length === 0) return res.status(400).json({ error: "There has to be at least one admin." });

      const [a, b] = await Promise.all([
        supabase.from("admin_users").delete().eq("user_id", t.id),
        email ? supabase.from("admin_emails").delete().eq("email", email) : Promise.resolve({ error: null }),
      ]);
      if (a.error || b.error) throw new Error((a.error || b.error).message);
    }

    console.log(`admin-users: ${me?.email || me?.id} ${admin ? "granted" : "revoked"} admin for ${t.email || t.id}`);
    return res.status(200).json({ ok: true, userId: t.id, is_admin: admin });
  } catch (err) {
    console.error("admin-users:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
