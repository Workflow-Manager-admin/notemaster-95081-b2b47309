import React, { useState, useEffect } from 'react';
import './App.css';

// Color palette (matching project request)
const COLORS = {
  primary: '#1976D2',
  secondary: '#424242',
  accent: '#FF9800',
  lightBg: '#fff',
  lightSidebar: '#f8f9fa',
  border: '#e0e0e0',
  text: '#282c34',
};

// Backend API base (configure as needed)
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

// ---------- Utilities ----------
function getAuthHeaders(token) {
  return token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    : { 'Content-Type': 'application/json' };
}

// ---------- Auth Components ----------
function AuthForm({ mode, onSubmit, error, loading, switchMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={authFormStyles.wrapper}>
      <h2 style={{ color: COLORS.primary, marginBottom: 16 }}>
        {mode === 'login' ? 'Log In' : 'Sign Up'}
      </h2>
      <form
        style={authFormStyles.form}
        onSubmit={e => {
          e.preventDefault();
          onSubmit(username, password);
        }}
      >
        <input
          style={authFormStyles.input}
          type="text"
          placeholder="Username"
          value={username}
          required
          autoFocus
          onChange={e => setUsername(e.target.value)}
        />
        <input
          style={authFormStyles.input}
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
        />
        <button
          type="submit"
          style={{ ...authFormStyles.button, background: COLORS.primary, color: '#fff' }}
          disabled={loading}
        >
          {loading ? 'Submitting...' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
        {error && <div style={authFormStyles.error}>{error}</div>}
      </form>
      <div style={authFormStyles.switch}>
        {mode === 'login' ? (
          <>
            New here?
            <button onClick={switchMode} style={authFormStyles.linkBtn}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already registered?
            <button onClick={switchMode} style={authFormStyles.linkBtn}>
              Log in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
const authFormStyles = {
  wrapper: {
    margin: 'auto',
    padding: 24,
    maxWidth: 340,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 16px rgba(25, 118, 210, 0.07)',
    border: `1px solid ${COLORS.border}`,
    marginTop: 80,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    fontSize: 16,
    padding: 10,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 7,
    background: '#f8f9fa',
    marginBottom: 2,
  },
  button: {
    fontWeight: 600,
    letterSpacing: 0.2,
    padding: 10,
    marginTop: 8,
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  error: { color: 'red', fontSize: 14, marginTop: 12 },
  switch: { marginTop: 18, fontSize: 15, color: COLORS.secondary },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.accent,
    cursor: 'pointer',
    marginLeft: 8,
    textDecoration: 'underline',
    fontSize: 'inherit',
  },
};

// PUBLIC_INTERFACE
function App() {
  // Auth state
  const [mode, setMode] = useState('login'); // login/signup
  const [user, setUser] = useState(null); // {username, jwt}
  const [token, setToken] = useState(() => localStorage.getItem('notes_jwt') || '');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // CRUD actions
  const [editMode, setEditMode] = useState(false);
  const [creating, setCreating] = useState(false); // creating a new note

  // Theme (always light but add hooks for future)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  // Load user from JWT
  useEffect(() => {
    if (token) {
      // Parse user info from JWT (very basic, not for prod!!)
      try {
        // JWT payload is in middle (base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.username, jwt: token });
      } catch {
        setUser(null);
        setToken('');
        localStorage.removeItem('notes_jwt');
      }
    }
  }, [token]);

  // Fetch notes when logged in
  useEffect(() => {
    if (user && token) {
      loadNotes();
    } else {
      setNotes([]);
      setSelectedId(null);
    }
    // eslint-disable-next-line
  }, [user, token]);

  // ----------------
  // Auth Functions
  // ----------------
  // PUBLIC_INTERFACE
  async function handleAuthSubmit(username, password) {
    setLoadingAuth(true);
    setAuthError('');
    try {
      const endpoint =
        mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(
        API_BASE + endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        }
      );
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('notes_jwt', data.token);
        setToken(data.token);
      } else {
        setAuthError(
          (data && data.message) ||
            'Authentication failed. ' + (res.statusText || '')
        );
      }
    } catch (e) {
      setAuthError('Request failed: ' + e.message);
    }
    setLoadingAuth(false);
  }

  // PUBLIC_INTERFACE
  function handleLogout() {
    setUser(null);
    setToken('');
    localStorage.removeItem('notes_jwt');
    setNotes([]);
    setSelectedId(null);
  }

  // ----------------
  // Notes Functions
  // ----------------
  // PUBLIC_INTERFACE
  async function loadNotes() {
    setNotesLoading(true);
    setNotesError('');
    try {
      const res = await fetch(API_BASE + '/api/notes', {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes || []);
        // Select first note or nothing
        setSelectedId(notes => (notes && notes.length ? notes[0].id : null));
      } else {
        throw new Error((data && data.message) || 'Failed to fetch notes');
      }
    } catch (e) {
      setNotesError(e.message);
      setNotes([]);
    }
    setNotesLoading(false);
  }

  // PUBLIC_INTERFACE
  async function handleDeleteNote(id) {
    if (!window.confirm('Delete this note?')) return;
    try {
      const res = await fetch(API_BASE + `/api/notes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      if (res.ok) {
        setNotes(notes => notes.filter(n => n.id !== id));
        setSelectedId(sel => (sel === id ? null : sel));
      }
    } catch (e) {
      // Optionally handle delete error (ignore for now)
    }
  }

  // PUBLIC_INTERFACE
  async function handleSaveNote(note) {
    // note: {id?, title, content}
    const editing = !!note.id;
    const method = editing ? 'PUT' : 'POST';
    const endpoint = editing
      ? `/api/notes/${note.id}`
      : '/api/notes';
    try {
      const res = await fetch(API_BASE + endpoint, {
        method,
        headers: getAuthHeaders(token),
        body: JSON.stringify({ title: note.title, content: note.content }),
      });
      const data = await res.json();
      if (res.ok) {
        if (editing) {
          setNotes(notes =>
            notes.map(n => (n.id === note.id ? data.note : n))
          );
          setSelectedId(note.id);
        } else {
          setNotes(notes => [data.note, ...notes]);
          setSelectedId(data.note.id);
          setCreating(false);
        }
        setEditMode(false);
      } else {
        alert((data && data.message) || 'Error saving note');
      }
    } catch (e) {
      alert('Error saving note: ' + e.message);
    }
  }

  // ----------------
  // UI Layout
  // ----------------
  if (!user) {
    // Show login/signup page
    return (
      <div style={mainBgStyles}>
        <Header
          user={null}
          onLogout={handleLogout}
        />
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
          <AuthForm
            mode={mode}
            onSubmit={handleAuthSubmit}
            loading={loadingAuth}
            error={authError}
            switchMode={() => setMode(mode === 'login' ? 'signup' : 'login')}
          />
        </div>
      </div>
    );
  }

  // Find selected note object
  const selectedNote =
    notes.find(n => n.id === selectedId) || (creating ? { title: '', content: '' } : null);

  return (
    <div style={containerStyles.wrapper}>
      <Header user={user} onLogout={handleLogout} />
      <div style={containerStyles.body}>
        {/* Sidebar with notes list */}
        <Sidebar
          notes={notes}
          selectedId={selectedId}
          onSelect={id => {
            setSelectedId(id);
            setCreating(false);
            setEditMode(false);
          }}
          onCreate={() => {
            setSelectedId(null);
            setCreating(true);
            setEditMode(true);
          }}
          onDelete={handleDeleteNote}
          loading={notesLoading}
          error={notesError}
        />
        {/* Main content area */}
        <main style={containerStyles.main}>
          {/* Main area: show note if selected/creating, else empty */}
          {notesLoading ? (
            <div style={{ padding: 30, color: COLORS.secondary }}>Loading notes...</div>
          ) : creating || (selectedNote && editMode) ? (
            <NoteEditor
              key={selectedId || 'new'}
              note={selectedNote}
              onSave={handleSaveNote}
              onCancel={() => {
                setEditMode(false);
                setCreating(false);
                if (notes.length) setSelectedId(notes[0].id);
              }}
            />
          ) : selectedNote ? (
            <NoteViewer
              note={selectedNote}
              onEdit={() => setEditMode(true)}
            />
          ) : (
            <div style={{ color: COLORS.secondary, padding: 20 }}>
              {notes.length
                ? 'Select a note from the sidebar to view.'
                : 'No notes. Create your first note!'}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------- Header ----------
function Header({ user, onLogout }) {
  return (
    <header style={headerStyles.header}>
      <div style={headerStyles.titleContainer}>
        <span style={headerStyles.brandAccent}>📝</span>
        <span style={headerStyles.title}>NoteMaster</span>
      </div>
      {user && (
        <div style={headerStyles.userActions}>
          <span style={headerStyles.username}>{user.username}</span>
          <button
            style={headerStyles.logoutBtn}
            onClick={onLogout}
            title="Log out"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
const headerStyles = {
  header: {
    background: COLORS.primary,
    color: '#fff',
    padding: '0 24px',
    height: 54,
    minHeight: 54,
    borderBottom: `2px solid ${COLORS.secondary}11`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 12,
  },
  titleContainer: { display: 'flex', alignItems: 'center', gap: 10 },
  brandAccent: {
    fontWeight: 'bold',
    fontSize: 26,
    color: COLORS.accent,
    marginRight: 2,
    lineHeight: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
  },
  userActions: { display: 'flex', alignItems: 'center', gap: 12 },
  username: {
    fontWeight: 600,
    background: `${COLORS.secondary}11`,
    color: '#fff',
    borderRadius: 6,
    padding: '4px 13px',
    fontSize: 15,
    marginRight: 5,
  },
  logoutBtn: {
    background: COLORS.secondary,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontWeight: 600,
    padding: '7px 13px',
    fontSize: 15,
    cursor: 'pointer',
  },
};

// ---------- Sidebar ----------
function Sidebar({ notes, selectedId, onSelect, onCreate, onDelete, loading, error }) {
  return (
    <nav style={sidebarStyles.sidebar}>
      <div style={sidebarStyles.header}>
        <span style={sidebarStyles.label}>Your Notes</span>
        <button style={sidebarStyles.addBtn} title="New note" onClick={onCreate}>
          +
        </button>
      </div>
      {loading ? (
        <div style={sidebarStyles.loadingText}>Loading…</div>
      ) : error ? (
        <div style={sidebarStyles.errorText}>{error}</div>
      ) : notes.length === 0 ? (
        <div style={sidebarStyles.emptyText}>No notes</div>
      ) : (
        <ul style={sidebarStyles.list}>
          {notes.map(note => (
            <li
              key={note.id}
              style={{
                ...sidebarStyles.item,
                ...(selectedId === note.id
                  ? sidebarStyles.selected
                  : {}),
              }}
              onClick={() => onSelect(note.id)}
            >
              <span style={{ flex: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {note.title || <span style={{ color: COLORS.secondary }}>Untitled</span>}
              </span>
              <button
                style={sidebarStyles.deleteBtn}
                title="Delete note"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
const sidebarStyles = {
  sidebar: {
    background: COLORS.lightSidebar,
    borderRight: `1px solid ${COLORS.border}`,
    width: 268,
    minWidth: 210,
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    transition: 'background 0.23s,border 0.23s',
    zIndex: 4,
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 13px 10px 13px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  label: {
    fontWeight: 700,
    fontSize: 16,
    color: COLORS.primary,
    letterSpacing: 0.02,
    flex: 1,
  },
  addBtn: {
    background: COLORS.accent,
    color: '#fff',
    border: 'none',
    fontWeight: 800,
    fontSize: 19,
    borderRadius: 6,
    cursor: 'pointer',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    padding: 0,
    margin: 0,
    listStyle: 'none',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 15px',
    border: 'none',
    borderBottom: `1.5px solid #eeeeee`,
    background: 'none',
    fontSize: 15.7,
    fontWeight: 500,
    color: COLORS.text,
    cursor: 'pointer',
    transition: 'background 0.16s,color 0.16s',
    gap: 6,
  },
  selected: {
    background: COLORS.accent + '20',
    color: COLORS.primary,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.secondary,
    fontSize: 17,
    marginLeft: 7,
    cursor: 'pointer',
    padding: 2,
    borderRadius: 6,
  },
  loadingText: { padding: 24, color: COLORS.secondary },
  emptyText: { padding: 24, color: COLORS.secondary },
  errorText: { padding: 14, color: 'red' },
};

// ---------- Note Viewer ----------
function NoteViewer({ note, onEdit }) {
  return (
    <div style={noteViewerStyles.container}>
      <div style={noteViewerStyles.titleRow}>
        <h2 style={noteViewerStyles.title}>
          {note.title || <span style={{ color: COLORS.secondary }}>Untitled</span>}
        </h2>
        <button style={noteViewerStyles.editBtn} onClick={onEdit} title="Edit note">
          ✎ Edit
        </button>
      </div>
      <div style={noteViewerStyles.content}>
        <pre style={noteViewerStyles.pre}>{note.content || <i>(Empty note)</i>}</pre>
      </div>
    </div>
  );
}
const noteViewerStyles = {
  container: { padding: 32, maxWidth: 800, margin: '30px auto', background: '#fff', borderRadius: 12, border: `1px solid ${COLORS.border}` },
  titleRow: { display: 'flex', alignItems: 'center', gap: 20 },
  title: { flex: 1, fontSize: 27, margin: 0, fontWeight: 700, color: COLORS.primary },
  editBtn: { background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 19px', fontWeight: 600, fontSize: 16, cursor: 'pointer' },
  content: { marginTop: 19, minHeight: 130, fontSize: 17, color: COLORS.secondary },
  pre: { fontFamily: 'inherit', margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
};

// ---------- Note Editor ----------
function NoteEditor({ note, onSave, onCancel }) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...note, title, content });
    setSaving(false);
  };

  return (
    <form style={noteEditorStyles.form} onSubmit={handleSubmit}>
      <input
        style={noteEditorStyles.input}
        placeholder="Title"
        value={title}
        autoFocus
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        style={noteEditorStyles.textarea}
        placeholder="Content"
        value={content}
        rows={9}
        onChange={e => setContent(e.target.value)}
      />
      <div style={noteEditorStyles.actions}>
        <button
          type="button"
          style={noteEditorStyles.cancelBtn}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={noteEditorStyles.saveBtn}
          disabled={saving || (!title.trim() && !content.trim())}
        >
          {saving ? 'Saving...' : note.id ? 'Save Changes' : 'Create Note'}
        </button>
      </div>
    </form>
  );
}
const noteEditorStyles = {
  form: { padding: 34, background: '#fff', borderRadius: 12, maxWidth: 700, margin: '35px auto', display: 'flex', flexDirection: 'column', gap: 18, border: `1px solid ${COLORS.border}` },
  input: {
    fontSize: 20,
    fontWeight: 600,
    padding: 11,
    border: `1.2px solid ${COLORS.primary}33`,
    borderRadius: 7,
    marginBottom: 2,
  },
  textarea: {
    fontSize: 16,
    padding: 12,
    border: `1.2px solid ${COLORS.primary}15`,
    borderRadius: 7,
    minHeight: 112,
    resize: 'vertical',
  },
  actions: { display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: {
    background: COLORS.secondary,
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '8px 18px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 15,
    marginRight: 10,
  },
  saveBtn: {
    background: COLORS.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '8px 22px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 15,
  },
};

// ---------- Page Container Styles ----------
const containerStyles = {
  wrapper: {
    minHeight: '100vh',
    background: COLORS.lightBg,
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    height: 'calc(100vh - 54px)',
    width: '100%',
  },
  main: {
    flex: 1,
    padding: 0,
    width: 0, // enables main's flex:1 to squeeze if sidebar visible on mobile
    background: '#fafbff',
    overflowY: 'auto',
    minHeight: 0,
  },
};

const mainBgStyles = {
  minHeight: '100vh',
  background: 'linear-gradient(120deg,#fff,#e3edfa 69%, #fafbff)',
};

export default App;
