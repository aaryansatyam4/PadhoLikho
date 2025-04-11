// pages/Profile.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TextInput } from '../components/ui/TextInput';
import {
  getUserProfile,
  updateUserProfile,
  getUserBlogs,
  getFollowers,
  getFollowing,
  removeFollower,
  unfollowUser,
  getBookmarks,
} from '../lib/api';
import { format } from 'date-fns';
import type { User } from '../types';

interface Blog {
  id: string;
  title: string;
  created_at: string;
  category_name?: string;
}

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [userBlogs, setUserBlogs] = useState<Blog[]>([]);
  const [bookmarkedBlogs, setBookmarkedBlogs] = useState<Blog[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setUser(data);
        setFormData({
          username: data.username,
          email: data.email,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        const blogs = await getUserBlogs(data.id);
        const followersList = await getFollowers(data.id);
        const followingList = await getFollowing(data.id);
        const bookmarks = await getBookmarks();

        setUserBlogs(blogs);
        setFollowers(followersList);
        setFollowing(followingList);
        setBookmarkedBlogs(bookmarks);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const { username, email, currentPassword, newPassword, confirmPassword } = formData;

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }

    const updateData: any = { username, email };
    if (newPassword) {
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    try {
      await updateUserProfile(
        user!.id.toString(),
        updateData.username,
        updateData.email,
        updateData.currentPassword,
        updateData.newPassword
      );
      setSuccess('Profile updated successfully');
      setIsModalOpen(false);
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFollowerHandler = async (followerId: string) => {
    await removeFollower(followerId, user!.id.toString());
    setFollowers(f => f.filter(fol => fol.id !== followerId));
  };

  const unfollowHandler = async (followingId: string) => {
    await unfollowUser(user!.id.toString(), followingId);
    setFollowing(f => f.filter(fol => fol.id !== followingId));
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
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
            <div className="flex flex-wrap justify-center sm:justify-start gap-6 pt-2 text-sm text-gray-500">
              <button onClick={() => setShowFollowersModal(true)}>
                <strong>{followers.length}</strong> Followers
              </button>
              <button onClick={() => setShowFollowingModal(true)}>
                <strong>{following.length}</strong> Following
              </button>
              <span>
                <strong>{userBlogs.length}</strong> Blogs
              </span>
              <span>
                <strong>{bookmarkedBlogs.length}</strong> Bookmarks
              </span>
            </div>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>Edit Profile</Button>
        </div>

        {/* Followers Modal */}
        <Modal isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Your Followers">
          <ul className="space-y-2">
            {followers.map(f => (
              <li key={f.id} className="flex justify-between items-center border p-2 rounded">
                <span>{f.username}</span>
                <Button variant="ghost" onClick={() => removeFollowerHandler(f.id)}>
                  Remove
                </Button>
              </li>
            ))}
            {followers.length === 0 && <p className="text-sm text-gray-500">No followers yet.</p>}
          </ul>
        </Modal>

        {/* Following Modal */}
        <Modal isOpen={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="You're Following">
          <ul className="space-y-2">
            {following.map(f => (
              <li key={f.id} className="flex justify-between items-center border p-2 rounded">
                <span>{f.username}</span>
                <Button variant="ghost" onClick={() => unfollowHandler(f.id)}>
                  Unfollow
                </Button>
              </li>
            ))}
            {following.length === 0 && <p className="text-sm text-gray-500">You're not following anyone yet.</p>}
          </ul>
        </Modal>

        {/* Blogs Section */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Blogs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {userBlogs.map(blog => (
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
        </section>

        {/* Bookmarked Section */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Bookmarked Blogs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedBlogs.map(blog => (
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
                    <p>By Guest Author</p>
                    <p>{format(new Date(blog.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Update Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Profile">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">{success}</div>}

          <TextInput label="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
          <TextInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <TextInput label="Current Password" type="password" value={formData.currentPassword} onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })} />
          <TextInput label="New Password" type="password" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} />
          <TextInput label="Confirm New Password" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />

          <div className="flex justify-end">
            <Button type="submit" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
