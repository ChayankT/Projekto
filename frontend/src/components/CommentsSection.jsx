import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { getComments, createComment, deleteComment } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

/**
 * CommentsSection — a lightweight comment thread for a single story or task.
 *
 * There's no activity log elsewhere in the app, so this is also the only
 * place context on *why* something moved or changed gets recorded once more
 * than one person touches an item. Deliberately simple: no editing, no
 * nested replies, no rich text — just a chronological thread anyone can add
 * to (or remove their own noise from) via the "viewing as" user.
 *
 * @param {'story'|'task'} entityType
 * @param {string} entityId
 */
const CommentsSection = ({ entityType, entityId }) => {
    const { users, activeUserId } = useApp();
    const { addToast } = useToast();

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getComments(entityType, entityId)
            .then(res => { if (!cancelled) setComments(res.data); })
            .catch(() => { if (!cancelled) addToast('Failed to load comments', 'error'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityType, entityId]);

    const activeUser = users.find(u => u._id === activeUserId);

    const handlePost = async (e) => {
        e?.preventDefault();
        const body = draft.trim();
        if (!body || !activeUserId) return;
        setPosting(true);
        try {
            const res = await createComment({ entityType, entityId, author: activeUserId, body });
            setComments(prev => [...prev, res.data]);
            setDraft('');
        } catch {
            addToast('Failed to post comment', 'error');
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this comment?')) return;
        try {
            await deleteComment(id);
            setComments(prev => prev.filter(c => c._id !== id));
        } catch {
            addToast('Failed to delete comment', 'error');
        }
    };

    return (
        <div className="comments-section">
            <div className="comments-heading">
                <MessageSquare size={14} />
                <span>Comments{comments.length > 0 ? ` (${comments.length})` : ''}</span>
            </div>

            {loading ? (
                <p className="comments-empty">Loading…</p>
            ) : comments.length === 0 ? (
                <p className="comments-empty">No comments yet — leave context for the next person who touches this.</p>
            ) : (
                <div className="comments-list">
                    {comments.map(c => (
                        <div key={c._id} className="comment-item">
                            <div className="avatar-sm" title={c.author?.name || 'Unknown'}>
                                {(c.author?.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="comment-body">
                                <div className="comment-meta">
                                    <span className="comment-author">{c.author?.name || 'Unknown'}</span>
                                    <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <p>{c.body}</p>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm comment-delete"
                                title="Delete comment"
                                onClick={() => handleDelete(c._id)}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form className="comment-composer" onSubmit={handlePost}>
                <div className="avatar-sm" title={activeUser?.name || 'Unassigned'}>
                    {(activeUser?.name || '?').charAt(0).toUpperCase()}
                </div>
                <textarea
                    rows={2}
                    placeholder={activeUserId ? 'Add a comment…' : 'Select a user to comment'}
                    value={draft}
                    disabled={!activeUserId || posting}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost(e);
                    }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" disabled={!draft.trim() || !activeUserId || posting}>
                    Post
                </button>
            </form>
        </div>
    );
};

export default CommentsSection;
