import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Tv2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { listChannels, createChannel, deleteChannel, syncChannel } from "../lib/api";
import { useApp } from "../context/AppContext";
import type { Channel } from "../types";
import { formatDate, timeAgo } from "../lib/utils";

export function ChannelsPage() {
  const { triggerRefresh } = useApp();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, { total: number; newCount: number }>>({});
  const [editingFor, setEditingFor] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editThumb, setEditThumb] = useState("");
  const [editToken, setEditToken] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual add form
  const [showForm, setShowForm] = useState(false);
  const [ytId, setYtId] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytThumb, setYtThumb] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadChannels() {
    setLoading(true);
    listChannels().then(setChannels).finally(() => setLoading(false));
  }

  useEffect(() => { loadChannels(); }, []);

  async function handleSync(ch: Channel) {
    setSyncing(ch.id);
    try {
      const result = await syncChannel(ch.id);
      setSyncResults((prev) => ({ ...prev, [ch.id]: { total: result.total_found, newCount: result.new_videos } }));
      triggerRefresh();
      await loadChannels();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  function startEdit(ch: Channel) {
    setEditingFor(ch.id);
    setEditTitle(ch.title);
    setEditThumb(ch.thumbnail_url || "");
    setEditToken("");
  }

  function cancelEdit() {
    setEditingFor(null);
    setEditTitle("");
    setEditThumb("");
    setEditToken("");
  }

  async function handleSaveEdit(ch: Channel) {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        youtube_id: ch.youtube_id,
        title: editTitle.trim(),
        thumbnail_url: editThumb.trim() || null,
      };
      if (editToken.trim()) payload.access_token = editToken.trim();
      await createChannel(payload);
      cancelEdit();
      await loadChannels();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update channel");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this channel? (Videos remain)")) return;
    setDeleting(id);
    await deleteChannel(id).catch(console.error);
    setDeleting(null);
    await loadChannels();
    triggerRefresh();
  }

  async function handleAdd() {
    if (!ytId.trim() || !ytTitle.trim()) return;
    setAdding(true);
    try {
      await createChannel({
        youtube_id: ytId.trim(),
        title: ytTitle.trim(),
        thumbnail_url: ytThumb.trim() || null,
        access_token: accessToken.trim() || null,
      });
      setShowForm(false);
      setYtId(""); setYtTitle(""); setYtThumb(""); setAccessToken("");
      await loadChannels();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to add channel");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Owned Channels</p>
          <h2 className="text-2xl font-serif font-bold text-navy">Channel Management</h2>
          <p className="text-sm text-editorial-muted mt-1">
            Connect YouTube channels to auto-sync new uploads into the workflow.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-rust flex items-center gap-2 shrink-0"
        >
          <Plus size={14} /> Add Channel
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-5 mb-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60">
            Add Channel Manually
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-editorial-muted mb-1">YouTube Channel ID *</label>
              <input value={ytId} onChange={(e) => setYtId(e.target.value)} placeholder="UCxxxxxx..." className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-editorial-muted mb-1">Channel Title *</label>
              <input value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} placeholder="My Channel" className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-editorial-muted mb-1">Thumbnail URL</label>
              <input value={ytThumb} onChange={(e) => setYtThumb(e.target.value)} placeholder="https://..." className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-editorial-muted mb-1">Access Token (for sync)</label>
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="ya29.xxx"
                className="input-field font-mono text-xs"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
            </div>
          </div>
          <p className="text-2xs text-editorial-muted/50">
            Access token: OAuth 2.0 bearer token with YouTube scope. Obtain via Google OAuth flow.
          </p>
          <div className="flex gap-3 pt-1">
            <button onClick={handleAdd} disabled={adding || !ytId.trim() || !ytTitle.trim()} className="btn-primary flex items-center gap-2">
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add Channel
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Channels list */}
      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-editorial-muted/50">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : channels.length === 0 ? (
        <div className="card p-10 text-center text-editorial-muted/50">
          <Tv2 size={32} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm mb-1">No channels connected</p>
          <p className="text-2xs">Add a channel above to start auto-syncing uploads.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => {
            const syncResult = syncResults[ch.id];
            return (
              <div key={ch.id} className="card p-4">
              <div className="flex items-center gap-4">
                {ch.thumbnail_url ? (
                  <img src={ch.thumbnail_url} alt={ch.title} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center shrink-0">
                    <Tv2 size={18} className="text-editorial-muted/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy text-sm">{ch.title}</p>
                  <p className="text-2xs text-editorial-muted/60">
                    {ch.video_count} video{ch.video_count !== 1 ? "s" : ""} ·{" "}
                    {ch.last_sync_at ? `Synced ${timeAgo(ch.last_sync_at)}` : "Never synced"}
                  </p>
                  {syncResult && (
                    <p className="text-2xs text-emerald-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={11} />
                      Found {syncResult.total} · {syncResult.newCount} new added
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => (editingFor === ch.id ? cancelEdit() : startEdit(ch))}
                    title="Edit channel"
                    className="text-editorial-muted/40 hover:text-navy p-1.5 rounded transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleSync(ch)}
                    disabled={syncing === ch.id}
                    className="btn-secondary flex items-center gap-1.5 py-1.5"
                  >
                    {syncing === ch.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    Sync
                  </button>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    disabled={deleting === ch.id}
                    className="text-editorial-muted/40 hover:text-rust p-1.5 rounded transition-colors"
                  >
                    {deleting === ch.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>
              {editingFor === ch.id && (
                <div className="mt-3 pt-3 border-t border-editorial-muted/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-editorial-muted mb-1">YouTube Channel ID</label>
                      <input value={ch.youtube_id} disabled className="input-field opacity-60 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs text-editorial-muted mb-1">Channel Title *</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-editorial-muted mb-1">Thumbnail URL</label>
                      <input
                        value={editThumb}
                        onChange={(e) => setEditThumb(e.target.value)}
                        placeholder="https://..."
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-editorial-muted mb-1">
                        Access Token <span className="text-editorial-muted/50">(leave blank to keep)</span>
                      </label>
                      <input
                        type="text"
                        value={editToken}
                        onChange={(e) => setEditToken(e.target.value)}
                        placeholder="ya29.xxx"
                        className="input-field font-mono text-xs"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => handleSaveEdit(ch)}
                      disabled={savingEdit || !editTitle.trim()}
                      className="btn-primary flex items-center gap-1.5"
                    >
                      {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Save Changes
                    </button>
                    <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1.5">
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 card p-4 bg-sky-50 border-sky-200 flex gap-3">
        <AlertCircle size={14} className="text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-700 space-y-1">
          <p className="font-medium">Google OAuth Setup</p>
          <p>
            To enable automated sync, create OAuth 2.0 credentials in{" "}
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">
              Google Cloud Console
            </a>{" "}
            with the <code className="bg-sky-100 px-1 rounded">youtube</code> scope. Set
            GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.
          </p>
        </div>
      </div>
    </div>
  );
}
