import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import {
  getUserProfileById,
  getUserBlogs,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '../lib/api';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';

interface Blog {
  id: string;
  title: string;
  created_at: string;
  category_name?: string;
}

export default function OtherUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserId = Cookies.get('userId');

  const [user, setUser] = useState<any>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      const userData = await getUserProfileById(id);
      const blogData = await getUserBlogs(id);
      const followerList = await getFollowers(id);
      const followingList = await getFollowing(id);

      setUser(userData);
      setBlogs(blogData);
      setFollowers(followerList);
      setFollowing(followingList);

      const isAlreadyFollowing = followerList.some((f) => String(f.id) === currentUserId);
      setIsFollowing(isAlreadyFollowing);
    };

    fetchData();
  }, [id, currentUserId]);

  const handleFollowToggle = async () => {
    if (!currentUserId || !id) return;

    try {
      if (isFollowing) {
        await unfollowUser(currentUserId, id);
      } else {
        await followUser(currentUserId, id);
      }
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Follow toggle failed:', err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6">
          <p className="text-center text-gray-500">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* Profile Card */}
        <div className="bg-white shadow-xl rounded-xl p-8 flex flex-col sm:flex-row items-center gap-6">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
            alt="avatar"
            className="w-28 h-28 rounded-full ring-4 ring-blue-100 shadow-md"
          />
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex justify-center sm:justify-start gap-6 pt-2">
              <p className="text-sm text-gray-500">
                <strong>{followers.length}</strong> Followers
              </p>
              <p className="text-sm text-gray-500">
                <strong>{following.length}</strong> Following
              </p>
              <p className="text-sm text-gray-500">
                <strong>{blogs.length}</strong> Blogs
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {currentUserId !== id && (
              <Button onClick={handleFollowToggle}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
            <Button variant="ghost" onClick={handleShare}>
              {copied ? 'Link Copied!' : 'Share Profile'}
            </Button>
          </div>
        </div>

        {/* Blogs */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Blogs by {user.username}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/blog/${blog.id}`)}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 truncate">{blog.title}</h3>
                  {blog.category_name && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {blog.category_name}
                      </span>
                    </div>
                  )}
                  <div className="mt-4 text-sm text-gray-500">
                    <p>By {user.username}</p>
                    <p>{format(new Date(blog.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {blogs.length === 0 && (
            <p className="text-center text-gray-400 mt-10">No blogs published yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
