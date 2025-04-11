// pages/BlogDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Navbar } from '../components/Navbar';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { getBlog, getComments, addComment, addBookmark, removeBookmark, getBookmarks,  likePost,unlikePost,getLikes } from '../lib/api';
import type { Blog, Comment } from '../types';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { Bookmark, BookmarkCheck, Share2, Heart, HeartHandshake } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faClipboard } from '@fortawesome/free-solid-svg-icons';

export default function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [likes, setLikes] = useState<number>(0);
  const [liked, setLiked] = useState(false);

  const token = Cookies.get('authToken');


  let clickTimeout: NodeJS.Timeout;

const handleLikeClick = async () => {
  if (!id || !token) return;

  if (clickTimeout) {
    clearTimeout(clickTimeout);
    clickTimeout = null!;
    // Double click -> Unlike
    if (liked) {
      await unlikePost(id);
      setLiked(false);
      setLikes((prev) => Math.max(prev - 1, 0));
    }
  } else {
    clickTimeout = setTimeout(async () => {
      if (!liked) {
        await likePost(id);
        setLiked(true);
        setLikes((prev) => prev + 1);
      }
      clearTimeout(clickTimeout);
    }, 250);
  }
};


  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [blogData, commentsData] = await Promise.all([
          getBlog(id),
          getComments(id),
        ]);

        setBlog(blogData);
        setComments(commentsData);

        if (token) {
          const decoded: { id: string } = jwtDecode(token);
          if (decoded.id.toString() === blogData.user_id?.toString()) {
            setIsOwner(true);
          }

          const bookmarks = await getBookmarks();
          const alreadyBookmarked = bookmarks.some((b: Blog) => b.id.toString() === id);
          setIsBookmarked(alreadyBookmarked);
        }

        setEditTitle(blogData.title);
        setEditContent(blogData.content);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, [id, token]);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!id) return;
      try {
        const data = await getLikes(id); // returns { count: number, users: number[] }
        setLikes(data.count || 0);
  
        if (token) {
          const decoded: { id: string } = jwtDecode(token);
          // 🟥 THIS CHECK IS NOW VALID
          setLiked(data.users?.includes(Number(decoded.id)));
        }
      } catch (err) {
        console.error('Error fetching likes:', err);
      }
    };
    fetchLikes();
  }, [id, token]);
  
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;

    if (!token) {
      alert('Please login to comment');
      return;
    }

    try {
      const decoded: { id: string } = jwtDecode(token);
      const userId = decoded.id;

      setIsLoading(true);
      await addComment(userId, id, newComment);
      const updatedComments = await getComments(id);
      setComments(updatedComments);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:5001/updateBlog/${blog?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });

      if (!res.ok) throw new Error('Update failed');

      setBlog({ ...blog!, title: editTitle, content: editContent });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error updating blog:', err);
      alert('Failed to update blog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!token || !id) return;
    try {
      if (isBookmarked) {
        await removeBookmark(id);
      } else {
        await addBookmark(id);
      }
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
    }
  };

  const handleShareClick = () => {
    setShowShareOptions(!showShareOptions);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareOptions(false);
    alert('Link copied to clipboard');
  };

  if (!blog) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Navbar />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <article className="bg-white shadow sm:rounded-lg overflow-visible">

          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4 relative">
              <h1 className="text-3xl font-bold text-gray-900">{blog.title}</h1>
              <div className="relative flex gap-2 z-50">
                <Button variant="ghost" onClick={handleBookmarkToggle}>
                  {isBookmarked ? <BookmarkCheck className="h-5 w-5 text-blue-500" /> : <Bookmark className="h-5 w-5 text-gray-500" />}
                </Button>
                <Button variant="ghost" onClick={handleShareClick}>
                  <Share2 className="h-5 w-5 text-gray-500" />
                </Button>
                {showShareOptions && (
                  <div className="absolute top-10 right-0 w-56 bg-white border rounded-xl shadow-2xl p-2 space-y-2 z-50">
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <FontAwesomeIcon icon={faClipboard} className="text-gray-600" />
                      Copy Link
                    </button>
                    <a
                      href="https://www.instagram.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <FontAwesomeIcon icon={faInstagram} className="text-pink-600" />
                      Share to Instagram
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <FontAwesomeIcon icon={faLinkedin} className="text-blue-600" />
                      Share to LinkedIn
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <FontAwesomeIcon icon={faFacebook} className="text-blue-700" />
                      Share to Facebook
                    </a>
                  </div>
                )}
                {isOwner && <Button onClick={() => setIsModalOpen(true)}>Edit</Button>}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-8">
              <span>By {blog.username}</span>
              <span>•</span>
              <span>{format(new Date(blog.created_at), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {blog.category_name}
              </span>
            </div>

            <div className="prose max-w-none whitespace-pre-line">{blog.content}</div>
            {/* Like Button Section */}
            <div className="mt-6 flex items-center space-x-3">
  <Button variant="ghost" onClick={handleLikeClick}>
    {liked ? (
      <Heart className="h-6 w-6 text-red-600 fill-current transition-transform duration-150 ease-in-out hover:scale-110" />
    ) : (
      <Heart className="h-6 w-6 text-gray-500 transition-transform duration-150 ease-in-out hover:scale-110" />
    )}
    <span className="ml-2 text-sm text-gray-600">{likes}</span>
  </Button>
</div>


          </div>
        </article>

        <section className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Comments</h2>

          <form onSubmit={handleAddComment} className="mb-8">
            <TextInput
              label="Add a comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
            />
            <Button type="submit" className="mt-2" isLoading={isLoading}>
              Post Comment
            </Button>
          </form>

          <div className="space-y-6">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white shadow sm:rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                      <span className="font-medium">{comment.username}</span>
                      <span>•</span>
                      <span>{format(new Date(comment.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-gray-900">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Edit Blog Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Blog">
        <form onSubmit={handleUpdateBlog} className="space-y-4">
          <TextInput
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <TextInput
            label="Content"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            required
          />
          <Button type="submit" isLoading={isLoading}>
            Update Blog
          </Button>
        </form>
      </Modal>
    </div>
  );
}
