import axios from 'axios';
import Cookies from 'js-cookie';

// Axios instance
const api = axios.create({
  baseURL: 'http://localhost:5001',
});

// Attach token automatically to all requests if exists
api.interceptors.request.use((config) => {
  const token = Cookies.get('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----------------- Auth APIs -----------------

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/signup', { username, email, password });
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await api.post('/signin', { email, password });
  Cookies.set('authToken', response.data.token);
  Cookies.set('userId', response.data.user.id.toString());
  return response.data;
};

export const logout = () => {
  Cookies.remove('authToken');
  Cookies.remove('userId');
};

// ----------------- Blog APIs -----------------

export const getCategories = async () => {
  const response = await api.get('/getCategories');
  return response.data;
};

export const getBlogs = async () => {
  const response = await api.get('/getBlogs');
  return response.data;
};

export const getBlog = async (id: string) => {
  const response = await api.get(`/getBlog/${id}`);
  return response.data;
};

export const addBlog = async (title: string, content: string, categoryId: string) => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('Missing userId from cookies');

  const response = await api.post('/addBlog', {
    user_id: Number(userId),
    title,
    content,
    category_id: Number(categoryId),
  });

  return response.data;
};

export const getUserBlogs = async (userId: string) => {
  const response = await api.get(`/getUserBlogs/${userId}`);
  return response.data;
};

// ----------------- Comments APIs -----------------

export const getComments = async (postId: string) => {
  const response = await api.get(`/getComments/${postId}`);
  return response.data;
};

export const addComment = async (userId: string, postId: string, content: string) => {
  const response = await api.post('/addComment', { user_id: userId, post_id: postId, content });
  return response.data;
};

// ----------------- User APIs -----------------

export const getUserProfile = async () => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found in cookies');

  const response = await api.get(`/user/${userId}`);
  return response.data;
};

export const getUserProfileById = async (userId: string) => {
  const response = await api.get(`/user/${userId}`);
  return response.data;
};

export const updateUserProfile = async (
  userId: string,
  username: string,
  email: string,
  currentPassword?: string,
  newPassword?: string
) => {
  const payload: any = { username, email };
  if (currentPassword && newPassword) {
    payload.currentPassword = currentPassword;
    payload.newPassword = newPassword;
  }
  const response = await api.put(`/user/${userId}`, payload);
  return response.data;
};

// ----------------- Social APIs -----------------

export const getFollowers = async (userId: string) => {
  const response = await api.get(`/followers/${userId}`);
  return response.data;
};

export const getFollowing = async (userId: string) => {
  const response = await api.get(`/following/${userId}`);
  return response.data;
};

export const followUser = async (followerId: string, followingId: string) => {
  return await api.post('/follow', { followerId, followingId });
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  return await api.delete('/unfollow', { data: { followerId, followingId } });
};

export const removeFollower = async (followerId: string, followingId: string) => {
  return await api.delete('/unfollow', { data: { followerId, followingId } });
};

// ----------------- Search -----------------

export const searchUsers = async (query: string) => {
  const response = await api.get(`/searchUsers?q=${encodeURIComponent(query)}`);
  return response.data;
};

// ----------------- Bookmark APIs -----------------

export const addBookmark = async (postId: string) => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found');

  const response = await api.post('/bookmark', {
    user_id: Number(userId),
    post_id: Number(postId),
  });

  return response.data;
};

export const removeBookmark = async (postId: string) => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found');

  const response = await api.delete('/bookmark', {
    data: {
      user_id: Number(userId),
      post_id: Number(postId),
    },
  });

  return response.data;
};

export const getBookmarks = async () => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found');

  const response = await api.get(`/bookmarks/${userId}`);
  return response.data;
};


export const getNotifications = async () => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found');

  const response = await api.get(`/notifications/${userId}`);
  return response.data;
};

export const clearNotifications = async () => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found');

  const response = await api.delete(`/notifications/${userId}`);
  return response.data;
};


export const likePost = async (postId: string) => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found');

  try {
    const response = await api.post('/like', {
      user_id: userId,
      post_id: postId,
    });
    return response.data;
  } catch (error) {
    console.error('Error liking the post:', error);
    throw error;
  }
};

export const unlikePost = async (postId: string) => {
  const userId = Cookies.get('userId');
  if (!userId) throw new Error('User ID not found');
  if (!postId) throw new Error('Post ID not provided');

  try {
    const response = await api.delete('/unlike', {
      data: {
        user_id: userId,
        post_id: postId,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error unliking the post:', error);
    throw error;
  }
};



export const getLikes = async (postId: string) => {
  try {
    const response = await api.get(`/getLikes/${postId}`); // <-- correct path
    return response.data;
  } catch (error) {
    console.error('Error fetching likes for the post:', error);
    throw error;
  }
};


// ----------------- Like APIs -----------------

export const getUserLikes = async (userId: string) => {
  const response = await api.get(`/getUserLikes/${userId}`);
  return response.data;
};
