import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/ui/Modal';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { getBlogs, getCategories, addBlog } from '../lib/api';
import type { Blog, Category } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    categoryId: '',
  });

  // ✅ Extract GitHub token from URL (if any) and set cookies
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    const id = query.get('id');
    const name = query.get('name');

    if (token && id) {
      Cookies.set('authToken', token);
      Cookies.set('userId', id);
      Cookies.set('username', name || '');
      navigate('/dashboard', { replace: true }); // clean URL
    }
  }, [location.search, navigate]);

  // 🔐 Block if not logged in
  useEffect(() => {
    const token = Cookies.get('authToken');
    const userId = Cookies.get('userId');

    if (!token || !userId) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [blogsData, categoriesData] = await Promise.all([
          getBlogs(),
          getCategories(),
        ]);
        setBlogs(blogsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    const { title, content, categoryId } = newPost;
    const userId = Cookies.get('userId');

    if (!title || !content || !categoryId || !userId) {
      alert('Please fill all the fields');
      return;
    }

    try {
      setIsLoading(true);
      await addBlog(title, content, categoryId, userId);
      alert('Post created successfully');

      setNewPost({ title: '', content: '', categoryId: '' });
      setIsModalOpen(false);

      const blogsData = await getBlogs();
      setBlogs(blogsData);
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Something went wrong while creating the post');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = blog.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory
      ? String(blog.category_id) === filterCategory
      : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onNewPost={() => setIsModalOpen(true)} />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 🔍 Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6 px-4">
          <TextInput
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-1/2"
          />
          <select
            className="w-full md:w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 📄 Blog Cards */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/blog/${blog.id}`)}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {blog.title}
                  </h3>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {blog.category_name}
                    </span>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    <p>By {blog.username}</p>
                    <p>{format(new Date(blog.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBlogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No blog posts found for this filter.</p>
            </div>
          )}
        </div>
      </main>

      {/* ➕ Modal for Creating Post */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Post"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <TextInput
            label="Title"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={newPost.categoryId}
              onChange={(e) => setNewPost({ ...newPost, categoryId: e.target.value })}
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={4}
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create Post
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
