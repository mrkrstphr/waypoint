import { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useParams, Navigate } from "react-router-dom";
import { supabase } from "./supabase";

// ── Constants ─────────────────────────────────────────────────────────────────
const NOTE_TYPES = [
  { id: "idea",      label: "Idea",      color: "#B85C38" },
  { id: "scene",     label: "Scene",     color: "#4A7C6F" },
  { id: "character", label: "Character", color: "#6B5EA8" },
  { id: "setting",   label: "Setting",   color: "#8B6914" },
  { id: "research",  label: "Research",  color: "#2E6B9E" },
  { id: "reminder",  label: "Reminder",  color: "#7A3B3B" },
];
const TYPE_MAP = Object.fromEntries(NOTE_TYPES.map(t => [t.id, t]));
const typeColor = id => TYPE_MAP[id]?.color ?? "#4A5568";
const typeLabel = id => TYPE_MAP[id]?.label ?? "Note";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Styles ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #1C1F26; --surface: #23272F; --card: #2A2F3A; --border: #333845;
    --text: #E8E0D0; --muted: #7A8299; --accent: #B85C38; --accent-hi: #D46A42;
    --cream: #F5F0E8; --font-head: 'Playfair Display', Georgia, serif;
    --font-ui: 'Inter', system-ui, sans-serif;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-ui); min-height: 100vh; -webkit-font-smoothing: antialiased; }
  .app { display: flex; flex-direction: column; min-height: 100vh; max-width: 680px; margin: 0 auto; }

  /* Auth */
  .auth-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; gap: 8px; }
  .auth-logo { font-family: var(--font-head); font-size: 36px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .auth-sub { font-size: 15px; color: var(--muted); margin-bottom: 28px; }
  .auth-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 28px 24px; width: 100%; max-width: 380px; }
  .auth-card h2 { font-family: var(--font-head); font-size: 20px; margin-bottom: 20px; color: var(--text); }
  .auth-input { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 11px 14px; font-family: var(--font-ui); font-size: 15px; color: var(--text); width: 100%; outline: none; margin-bottom: 10px; transition: border-color .15s; }
  .auth-input:focus { border-color: var(--accent); }
  .auth-input::placeholder { color: var(--muted); }
  .auth-btn { background: var(--accent); color: var(--cream); border: none; border-radius: 8px; padding: 12px; width: 100%; font-family: var(--font-ui); font-size: 15px; font-weight: 600; cursor: pointer; transition: background .15s; margin-top: 4px; }
  .auth-btn:hover { background: var(--accent-hi); }
  .auth-btn:disabled { opacity: .5; cursor: default; }
  .auth-toggle { margin-top: 16px; text-align: center; font-size: 13px; color: var(--muted); }
  .auth-toggle span { color: var(--accent); cursor: pointer; }
  .auth-error { font-size: 13px; color: #E05555; margin-top: 8px; text-align: center; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 12px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; background: var(--bg); }
  .header-back { display: flex; align-items: center; gap: 8px; background: none; border: none; color: var(--muted); font-family: var(--font-ui); font-size: 14px; cursor: pointer; padding: 4px 0; transition: color .15s; }
  .header-back:hover { color: var(--text); }
  .header-title { font-family: var(--font-head); font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -.3px; }
  .header-subtitle { font-size: 12px; color: var(--muted); margin-top: 1px; }
  .header-actions { display: flex; gap: 8px; align-items: center; }
  .header-action { background: var(--accent); color: var(--cream); border: none; border-radius: 8px; padding: 8px 16px; font-family: var(--font-ui); font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; white-space: nowrap; }
  .header-action:hover { background: var(--accent-hi); }
  .header-action.ghost { background: var(--card); color: var(--muted); border: 1px solid var(--border); }
  .header-action.ghost:hover { color: var(--text); }

  /* Dashboard */
  .dashboard-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 32px; text-align: center; }
  .dashboard-empty-icon { font-size: 48px; opacity: .4; }
  .dashboard-empty h2 { font-family: var(--font-head); font-size: 24px; color: var(--text); }
  .dashboard-empty p { font-size: 15px; color: var(--muted); line-height: 1.5; max-width: 280px; }
  .stories-grid { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .story-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; cursor: pointer; transition: border-color .15s, transform .1s; position: relative; overflow: hidden; }
  .story-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); border-radius: 12px 0 0 12px; }
  .story-card:hover { border-color: #4A5568; transform: translateY(-1px); }
  .story-card-title { font-family: var(--font-head); font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; padding-left: 12px; }
  .story-card-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--muted); padding-left: 12px; }
  .story-card-count { background: var(--surface); border-radius: 4px; padding: 2px 7px; font-size: 11px; font-weight: 600; color: var(--muted); }

  /* Notebook */
  .notebook-filters { display: flex; gap: 8px; padding: 14px 20px 0; overflow-x: auto; scrollbar-width: none; }
  .notebook-filters::-webkit-scrollbar { display: none; }
  .filter-chip { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 5px 13px; font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; white-space: nowrap; transition: all .15s; flex-shrink: 0; }
  .filter-chip.active { color: var(--cream); border-color: transparent; }
  .notes-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .note-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; cursor: pointer; transition: border-color .15s; display: flex; }
  .note-card:hover { border-color: #4A5568; }
  .note-card-strip { width: 4px; flex-shrink: 0; }
  .note-card-body { padding: 14px 16px; flex: 1; min-width: 0; }
  .note-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .note-type-badge { font-size: 10px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,.07); }
  .note-time { font-size: 11px; color: var(--muted); margin-left: auto; }
  .note-card-preview { font-size: 14px; color: var(--text); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; opacity: .85; }
  .note-card-title { font-family: var(--font-head); font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .notebook-empty { padding: 60px 32px; text-align: center; color: var(--muted); }
  .notebook-empty p { font-size: 15px; line-height: 1.6; }

  /* Editor */
  .editor-wrap { display: flex; flex-direction: column; flex: 1; }
  .editor-type-row { display: flex; gap: 8px; padding: 14px 20px 0; overflow-x: auto; scrollbar-width: none; }
  .editor-type-row::-webkit-scrollbar { display: none; }
  .type-chip { border-radius: 20px; padding: 5px 13px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; border: 1.5px solid transparent; transition: all .15s; background: var(--card); color: var(--muted); border-color: var(--border); }
  .type-chip.selected { color: var(--cream); }
  .editor-title-input { background: none; border: none; outline: none; font-family: var(--font-head); font-size: 24px; font-weight: 700; color: var(--text); padding: 16px 20px 8px; width: 100%; resize: none; }
  .editor-title-input::placeholder { color: var(--muted); opacity: .6; }
  .editor-divider { height: 1px; background: var(--border); margin: 0 20px; }
  .editor-body-input { background: none; border: none; outline: none; font-family: var(--font-ui); font-size: 16px; line-height: 1.7; color: var(--text); padding: 16px 20px; width: 100%; flex: 1; resize: none; min-height: 280px; }
  .editor-body-input::placeholder { color: var(--muted); opacity: .5; }
  .editor-footer { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; bottom: 0; background: var(--bg); z-index: 10; }
  .editor-save { background: var(--accent); color: var(--cream); border: none; border-radius: 8px; padding: 10px 24px; font-family: var(--font-ui); font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
  .editor-save:hover { background: var(--accent-hi); }
  .editor-delete { background: none; border: none; color: var(--muted); font-family: var(--font-ui); font-size: 13px; cursor: pointer; padding: 10px 0; transition: color .15s; }
  .editor-delete:hover { color: #E05555; }
  .editor-autosave { font-size: 12px; color: var(--muted); }

  /* Story picker */
  .story-picker { padding: 14px 20px 0; }
  .story-picker label { font-size: 12px; color: var(--muted); font-weight: 500; display: block; margin-bottom: 6px; }
  .story-picker select { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-family: var(--font-ui); font-size: 15px; color: var(--text); width: 100%; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A8299' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
  .story-picker select option { background: var(--surface); }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px 16px 0 0; padding: 28px 24px 40px; width: 100%; max-width: 680px; }
  .modal h2 { font-family: var(--font-head); font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 18px; }
  .modal-input { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; font-family: var(--font-ui); font-size: 16px; color: var(--text); width: 100%; outline: none; transition: border-color .15s; }
  .modal-input:focus { border-color: var(--accent); }
  .modal-input::placeholder { color: var(--muted); }
  .modal-actions { display: flex; gap: 10px; margin-top: 16px; }
  .modal-cancel { flex: 1; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; color: var(--muted); font-family: var(--font-ui); font-size: 15px; font-weight: 500; cursor: pointer; }
  .modal-confirm { flex: 2; background: var(--accent); border: none; border-radius: 8px; padding: 12px; color: var(--cream); font-family: var(--font-ui); font-size: 15px; font-weight: 600; cursor: pointer; transition: background .15s; }
  .modal-confirm:hover { background: var(--accent-hi); }
  .modal-confirm:disabled { opacity: .4; cursor: default; }

  .loading { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 15px; }

  @media (min-width: 480px) {
    .modal-overlay { align-items: center; padding: 20px; }
    .modal { border-radius: 16px; }
  }
`;

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setError(""); setMessage("");
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({ email, password });
      if (e) setError(e.message);
      else setMessage("Check your email to confirm your account.");
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-logo">Waypoint</div>
      <div className="auth-sub">Your story notebooks, everywhere.</div>
      <div className="auth-card">
        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        <input className="auth-input" type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        <input className="auth-input" type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        {error && <div className="auth-error">{error}</div>}
        {message && <div style={{ fontSize: 13, color: "#4A7C6F", marginTop: 8, textAlign: "center" }}>{message}</div>}
        <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <div className="auth-toggle">
          {mode === "login"
            ? <>No account? <span onClick={() => { setMode("signup"); setError(""); }}>Sign up</span></>
            : <>Have an account? <span onClick={() => { setMode("login"); setError(""); }}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}

// ── Data hook ─────────────────────────────────────────────────────────────────
function useData(session) {
  const [stories, setStories] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!session) return;
    supabase.from("stories").select("*").order("created_at", { ascending: false })
      .then(({ data }) => data && setStories(data));
    supabase.from("notes").select("*").order("updated_at", { ascending: false })
      .then(({ data }) => data && setNotes(data));
  }, [session]);

  async function createStory(name, userId) {
    const { data } = await supabase.from("stories").insert({ name: name.trim(), user_id: userId }).select().single();
    if (data) setStories(prev => [data, ...prev]);
    return data;
  }

  async function saveNote({ id, storyId, title, body, type, userId }) {
    const now = new Date().toISOString();
    if (id) {
      const { data } = await supabase.from("notes").update({ title, body, type, updated_at: now }).eq("id", id).select().single();
      if (data) setNotes(prev => prev.map(n => n.id === id ? data : n));
      return data;
    } else {
      const { data } = await supabase.from("notes").insert({ story_id: storyId, title, body, type, user_id: userId }).select().single();
      if (data) setNotes(prev => [data, ...prev]);
      return data;
    }
  }

  async function deleteNote(id) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  return { stories, notes, createStory, saveNote, deleteNote };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ session, stories, notes, createStory }) {
  const navigate = useNavigate();
  const [showNewStory, setShowNewStory] = useState(false);
  const [newStoryName, setNewStoryName] = useState("");

  const storyNoteCounts = Object.fromEntries(stories.map(s => [s.id, notes.filter(n => n.story_id === s.id).length]));

  async function handleCreate() {
    if (!newStoryName.trim()) return;
    const story = await createStory(newStoryName, session.user.id);
    setNewStoryName(""); setShowNewStory(false);
    if (story) navigate(`/story/${story.id}`);
  }

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Waypoint</div>
          <div className="header-subtitle">{stories.length === 0 ? "Your stories start here" : `${stories.length} notebook${stories.length !== 1 ? "s" : ""}`}</div>
        </div>
        <div className="header-actions">
          <button className="header-action ghost" onClick={() => navigate("/capture")}>+ Quick note</button>
          <button className="header-action" onClick={() => setShowNewStory(true)}>New story</button>
          <button className="header-action ghost" style={{ padding: "8px 10px" }} title="Sign out" onClick={() => supabase.auth.signOut()}>↩</button>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="dashboard-empty">
          <div className="dashboard-empty-icon">📓</div>
          <h2>No notebooks yet</h2>
          <p>Create a story to start collecting ideas, scenes, characters, and more.</p>
          <button className="header-action" style={{ marginTop: 8 }} onClick={() => setShowNewStory(true)}>Create your first story</button>
        </div>
      ) : (
        <div className="stories-grid">
          {stories.map(story => {
            const lastNote = notes.filter(n => n.story_id === story.id).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
            return (
              <div key={story.id} className="story-card" onClick={() => navigate(`/story/${story.id}`)}>
                <div className="story-card-title">{story.name}</div>
                <div className="story-card-meta">
                  <span className="story-card-count">{storyNoteCounts[story.id] || 0} note{storyNoteCounts[story.id] !== 1 ? "s" : ""}</span>
                  {lastNote && <span>{timeAgo(lastNote.updated_at)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewStory && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewStory(false); }}>
          <div className="modal">
            <h2>New story</h2>
            <input className="modal-input" placeholder="Give it a working title…" value={newStoryName} autoFocus
              onChange={e => setNewStoryName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNewStory(false); }} />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => { setShowNewStory(false); setNewStoryName(""); }}>Cancel</button>
              <button className="modal-confirm" disabled={!newStoryName.trim()} onClick={handleCreate}>Create notebook</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Notebook ──────────────────────────────────────────────────────────────────
function Notebook({ stories, notes }) {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const story = stories.find(s => s.id === storyId);

  const notebookNotes = notes
    .filter(n => n.story_id === storyId)
    .filter(n => filter === "all" || n.type === filter);

  if (stories.length > 0 && !story) return <Navigate to="/" replace />;

  return (
    <>
      <div className="header">
        <div>
          <button className="header-back" onClick={() => navigate("/")}>← All stories</button>
          <div className="header-title">{story?.name}</div>
        </div>
        <button className="header-action" onClick={() => navigate(`/story/${storyId}/note/new`)}>+ Add note</button>
      </div>

      <div className="notebook-filters">
        {["all", ...NOTE_TYPES.map(t => t.id)].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`}
            style={filter === f ? { background: f === "all" ? "var(--accent)" : typeColor(f), borderColor: "transparent" } : {}}
            onClick={() => setFilter(f)}>
            {f === "all" ? "All" : typeLabel(f)}
          </button>
        ))}
      </div>

      {notebookNotes.length === 0 ? (
        <div className="notebook-empty">
          <p>{filter === "all" ? "No notes yet. Tap + Add note to start." : `No ${typeLabel(filter).toLowerCase()} notes yet.`}</p>
        </div>
      ) : (
        <div className="notes-list">
          {notebookNotes.map(note => (
            <div key={note.id} className="note-card" onClick={() => navigate(`/story/${storyId}/note/${note.id}`)}>
              <div className="note-card-strip" style={{ background: typeColor(note.type) }} />
              <div className="note-card-body">
                <div className="note-card-top">
                  <span className="note-type-badge" style={{ color: typeColor(note.type) }}>{typeLabel(note.type)}</span>
                  <span className="note-time">{timeAgo(note.updated_at)}</span>
                </div>
                {note.title && <div className="note-card-title">{note.title}</div>}
                {note.body && <div className="note-card-preview">{note.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────
function Editor({ session, stories, notes, saveNote, deleteNote, isCapture = false }) {
  const { storyId, noteId } = useParams();
  const navigate = useNavigate();
  const existingNote = noteId && noteId !== "new" ? notes.find(n => n.id === noteId) : null;

  const [title, setTitle] = useState(existingNote?.title ?? "");
  const [body, setBody] = useState(existingNote?.body ?? "");
  const [type, setType] = useState(existingNote?.type ?? "idea");
  const [selectedStoryId, setSelectedStoryId] = useState(existingNote?.story_id ?? storyId ?? stories[0]?.id ?? null);
  const [saved, setSaved] = useState(true);
  const [currentNoteId, setCurrentNoteId] = useState(existingNote?.id ?? null);
  const saveTimer = useRef(null);

  // Update state if note loads after mount
  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title ?? "");
      setBody(existingNote.body ?? "");
      setType(existingNote.type ?? "idea");
      setSelectedStoryId(existingNote.story_id);
      setCurrentNoteId(existingNote.id);
    }
  }, [existingNote?.id]);

  const story = stories.find(s => s.id === (existingNote?.story_id ?? storyId));

  function handleChange(field, val) {
    if (field === "title") setTitle(val);
    if (field === "body") setBody(val);
    if (field === "type") setType(val);
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(false, field === "title" ? (field === "title" ? val : title) : title, field === "body" ? val : body, field === "type" ? val : type), 1500);
  }

  async function doSave(navigateBack = true, t = title, b = body, tp = type) {
    clearTimeout(saveTimer.current);
    if (!t.trim() && !b.trim()) {
      if (navigateBack) navigate(isCapture ? "/" : `/story/${storyId}`);
      return;
    }
    const data = await saveNote({ id: currentNoteId, storyId: selectedStoryId, title: t.trim(), body: b.trim(), type: tp, userId: session.user.id });
    if (data && !currentNoteId) setCurrentNoteId(data.id);
    setSaved(true);
    if (navigateBack) navigate(isCapture ? "/" : `/story/${storyId}`);
  }

  async function handleDelete() {
    if (!currentNoteId) { navigate(isCapture ? "/" : `/story/${storyId}`); return; }
    if (!window.confirm("Delete this note?")) return;
    await deleteNote(currentNoteId);
    navigate(isCapture ? "/" : `/story/${storyId}`);
  }

  return (
    <>
      <div className="header">
        <div>
          <button className="header-back" onClick={() => { doSave(false); navigate(isCapture ? "/" : `/story/${storyId}`); }}>
            ← {isCapture ? "Stories" : story?.name ?? "Notebook"}
          </button>
          <div className="header-title" style={{ fontSize: 16 }}>{currentNoteId ? "Edit note" : "New note"}</div>
        </div>
      </div>

      {isCapture && (
        <div className="story-picker">
          <label>Story</label>
          {stories.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>
              No stories yet — <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => navigate("/")}>create one first</span>
            </div>
          ) : (
            <select value={selectedStoryId ?? ""} onChange={e => setSelectedStoryId(e.target.value)}>
              {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="editor-wrap">
        <div className="editor-type-row">
          {NOTE_TYPES.map(t => (
            <button key={t.id} className={`type-chip ${type === t.id ? "selected" : ""}`}
              style={type === t.id ? { background: t.color + "22", borderColor: t.color, color: t.color } : {}}
              onClick={() => handleChange("type", t.id)}>{t.label}</button>
          ))}
        </div>
        <textarea className="editor-title-input" placeholder="Title (optional)" value={title}
          onChange={e => handleChange("title", e.target.value)} rows={1}
          style={{ height: "auto", overflow: "hidden" }}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} />
        <div className="editor-divider" />
        <textarea className="editor-body-input" placeholder="Write your idea, scene, character note, reminder… anything."
          value={body} onChange={e => handleChange("body", e.target.value)} autoFocus />
        <div className="editor-footer">
          <button className="editor-delete" onClick={handleDelete}>{currentNoteId ? "Delete note" : "Discard"}</button>
          <span className="editor-autosave">{saved ? "Saved" : "Saving…"}</span>
          <button className="editor-save" onClick={() => doSave(true)}>Save note</button>
        </div>
      </div>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const { stories, notes, createStory, saveNote, deleteNote } = useData(session);

  if (session === undefined) return <><style>{css}</style><div className="app"><div className="loading">Loading…</div></div></>;
  if (!session) return <><style>{css}</style><div className="app"><AuthScreen /></div></>;

  const shared = { session, stories, notes, saveNote, deleteNote };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard {...shared} createStory={createStory} />} />
          <Route path="/story/:storyId" element={<Notebook {...shared} />} />
          <Route path="/story/:storyId/note/:noteId" element={<Editor {...shared} />} />
          <Route path="/capture" element={<Editor {...shared} isCapture />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
